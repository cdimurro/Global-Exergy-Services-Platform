import { useState, useEffect } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ENERGY_COLORS, getSourceName } from '../utils/colors';
import { downloadChartAsPNG, downloadDataAsCSV, ChartExportButtons, ChartSources } from '../utils/chartExport';

const ENERGY_SOURCES = ['coal', 'oil', 'gas', 'nuclear', 'hydro', 'wind', 'solar', 'biomass', 'geothermal', 'other'];

export default function InteractiveChart() {
  const [energyData, setEnergyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('absolute'); // 'absolute' or 'change'
  const [selectedSources, setSelectedSources] = useState(['fossil', 'clean']);
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' or 'individual'
  const [showRelative, setShowRelative] = useState(false); // toggle for percentage view

  useEffect(() => {
    fetch('/data/useful_energy_timeseries.json')
      .then(res => res.json())
      .then(data => {
        setEnergyData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading energy data:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !energyData) return null;

  // Prepare data for absolute values chart
  const absoluteData = energyData.data.map(yearData => {
    const baseData = {
      year: yearData.year,
      total: yearData.total_useful_ej
    };

    // Calculate values based on showRelative toggle
    if (showRelative) {
      baseData.fossil = (yearData.fossil_useful_ej / yearData.total_useful_ej) * 100;
      baseData.clean = (yearData.clean_useful_ej / yearData.total_useful_ej) * 100;
      ENERGY_SOURCES.forEach(source => {
        baseData[source] = ((yearData.sources_useful_ej[source] || 0) / yearData.total_useful_ej) * 100;
      });
    } else {
      baseData.fossil = yearData.fossil_useful_ej;
      baseData.clean = yearData.clean_useful_ej;
      ENERGY_SOURCES.forEach(source => {
        baseData[source] = yearData.sources_useful_ej[source] || 0;
      });
    }

    return baseData;
  });

  // Prepare data for change chart
  const changeData = [];
  for (let i = 1; i < energyData.data.length; i++) {
    const prev = energyData.data[i - 1];
    const curr = energyData.data[i];

    const yearChange = {
      year: curr.year,
      fossil: curr.fossil_useful_ej - prev.fossil_useful_ej,
      clean: curr.clean_useful_ej - prev.clean_useful_ej,
      fossil_pct: prev.fossil_useful_ej > 0 ? ((curr.fossil_useful_ej - prev.fossil_useful_ej) / prev.fossil_useful_ej) * 100 : 0,
      clean_pct: prev.clean_useful_ej > 0 ? ((curr.clean_useful_ej - prev.clean_useful_ej) / prev.clean_useful_ej) * 100 : 0,
    };

    ENERGY_SOURCES.forEach(source => {
      const prevValue = prev.sources_useful_ej[source] || 0;
      const currValue = curr.sources_useful_ej[source] || 0;
      yearChange[source] = currValue - prevValue;
      yearChange[`${source}_pct`] = prevValue > 0 ? ((currValue - prevValue) / prevValue) * 100 : 0;
    });

    changeData.push(yearChange);
  }

  const chartData = chartType === 'absolute' ? absoluteData : changeData;

  // Toggle source selection
  const toggleSource = (sourceKey) => {
    // If clicking an individual energy source (not fossil/clean), switch to individual mode
    if (sourceKey !== 'fossil' && sourceKey !== 'clean') {
      setViewMode('individual');
    }

    setSelectedSources(prev =>
      prev.includes(sourceKey)
        ? prev.filter(s => s !== sourceKey)
        : [...prev, sourceKey]
    );
  };

  // Select all fossil or clean sources
  const selectAllFossil = () => {
    setViewMode('individual');
    setSelectedSources(['coal', 'oil', 'gas']);
  };

  const selectAllClean = () => {
    setViewMode('individual');
    setSelectedSources(['nuclear', 'hydro', 'wind', 'solar', 'biomass', 'geothermal']);
  };

  const selectAllSources = () => {
    setViewMode('individual');
    setSelectedSources(ENERGY_SOURCES);
  };

  const selectGrouped = () => {
    setViewMode('grouped');
    setSelectedSources(['fossil', 'clean']);
  };

  // Tooltips
  const AbsoluteTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    const total = payload.reduce((sum, entry) => sum + entry.value, 0);

    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <div className="font-bold text-2xl mb-3">{label}</div>
        {!showRelative && <div className="text-lg font-semibold mb-3">Total: {total.toFixed(1)} EJ</div>}
        {showRelative && <div className="text-lg font-semibold mb-3">Total: 100%</div>}
        <div className="space-y-2">
          {payload
            .filter(entry => entry.value > 0)
            .sort((a, b) => b.value - a.value)
            .map((entry, index) => {
              if (showRelative) {
                return (
                  <div key={index} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-base">{entry.name}</span>
                    </div>
                    <span className="text-base font-medium">{entry.value.toFixed(1)}%</span>
                  </div>
                );
              } else {
                const percentage = ((entry.value / total) * 100).toFixed(1);
                return (
                  <div key={index} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-base">{entry.name}</span>
                    </div>
                    <span className="text-base font-medium">{entry.value.toFixed(1)} EJ ({percentage}%)</span>
                  </div>
                );
              }
            })}
        </div>
      </div>
    );
  };

  const ChangeTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const currentYear = changeData.find(d => d.year === label);
    if (!currentYear) return null;

    // Calculate total absolute change across all sources shown
    const totalAbsoluteChange = payload.reduce((sum, entry) => sum + Math.abs(entry.value), 0);

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <div className="font-bold text-xl mb-3">{label}</div>
        <div className="space-y-2">
          {payload.map((entry, index) => {
            const sourceKey = entry.dataKey;
            const pctKey = `${sourceKey}_pct`;
            const pctValue = currentYear[pctKey];

            // Calculate share based on absolute value
            const sharePercent = totalAbsoluteChange > 0
              ? (Math.abs(entry.value) / totalAbsoluteChange * 100)
              : 0;

            return (
              <div key={index} className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm font-medium">{entry.name}</span>
                  </div>
                  <div className="text-sm ml-5">
                    <span className="text-gray-600">Share: </span>
                    <span className="font-semibold text-gray-900">{sharePercent.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">
                    <span className="text-gray-600">Absolute Change: </span>
                    <span className="font-semibold text-gray-900">{entry.value > 0 ? '+' : ''}{entry.value.toFixed(2)} EJ</span>
                  </div>
                  {pctValue !== undefined && (
                    <div className="text-sm">
                      <span className="text-gray-600">Relative Change: </span>
                      <span className="font-semibold text-gray-900">{pctValue > 0 ? '+' : ''}{pctValue.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderChart = () => {
    if (chartType === 'absolute') {
      return (
        <AreaChart data={chartData} margin={{ top: 10, right: 40, left: 20, bottom: 20 }}>
          <defs>
            {(viewMode === 'individual' ? ENERGY_SOURCES : ['fossil', 'clean']).map(source => (
              <linearGradient key={source} id={`color-${source}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ENERGY_COLORS[source] || (source === 'fossil' ? '#DC2626' : '#16A34A')} stopOpacity={0.8} />
                <stop offset="95%" stopColor={ENERGY_COLORS[source] || (source === 'fossil' ? '#DC2626' : '#16A34A')} stopOpacity={0.3} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 15 }} interval="preserveStartEnd" height={60} />
          <YAxis
            tick={{ fontSize: 15 }}
            width={80}
            domain={showRelative ? [0, 100] : [0, 'auto']}
            ticks={showRelative ? [0, 25, 50, 75, 100] : undefined}
            label={{
              value: showRelative ? 'Share of Total Energy (%)' : 'Useful Energy (EJ)',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 17, fontWeight: 600 }
            }}
          />
          <Tooltip content={<AbsoluteTooltip />} />
          {viewMode === 'grouped' ? (
            <>
              {selectedSources.includes('fossil') && <Area type="monotone" dataKey="fossil" stackId="1" stroke="#DC2626" fill="url(#color-fossil)" fillOpacity={1} name="Fossil Fuels" />}
              {selectedSources.includes('clean') && <Area type="monotone" dataKey="clean" stackId="1" stroke="#16A34A" fill="url(#color-clean)" fillOpacity={1} name="Clean Energy" />}
            </>
          ) : (
            ENERGY_SOURCES.map(source =>
              selectedSources.includes(source) && (
                <Area key={source} type="monotone" dataKey={source} stackId="1" stroke={ENERGY_COLORS[source]} fill={`url(#color-${source})`} fillOpacity={1} name={getSourceName(source)} />
              )
            )
          )}
        </AreaChart>
      );
    } else {
      const allValues = chartData.flatMap(d => selectedSources.map(source => d[source] || 0));
      const maxAbs = Math.max(Math.abs(Math.min(...allValues)), Math.abs(Math.max(...allValues)));
      const yAxisMax = Math.ceil(maxAbs * 1.1);
      const yAxisMin = -yAxisMax;

      return (
        <LineChart data={chartData} margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 15 }} interval="preserveStartEnd" height={60} />
          <YAxis tick={{ fontSize: 15 }} width={80} domain={[yAxisMin, yAxisMax]} label={{ value: 'Change in Energy Services (EJ)', angle: -90, position: 'insideLeft', style: { fontSize: 17, fontWeight: 600 } }} />
          <Tooltip content={<ChangeTooltip />} />
          <ReferenceLine y={0} stroke="#000" strokeWidth={2} />
          {viewMode === 'grouped' ? (
            <>
              {selectedSources.includes('fossil') && <Line type="monotone" dataKey="fossil" stroke="#DC2626" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} name="Fossil Fuels" />}
              {selectedSources.includes('clean') && <Line type="monotone" dataKey="clean" stroke="#16A34A" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} name="Clean Energy" />}
            </>
          ) : (
            ENERGY_SOURCES.map(source =>
              selectedSources.includes(source) && (
                <Line key={source} type="monotone" dataKey={source} stroke={ENERGY_COLORS[source]} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} name={getSourceName(source)} />
              )
            )
          )}
        </LineChart>
      );
    }
  };

  // Export handlers
  const handleDownloadPNG = () => {
    const chartTypeStr = chartType === 'absolute' ? 'total-energy' : 'annual-change';
    const viewType = viewMode === 'grouped' ? 'fossil-vs-clean' : 'by-source';
    const filename = `interactive-energy-services-${chartTypeStr}-${viewType}-${new Date().toISOString().split('T')[0]}`;
    downloadChartAsPNG('#interactive-chart-container', filename);
  };

  const handleDownloadCSV = () => {
    const chartTypeStr = chartType === 'absolute' ? 'total-energy' : 'annual-change';
    const viewType = viewMode === 'grouped' ? 'fossil-vs-clean' : 'by-source';
    const filename = `interactive-energy-services-${chartTypeStr}-${viewType}-${new Date().toISOString().split('T')[0]}`;

    // Prepare CSV data based on current chart type and view mode
    const csvData = chartData.map(row => {
      const csvRow = { year: row.year };

      if (viewMode === 'grouped') {
        if (chartType === 'absolute') {
          csvRow['Fossil Fuels (EJ)'] = row.fossil?.toFixed(2) || '';
          csvRow['Clean Energy (EJ)'] = row.clean?.toFixed(2) || '';
          csvRow['Total (EJ)'] = row.total?.toFixed(2) || '';
        } else {
          csvRow['Fossil Fuels Change (EJ)'] = row.fossil?.toFixed(2) || '';
          csvRow['Clean Energy Change (EJ)'] = row.clean?.toFixed(2) || '';
          csvRow['Fossil Fuels Change (%)'] = row.fossil_pct?.toFixed(1) || '';
          csvRow['Clean Energy Change (%)'] = row.clean_pct?.toFixed(1) || '';
        }
      } else {
        // Individual sources
        selectedSources.forEach(source => {
          const sourceName = getSourceName(source);
          if (chartType === 'absolute') {
            csvRow[`${sourceName} (EJ)`] = row[source]?.toFixed(2) || '';
          } else {
            csvRow[`${sourceName} Change (EJ)`] = row[source]?.toFixed(2) || '';
            csvRow[`${sourceName} Change (%)`] = row[`${source}_pct`]?.toFixed(1) || '';
          }
        });
      }

      return csvRow;
    });

    downloadDataAsCSV(csvData, filename);
  };

  const sources = ['Energy Institute Statistical Review 2024', 'RMI Inefficiency Trap 2023'];

  return (
    <div className="metric-card bg-white">
      {/* Header with Download Buttons */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">
          Interactive Energy Services Explorer
        </h2>
        <ChartExportButtons
          onDownloadPNG={handleDownloadPNG}
          onDownloadCSV={handleDownloadCSV}
        />
      </div>

      {/* Controls */}
      <div className="mb-8 bg-gray-50 p-6 rounded-lg">
        {/* Header with Show Relative toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-lg font-semibold text-gray-700">Chart Controls</div>
          <div className="flex items-center gap-4">
            <label className="text-lg font-semibold text-gray-700">Show Relative Values</label>
            <button
              onClick={() => setShowRelative(!showRelative)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                showRelative ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  showRelative ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Chart Type Selection */}
        <div className="mb-6">
            <label className="block text-lg font-semibold mb-3 text-gray-700">Chart Type</label>
            <div className="flex gap-3">
              <button
                onClick={() => setChartType('absolute')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  chartType === 'absolute'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Total Energy Services
              </button>
              <button
                onClick={() => setChartType('change')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  chartType === 'change'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Annual Change
              </button>
            </div>
          </div>

          {/* View Mode */}
          <div className="mb-6">
            <label className="block text-lg font-semibold mb-3 text-gray-700">View Mode</label>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={selectGrouped}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  viewMode === 'grouped'
                    ? 'bg-purple-600 text-white ring-2 ring-purple-600 ring-offset-2'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Fossil vs Clean
              </button>
              <button
                onClick={selectAllFossil}
                className="px-6 py-3 rounded-lg font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              >
                All Fossil Sources
              </button>
              <button
                onClick={selectAllClean}
                className="px-6 py-3 rounded-lg font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              >
                All Clean Sources
              </button>
              <button
                onClick={selectAllSources}
                className="px-6 py-3 rounded-lg font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              >
                All Sources
              </button>
            </div>
          </div>

          {/* Individual Source Selection */}
          <div>
            <label className="block text-lg font-semibold mb-3 text-gray-700">Select Energy Sources</label>
            <div className="flex flex-wrap gap-2">
              {ENERGY_SOURCES.map(source => (
                <button
                  key={source}
                  onClick={() => toggleSource(source)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                    selectedSources.includes(source)
                      ? 'text-white ring-2 ring-offset-2'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  style={{
                    backgroundColor: selectedSources.includes(source) ? ENERGY_COLORS[source] : undefined,
                    ringColor: ENERGY_COLORS[source]
                  }}
                >
                  {getSourceName(source)}
                </button>
              ))}
            </div>
          </div>
      </div>

      {/* Chart Display */}
      <div id="interactive-chart-container">
        <ResponsiveContainer width="100%" height={700}>
          {renderChart()}
        </ResponsiveContainer>

        {/* Data Sources */}
        <ChartSources sources={sources} />
      </div>

      {/* Selected Sources Legend */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex flex-wrap items-center justify-center gap-6">
          {viewMode === 'grouped' ? (
            <>
              {selectedSources.includes('fossil') && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#DC2626' }} />
                  <span className="text-base font-medium text-gray-700">Fossil Fuels</span>
                </div>
              )}
              {selectedSources.includes('clean') && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#16A34A' }} />
                  <span className="text-base font-medium text-gray-700">Clean Energy</span>
                </div>
              )}
            </>
          ) : (
            ENERGY_SOURCES.map(source =>
              selectedSources.includes(source) && (
                <div key={source} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: ENERGY_COLORS[source] }} />
                  <span className="text-base font-medium text-gray-700">{getSourceName(source)}</span>
                </div>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}

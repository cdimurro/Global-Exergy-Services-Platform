import { useState, useEffect } from 'react';
import { useWindowSize } from '@react-hook/window-size';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ENERGY_COLORS, getSourceName } from '../utils/colors';
import { downloadChartAsPNG, downloadDataAsCSV, ChartExportButtons, ChartSources } from '../utils/chartExport';
import ChartFullscreenModal from './ChartFullscreenModal';
import FullscreenButton from './FullscreenButton';

const ENERGY_SOURCES = ['coal', 'oil', 'gas', 'nuclear', 'hydro', 'wind', 'solar', 'biomass', 'geothermal', 'other'];

export default function InteractiveChart() {
  const [width] = useWindowSize();  // Dynamic window size for responsive charts
  const [energyData, setEnergyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('absolute'); // 'absolute' or 'change'
  const [selectedSources, setSelectedSources] = useState(['fossil', 'clean']);
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' or 'individual'
  const [showRelative, setShowRelative] = useState(false); // toggle for percentage view
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetch('/data/energy_services_timeseries.json')
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
      total: yearData.total_services_ej
    };

    // Calculate values based on showRelative toggle
    if (showRelative) {
      // In relative mode, calculate percentages based on total global energy
      const totalEnergy = yearData.total_services_ej;

      baseData.fossil = totalEnergy > 0 ? (yearData.fossil_services_ej / totalEnergy) * 100 : 0;
      baseData.clean = totalEnergy > 0 ? (yearData.clean_services_ej / totalEnergy) * 100 : 0;

      ENERGY_SOURCES.forEach(source => {
        baseData[source] = totalEnergy > 0 ? ((yearData.sources_services_ej[source] || 0) / totalEnergy) * 100 : 0;
      });
    } else {
      baseData.fossil = yearData.fossil_services_ej;
      baseData.clean = yearData.clean_services_ej;
      ENERGY_SOURCES.forEach(source => {
        baseData[source] = yearData.sources_services_ej[source] || 0;
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
      fossil: curr.fossil_services_ej - prev.fossil_services_ej,
      clean: curr.clean_services_ej - prev.clean_services_ej,
      fossil_pct: prev.fossil_services_ej > 0 ? ((curr.fossil_services_ej - prev.fossil_services_ej) / prev.fossil_services_ej) * 100 : 0,
      clean_pct: prev.clean_services_ej > 0 ? ((curr.clean_services_ej - prev.clean_services_ej) / prev.clean_services_ej) * 100 : 0,
    };

    ENERGY_SOURCES.forEach(source => {
      const prevValue = prev.sources_services_ej[source] || 0;
      const currValue = curr.sources_services_ej[source] || 0;
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
      if (viewMode !== 'individual') {
        // Switching from category to individual - replace selection
        setViewMode('individual');
        setSelectedSources([sourceKey]);
      } else {
        // Already in individual mode - toggle sources
        setSelectedSources(prev => {
          if (prev.includes(sourceKey)) {
            const newSources = prev.filter(s => s !== sourceKey);
            return newSources.length > 0 ? newSources : [sourceKey];
          } else {
            return [...prev, sourceKey];
          }
        });
      }
    } else {
      // For grouped fossil/clean mode
      setSelectedSources(prev =>
        prev.includes(sourceKey)
          ? prev.filter(s => s !== sourceKey)
          : [...prev, sourceKey]
      );
    }
  };

  // Select all fossil or clean sources
  const selectAllFossil = () => {
    setViewMode('allFossil');
    setSelectedSources(['coal', 'oil', 'gas']);
  };

  const selectAllClean = () => {
    setViewMode('allClean');
    setSelectedSources(['nuclear', 'hydro', 'wind', 'solar', 'biomass', 'geothermal', 'other']);
  };

  const selectAllSources = () => {
    setViewMode('allSources');
    setSelectedSources(ENERGY_SOURCES);
  };

  const selectGrouped = () => {
    setViewMode('grouped');
    setSelectedSources(['fossil', 'clean']);
  };

  // Tooltips
  const AbsoluteTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;

    // Get the actual total for this year from the original data
    const yearData = energyData.data.find(d => d.year === label);
    const actualTotal = yearData ? yearData.total_services_ej : 0;

    // Calculate the total of displayed sources
    const displayedTotal = payload.reduce((sum, entry) => sum + entry.value, 0);
    const displayedPercentage = actualTotal > 0 ? ((displayedTotal / actualTotal) * 100).toFixed(1) : '0.0';

    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <div className="font-bold text-2xl mb-3">{label}</div>
        {!showRelative && <div className="text-lg font-semibold mb-3">Total: {displayedTotal.toFixed(1)} EJ ({displayedPercentage}%)</div>}
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
                // Calculate percentage based on actual total energy services for this year
                const percentage = actualTotal > 0 ? ((entry.value / actualTotal) * 100).toFixed(1) : '0.0';
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

    // Get the actual total energy services for this year from absoluteData
    const yearAbsoluteData = absoluteData.find(d => d.year === label);
    const totalEnergyServices = yearAbsoluteData ? yearAbsoluteData.total : 0;

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <div className="font-bold text-xl mb-3">{label}</div>
        <div className="space-y-2">
          {payload.map((entry, index) => {
            const sourceKey = entry.dataKey;
            const pctKey = `${sourceKey}_pct`;
            const pctValue = currentYear[pctKey];

            // Calculate share of total energy services (not share of changes)
            const currentSourceValue = yearAbsoluteData ? (yearAbsoluteData[sourceKey] || 0) : 0;
            const sharePercent = totalEnergyServices > 0
              ? (currentSourceValue / totalEnergyServices * 100)
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
            {/* Always define gradients for all sources */}
            {ENERGY_SOURCES.map(source => (
              <linearGradient key={source} id={`color-${source}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ENERGY_COLORS[source]} stopOpacity={0.8} />
                <stop offset="95%" stopColor={ENERGY_COLORS[source]} stopOpacity={0.3} />
              </linearGradient>
            ))}
            {/* Define gradients for fossil and clean */}
            <linearGradient key="fossil" id="color-fossil" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#DC2626" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#DC2626" stopOpacity={0.3} />
            </linearGradient>
            <linearGradient key="clean" id="color-clean" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16A34A" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#16A34A" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 15 }} interval="preserveStartEnd" height={60} />
          <YAxis
            tick={{ fontSize: 15 }}
            width={80}
            domain={showRelative ? [0, 100] : [0, 'auto']}
            ticks={showRelative ? [0, 25, 50, 75, 100] : undefined}
            label={{
              value: showRelative ? 'Share of Total Energy (%)' : 'Global Energy Services (EJ)',
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
        <LineChart data={chartData} margin={{ top: 20, right: 40, left: 60, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fontSize: 15 }} interval="preserveStartEnd" height={60} />
          <YAxis tick={{ fontSize: 15 }} width={80} domain={[yAxisMin, yAxisMax]} label={{ value: 'Change in Global Energy Services (EJ)', angle: -90, position: 'insideLeft', style: { fontSize: 17, fontWeight: 600 } }} />
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

  // Responsive chart heights: maximized for fullscreen with room for controls
  // In fullscreen, account for controls, title, and legend
  const getChartHeight = () => {
    if (isFullscreen) {
      return width < 640 ? 450 : width < 1024 ? 650 : 800;
    }
    return width < 640 ? 300 : width < 768 ? 450 : 600;
  };

  // Render chart content (used in both normal and fullscreen modes)
  const renderChartContent = () => (
    <>
      {/* Controls */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        {/* Chart Type Selection and Show Relative toggle on same row */}
        <div className="flex items-start justify-between mb-4">
          <div>
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

          {/* Show Relative toggle */}
          <div className="flex items-center gap-4 mt-8">
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

        {/* Source Selection */}
        <div>
          <label className="block text-lg font-semibold mb-3 text-gray-700">Select Energy Sources</label>

          {/* Category buttons - styled like individual source buttons */}
          <div className="flex flex-wrap gap-2 mb-2">
              <button
                onClick={selectAllSources}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  viewMode === 'allSources'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Sources
              </button>
              <button
                onClick={selectGrouped}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  viewMode === 'grouped'
                    ? 'bg-purple-600 text-white ring-2 ring-purple-600 ring-offset-2'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Fossil vs Clean
              </button>
              <button
                onClick={selectAllFossil}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  viewMode === 'allFossil'
                    ? 'bg-red-600 text-white ring-2 ring-red-600 ring-offset-2'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Fossil Sources
              </button>
              <button
                onClick={selectAllClean}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  viewMode === 'allClean'
                    ? 'bg-green-600 text-white ring-2 ring-green-600 ring-offset-2'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Clean Sources
              </button>
          </div>

          {/* Individual source buttons */}
          <div className="flex flex-wrap gap-2">
              {ENERGY_SOURCES.map(source => (
                <button
                  key={source}
                  onClick={() => toggleSource(source)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                    selectedSources.includes(source) && viewMode === 'individual'
                      ? 'text-white ring-2 ring-offset-2'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  style={{
                    backgroundColor: (selectedSources.includes(source) && viewMode === 'individual') ? ENERGY_COLORS[source] : undefined,
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
      <div id="interactive-chart-container" className="w-full pb-8">
        <ResponsiveContainer width="100%" height={getChartHeight()}>
          {renderChart()}
        </ResponsiveContainer>

        {/* Data Sources */}
        <ChartSources sources={sources} className="mt-2" />
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
    </>
  );

  return (
    <>
      {/* Normal View */}
      <div className="metric-card bg-white">
        {/* Header with Download Buttons */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">
            Interactive Energy Services Explorer
          </h2>
          <div className="flex gap-2">
            <ChartExportButtons
              onDownloadPNG={handleDownloadPNG}
              onDownloadCSV={handleDownloadCSV}
            />
            <FullscreenButton onClick={() => setIsFullscreen(true)} />
          </div>
        </div>

        {renderChartContent()}
      </div>

      {/* Fullscreen View */}
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Interactive Energy Services Explorer"
        description="Explore historical energy trends by source and view type"
        exportButtons={
          <ChartExportButtons
            onDownloadPNG={handleDownloadPNG}
            onDownloadCSV={handleDownloadCSV}
          />
        }
      >
        {renderChartContent()}
      </ChartFullscreenModal>
    </>
  );
}

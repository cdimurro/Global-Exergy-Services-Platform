import { useState, useEffect, useMemo } from 'react';
import { useWindowSize } from '@react-hook/window-size';
import PageLayout from '../components/PageLayout';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ENERGY_COLORS, getSourceName } from '../utils/colors';
import { downloadChartAsPNG, downloadDataAsCSV, ChartExportButtons, ChartSources } from '../utils/chartExport';
import ChartFullscreenModal from '../components/ChartFullscreenModal';
import FullscreenButton from '../components/FullscreenButton';
import AIChatbot from '../components/AIChatbot';

const ENERGY_SOURCES = ['coal', 'oil', 'gas', 'nuclear', 'hydro', 'wind', 'solar', 'biomass', 'geothermal'];
const FOSSIL_SOURCES = ['coal', 'oil', 'gas'];
const CLEAN_SOURCES = ['nuclear', 'hydro', 'wind', 'solar', 'biomass', 'geothermal'];

export default function EnergySupply() {
  const [width] = useWindowSize();  // Dynamic window size for responsive charts
  const [historicalData, setHistoricalData] = useState(null);
  const [projectionsData, setProjectionsData] = useState(null);
  const [efficiencyFactors, setEfficiencyFactors] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedSources, setSelectedSources] = useState(ENERGY_SOURCES);
  const [selectedScenario, setSelectedScenario] = useState('Baseline (STEPS)');
  const [viewMode, setViewMode] = useState('allSources'); // 'allSources', 'grouped', 'allFossil', 'allClean', 'individual'

  // Fullscreen states
  const [isFullscreenChart1, setIsFullscreenChart1] = useState(false);
  const [isFullscreenChart2, setIsFullscreenChart2] = useState(false);
  const [isFullscreenChart3, setIsFullscreenChart3] = useState(false);

  // Force scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Load data
  useEffect(() => {
    Promise.all([
      fetch('/data/useful_energy_timeseries.json').then(r => r.json()),
      fetch('/data/demand_growth_projections.json').then(r => r.json()),
      fetch('/data/efficiency_factors_corrected.json').then(r => r.json())
    ]).then(([useful, projections, efficiency]) => {
      setHistoricalData(useful);
      setProjectionsData(projections);
      setEfficiencyFactors(efficiency);
      setLoading(false);
    }).catch(err => {
      console.error('Error loading data:', err);
      setLoading(false);
    });
  }, []);

  // Process energy data: calculate primary and waste
  const processedData = useMemo(() => {
    if (!historicalData || !efficiencyFactors) return null;

    const eff = efficiencyFactors.system_wide_efficiency;

    // Process historical data (1965-2024)
    const historical = historicalData.data.map(yearData => {
      const processed = {
        year: yearData.year,
        sources: {},
        totals: { primary: 0, useful: 0, waste: 0 },
        fossil: { waste: 0 },
        clean: { waste: 0 }
      };

      if (!yearData.sources_useful_ej) return processed;

      Object.entries(yearData.sources_useful_ej).forEach(([source, useful]) => {
        let efficiency = eff[source] || 0.5;

        // For renewables, use realistic efficiency reflecting minimal conversion losses
        // These sources have T&D losses (~8-10%) but no combustion waste
        if (['solar', 'wind', 'hydro'].includes(source)) {
          efficiency = 0.90; // ~90% accounting for T&D losses only
        } else if (source === 'geothermal') {
          efficiency = 0.85; // Some conversion losses but minimal
        } else if (source === 'nuclear') {
          // Nuclear has thermal conversion losses - keep original efficiency
          efficiency = eff[source] || 0.25;
        }

        const primary = useful / efficiency;
        const waste = primary - useful;

        processed.sources[source] = {
          useful,
          primary,
          waste,
          efficiency: efficiency * 100
        };

        processed.totals.primary += primary;
        processed.totals.useful += useful;
        processed.totals.waste += waste;

        // Add to fossil or clean totals
        if (FOSSIL_SOURCES.includes(source)) {
          processed.fossil.waste += waste;
        } else if (CLEAN_SOURCES.includes(source)) {
          processed.clean.waste += waste;
        }
      });

      return processed;
    });

    // Process projection data (2025-2050) based on selected scenario
    let projections = [];
    if (projectionsData && historical.length > 0) {
      const scenario = projectionsData.scenarios.find(s => s.name === selectedScenario);
      if (scenario && scenario.data.length > 0) {
        // Get 2024 baseline from historical data
        const baseline2024 = historical[historical.length - 1];

        // Get 2025 projection to calculate growth rates
        const projection2025 = scenario.data[0];

        // Calculate source-by-source growth rates from projection
        const growthRates = {};
        if (projection2025.sources_useful_ej && baseline2024.sources) {
          Object.keys(projection2025.sources_useful_ej).forEach(source => {
            const proj2025 = projection2025.sources_useful_ej[source] || 0;
            const hist2024 = baseline2024.sources[source]?.useful || 0;
            growthRates[source] = hist2024 > 0 ? (proj2025 - hist2024) / hist2024 : 0;
          });
        }

        projections = scenario.data.map((yearData) => {
          const processed = {
            year: yearData.year,
            sources: {},
            totals: { primary: 0, useful: 0, waste: 0 },
            fossil: { waste: 0 },
            clean: { waste: 0 }
          };

          if (!yearData.sources_useful_ej) return processed;

          Object.entries(yearData.sources_useful_ej).forEach(([source, useful]) => {
            // Use the actual projection data value, not recalculated growth
            const yearsSince2024 = yearData.year - 2024;

            let efficiency = eff[source] || 0.5;

            // For renewables, use realistic efficiency reflecting minimal conversion losses
            if (['solar', 'wind', 'hydro'].includes(source)) {
              // Start at 90% (T&D losses only), can improve to 95% max
              let baseEfficiency = 0.90;
              if (selectedScenario.includes('Accelerated')) {
                efficiency = Math.min(0.95, baseEfficiency + (yearsSince2024 * 0.002)); // +0.2%/year
              } else if (selectedScenario.includes('Net-Zero')) {
                efficiency = Math.min(0.95, baseEfficiency + (yearsSince2024 * 0.004)); // +0.4%/year
              } else {
                efficiency = baseEfficiency; // Baseline stays at 90%
              }
            } else if (source === 'geothermal') {
              // Geothermal has some conversion losses
              let baseEfficiency = 0.85;
              if (selectedScenario.includes('Accelerated')) {
                efficiency = Math.min(0.92, baseEfficiency + (yearsSince2024 * 0.003));
              } else if (selectedScenario.includes('Net-Zero')) {
                efficiency = Math.min(0.92, baseEfficiency + (yearsSince2024 * 0.005));
              } else {
                efficiency = baseEfficiency;
              }
            } else if (source === 'nuclear') {
              // Nuclear has thermal conversion losses - keep original efficiency
              efficiency = eff[source] || 0.25;
              // Can improve slightly with advanced reactors
              if (selectedScenario.includes('Net-Zero')) {
                efficiency = Math.min(0.35, efficiency + (yearsSince2024 * 0.002));
              }
            } else if (CLEAN_SOURCES.includes(source)) {
              // Other clean sources (biomass) - use fossil-like efficiency
              efficiency = eff[source] || 0.3;
            }
            // Fossil sources keep their base efficiency (no improvement assumed)

            const primary = useful / efficiency;
            const waste = primary - useful;

            processed.sources[source] = {
              useful,
              primary,
              waste,
              efficiency: efficiency * 100
            };

            processed.totals.primary += primary;
            processed.totals.useful += useful;
            processed.totals.waste += waste;

            // Add to fossil or clean totals
            if (FOSSIL_SOURCES.includes(source)) {
              processed.fossil.waste += waste;
            } else if (CLEAN_SOURCES.includes(source)) {
              processed.clean.waste += waste;
            }
          });

          return processed;
        });
      }
    }

    return [...historical, ...projections];
  }, [historicalData, projectionsData, efficiencyFactors, selectedScenario]);

  // Get 2024 data for snapshot metrics
  const data2024 = useMemo(() => {
    if (!processedData) return null;
    return processedData.find(d => d.year === 2024);
  }, [processedData]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!data2024) return null;

    const fossilPrimary = FOSSIL_SOURCES.reduce((sum, src) => sum + (data2024.sources[src]?.primary || 0), 0);
    const fossilUseful = FOSSIL_SOURCES.reduce((sum, src) => sum + (data2024.sources[src]?.useful || 0), 0);
    const fossilWaste = fossilPrimary - fossilUseful;

    const cleanPrimary = CLEAN_SOURCES.reduce((sum, src) => sum + (data2024.sources[src]?.primary || 0), 0);
    const cleanUseful = CLEAN_SOURCES.reduce((sum, src) => sum + (data2024.sources[src]?.useful || 0), 0);

    const globalAvgEff = (data2024.totals.useful / data2024.totals.primary) * 100;
    const fossilAvgEff = (fossilUseful / fossilPrimary) * 100;
    const cleanAvgEff = (cleanUseful / cleanPrimary) * 100;
    const cleanLeverage = cleanAvgEff / fossilAvgEff;

    return {
      globalAvgEff,
      fossilWaste,
      cleanLeverage
    };
  }, [data2024]);

  // Filter toggle functions
  const toggleSource = (source) => {
    // If clicking an individual energy source (not fossil/clean), switch to individual mode
    if (source !== 'fossil' && source !== 'clean') {
      // If switching from a category mode to individual mode, replace selection
      if (viewMode !== 'individual') {
        setViewMode('individual');
        setSelectedSources([source]);
      } else {
        // Already in individual mode, toggle the source
        setSelectedSources(prev => {
          if (prev.includes(source)) {
            // If removing and it's the last one, keep at least one source
            const newSources = prev.filter(s => s !== source);
            return newSources.length > 0 ? newSources : [source];
          } else {
            // Add the source
            return [...prev, source];
          }
        });
      }
    } else {
      // For grouped fossil/clean mode
      setSelectedSources(prev =>
        prev.includes(source)
          ? prev.filter(s => s !== source)
          : [...prev, source]
      );
    }
  };

  const selectAllSources = () => {
    setViewMode('allSources');
    setSelectedSources(ENERGY_SOURCES);
  };

  const selectAllFossil = () => {
    setViewMode('allFossil');
    setSelectedSources(FOSSIL_SOURCES);
  };

  const selectAllClean = () => {
    setViewMode('allClean');
    setSelectedSources(CLEAN_SOURCES);
  };

  const selectGrouped = () => {
    setViewMode('grouped');
    setSelectedSources(['fossil', 'clean']);
  };

  // Export handlers
  const handleDownloadPNG = (chartId, filename) => {
    downloadChartAsPNG(`#${chartId}`, filename);
  };

  const handleDownloadCSV = (data, filename) => {
    downloadDataAsCSV(data, filename);
  };

  // Chart height functions
  const getChart1Height = () => {
    if (isFullscreenChart1) {
      // Chart 1 has many controls (source selection, scenario dropdown) - leave more room
      return width < 640 ? 400 : width < 1024 ? 600 : 750;
    }
    return width < 640 ? 300 : width < 768 ? 400 : 500;
  };

  const getChart2Height = () => {
    if (isFullscreenChart2) {
      // Chart 2 is simpler (no controls), maximize screen usage
      return width < 640 ? 500 : width < 1024 ? 700 : 850;
    }
    return width < 640 ? 300 : width < 768 ? 400 : 500;
  };

  const getChart3Height = () => {
    if (isFullscreenChart3) {
      // Chart 3 is simpler (no controls), maximize screen usage
      return width < 640 ? 500 : width < 1024 ? 700 : 850;
    }
    return width < 640 ? 300 : width < 768 ? 400 : 500;
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="text-center py-16">
          <div className="text-lg text-gray-600">Loading energy supply data...</div>
        </div>
      </PageLayout>
    );
  }

  if (!processedData || !data2024 || !kpis) {
    return (
      <PageLayout>
        <div className="text-center py-16">
          <div className="text-lg text-red-600">Error loading data. Please refresh the page.</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-3">
          Energy Supply Analysis
        </h1>
        <p className="text-sm text-gray-600">
          Total Energy Supply vs. Exergy Services
        </p>
      </div>

      {/* Chart 1: Wasted Energy Over Time by Source */}
      <div className="metric-card bg-white mb-8 pb-8" id="chart-waste-time">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              Wasted Energy Over Time by Source
            </h2>
            <p className="text-sm text-gray-600">
              Energy lost during conversion from primary to useful services
            </p>
          </div>
          <div className="flex gap-2">
            <ChartExportButtons
                onDownloadPNG={() => handleDownloadPNG('chart-waste-time', 'waste_over_time.png')}
                onDownloadCSV={() => {
                  const csvData = processedData.map(yearData => {
                    const row = { Year: yearData.year };
                    selectedSources.forEach(source => {
                      row[getSourceName(source)] = yearData.sources[source]?.waste.toFixed(2) || '0';
                    });
                    row['Total Waste'] = yearData.totals.waste.toFixed(2);
                    return row;
                  });
                  handleDownloadCSV(csvData, 'waste_over_time.csv');
                }}
              />
            <FullscreenButton onClick={() => setIsFullscreenChart1(true)} />
          </div>
          </div>

        {/* Source Selection Buttons */}
        <div className="mb-6">
          <label className="block text-lg font-semibold mb-3 text-gray-700">
            Select Energy Sources
          </label>
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

        {/* Projection Scenario Dropdown */}
        <div className="mb-6">
          <label className="block text-lg font-semibold mb-1 text-gray-700">
            Projection Scenario (2025-2050)
          </label>
          <p className="text-sm text-gray-600 mb-3">
            Based on International Energy Agency scenarios
          </p>
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-base"
          >
            <option value="Baseline (STEPS)">Baseline (STEPS)</option>
            <option value="Accelerated (APS)">Accelerated (APS)</option>
            <option value="Net-Zero (NZE)">Net-Zero (NZE)</option>
          </select>
        </div>

        <ResponsiveContainer width="100%" height={getChart1Height()}>
            <AreaChart
              data={processedData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                domain={['dataMin', 'dataMax']}
              />
              <YAxis label={{ value: 'Waste Energy (EJ)', angle: -90, position: 'insideLeft' }} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
                return (
                  <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                    <div className="font-bold text-lg mb-2">{label}</div>
                    <div className="space-y-1 text-sm">
                      {payload.reverse().map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span>{entry.name}:</span>
                          </div>
                          <span className="font-semibold">{entry.value.toFixed(2)} EJ</span>
                        </div>
                      ))}
                      <div className="flex justify-between gap-4 pt-2 border-t border-gray-200 font-bold">
                        <span>Total Waste:</span>
                        <span>{total.toFixed(2)} EJ</span>
                      </div>
                    </div>
                  </div>
                );
              }} />
              <Legend />
              {viewMode === 'grouped' ? (
                <>
                  {selectedSources.includes('fossil') && (
                    <Area
                      type="monotone"
                      dataKey="fossil.waste"
                      name="Fossil Fuels"
                      stackId="1"
                      stroke="#DC2626"
                      fill="#DC2626"
                    />
                  )}
                  {selectedSources.includes('clean') && (
                    <Area
                      type="monotone"
                      dataKey="clean.waste"
                      name="Clean Energy"
                      stackId="1"
                      stroke="#000000"
                      fill="#000000"
                    />
                  )}
                </>
              ) : (
                selectedSources.map(source => (
                  <Area
                    key={source}
                    type="monotone"
                    dataKey={`sources.${source}.waste`}
                    name={getSourceName(source)}
                    stackId="1"
                    stroke={ENERGY_COLORS[source]}
                    fill={ENERGY_COLORS[source]}
                  />
                ))
              )}
            </AreaChart>
        </ResponsiveContainer>

        {/* Data Sources */}
        <ChartSources sources={['Energy Institute Statistical Review 2024', 'RMI Inefficiency Trap 2023', 'IEA World Energy Outlook 2024']} />
      </div>

      {/* Chart 1 Fullscreen Modal */}
      <ChartFullscreenModal
        isOpen={isFullscreenChart1}
        onClose={() => setIsFullscreenChart1(false)}
        title="Wasted Energy Over Time by Source"
        description="Energy lost during conversion from primary to useful services"
        exportButtons={
          <ChartExportButtons
            onDownloadPNG={() => handleDownloadPNG('chart-waste-time', 'waste_over_time.png')}
            onDownloadCSV={() => {
              const csvData = processedData.map(yearData => {
                const row = { Year: yearData.year };
                selectedSources.forEach(source => {
                  row[getSourceName(source)] = yearData.sources[source]?.waste.toFixed(2) || '0';
                });
                row['Total Waste'] = yearData.totals.waste.toFixed(2);
                return row;
              });
              handleDownloadCSV(csvData, 'waste_over_time.csv');
            }}
          />
        }
      >
        {/* Source Selection Buttons */}
        <div className="mb-6">
          <label className="block text-lg font-semibold mb-3 text-gray-700">
            Select Energy Sources
          </label>
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

        {/* Projection Scenario Dropdown */}
        <div className="mb-6">
          <label className="block text-lg font-semibold mb-1 text-gray-700">
            Projection Scenario (2025-2050)
          </label>
          <p className="text-sm text-gray-600 mb-3">
            Based on International Energy Agency scenarios
          </p>
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-base"
          >
            <option value="Baseline (STEPS)">Baseline (STEPS)</option>
            <option value="Accelerated (APS)">Accelerated (APS)</option>
            <option value="Net-Zero (NZE)">Net-Zero (NZE)</option>
          </select>
        </div>

        <ResponsiveContainer width="100%" height={getChart1Height()}>
            <AreaChart
              data={processedData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                domain={['dataMin', 'dataMax']}
              />
              <YAxis label={{ value: 'Waste Energy (EJ)', angle: -90, position: 'insideLeft' }} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
                return (
                  <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                    <div className="font-bold text-lg mb-2">{label}</div>
                    <div className="space-y-1 text-sm">
                      {payload.reverse().map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span>{entry.name}:</span>
                          </div>
                          <span className="font-semibold">{entry.value.toFixed(2)} EJ</span>
                        </div>
                      ))}
                      <div className="flex justify-between gap-4 pt-2 border-t border-gray-200 font-bold">
                        <span>Total Waste:</span>
                        <span>{total.toFixed(2)} EJ</span>
                      </div>
                    </div>
                  </div>
                );
              }} />
              <Legend />
              {viewMode === 'grouped' ? (
                <>
                  {selectedSources.includes('fossil') && (
                    <Area
                      type="monotone"
                      dataKey="fossil.waste"
                      name="Fossil Fuels"
                      stackId="1"
                      stroke="#DC2626"
                      fill="#DC2626"
                    />
                  )}
                  {selectedSources.includes('clean') && (
                    <Area
                      type="monotone"
                      dataKey="clean.waste"
                      name="Clean Energy"
                      stackId="1"
                      stroke="#000000"
                      fill="#000000"
                    />
                  )}
                </>
              ) : (
                selectedSources.map(source => (
                  <Area
                    key={source}
                    type="monotone"
                    dataKey={`sources.${source}.waste`}
                    name={getSourceName(source)}
                    stackId="1"
                    stroke={ENERGY_COLORS[source]}
                    fill={ENERGY_COLORS[source]}
                  />
                ))
              )}
            </AreaChart>
        </ResponsiveContainer>

        {/* Data Sources */}
        <ChartSources sources={['Energy Institute Statistical Review 2024', 'RMI Inefficiency Trap 2023', 'IEA World Energy Outlook 2024']} />
      </ChartFullscreenModal>

      {/* Chart 2: Global Energy System Efficiency Over Time */}
      <div className="metric-card bg-white mb-8 pb-8" id="chart-efficiency-time">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              Global Energy System Efficiency Over Time
            </h2>
            <p className="text-sm text-gray-600">
              End to end conversion efficiency from primary energy to exergy services
            </p>
          </div>
          <div className="flex gap-2">
            <ChartExportButtons
              onDownloadPNG={() => handleDownloadPNG('chart-efficiency-time', 'global_efficiency_over_time.png')}
              onDownloadCSV={() => {
                const csvData = processedData.map(yearData => ({
                  Year: yearData.year,
                  'Global Efficiency (%)': ((yearData.totals.useful / yearData.totals.primary) * 100).toFixed(1)
                }));
                handleDownloadCSV(csvData, 'global_efficiency_over_time.csv');
              }}
            />
            <FullscreenButton onClick={() => setIsFullscreenChart2(true)} />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={getChart2Height()}>
          <LineChart
            data={processedData.map(yearData => ({
              year: yearData.year,
              globalEfficiency: (yearData.totals.useful / yearData.totals.primary) * 100
            }))}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="year"
              domain={['dataMin', 'dataMax']}
            />
            <YAxis
              label={{ value: 'Global Efficiency (%)', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
            />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const efficiency = payload[0].value;
              return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                  <div className="font-bold text-lg mb-2">{label}</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-600">Global Efficiency:</span>
                      <span className="font-bold text-red-600 text-lg">{efficiency.toFixed(1)}%</span>
                    </div>
                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                      Efficiency = Exergy Services ÷ Primary Energy
                    </div>
                  </div>
                </div>
              );
            }} />
            <Line
              type="monotone"
              dataKey="globalEfficiency"
              name="Global Efficiency"
              stroke="#dc2626"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Data Sources */}
        <ChartSources sources={['Energy Institute Statistical Review 2024', 'RMI Inefficiency Trap 2023']} />
      </div>

      {/* Chart 2 Fullscreen Modal */}
      <ChartFullscreenModal
        isOpen={isFullscreenChart2}
        onClose={() => setIsFullscreenChart2(false)}
        title="Global Energy System Efficiency Over Time"
        description="End to end conversion efficiency from primary energy to exergy services"
        exportButtons={
          <ChartExportButtons
            onDownloadPNG={() => handleDownloadPNG('chart-efficiency-time', 'global_efficiency_over_time.png')}
            onDownloadCSV={() => {
              const csvData = processedData.map(yearData => ({
                Year: yearData.year,
                'Global Efficiency (%)': ((yearData.totals.useful / yearData.totals.primary) * 100).toFixed(1)
              }));
              handleDownloadCSV(csvData, 'global_efficiency_over_time.csv');
            }}
          />
        }
      >
        <ResponsiveContainer width="100%" height={getChart2Height()}>
          <LineChart
            data={processedData.map(yearData => ({
              year: yearData.year,
              globalEfficiency: (yearData.totals.useful / yearData.totals.primary) * 100
            }))}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="year"
              domain={['dataMin', 'dataMax']}
            />
            <YAxis
              label={{ value: 'Global Efficiency (%)', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
            />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const efficiency = payload[0].value;
              return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                  <div className="font-bold text-lg mb-2">{label}</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-600">Global Efficiency:</span>
                      <span className="font-bold text-red-600 text-lg">{efficiency.toFixed(1)}%</span>
                    </div>
                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                      Efficiency = Exergy Services ÷ Primary Energy
                    </div>
                  </div>
                </div>
              );
            }} />
            <Line
              type="monotone"
              dataKey="globalEfficiency"
              name="Global Efficiency"
              stroke="#dc2626"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Data Sources */}
        <ChartSources sources={['Energy Institute Statistical Review 2024', 'RMI Inefficiency Trap 2023']} />
      </ChartFullscreenModal>

      {/* Chart 1: Primary vs. Useful Bar Chart (2024 Snapshot) */}
      <div className="metric-card bg-white mb-8 pb-8" id="chart-primary-useful-2024">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              Primary Energy vs. Exergy Services by Source (2024)
            </h2>
            <p className="text-sm text-gray-600">
              Energy services (colored by source) stacked with waste energy (red) shows total primary energy
            </p>
          </div>
          <div className="flex gap-2">
            <ChartExportButtons
              onDownloadPNG={() => handleDownloadPNG('chart-primary-useful-2024', 'primary_vs_useful_2024.png')}
              onDownloadCSV={() => {
                if (!data2024) return;
                const csvData = ENERGY_SOURCES.map(source => ({
                  Source: getSourceName(source),
                  'Primary Energy (EJ)': data2024.sources[source]?.primary.toFixed(2) || '0',
                  'Exergy Services (EJ)': data2024.sources[source]?.useful.toFixed(2) || '0',
                  'Waste Energy (EJ)': data2024.sources[source]?.waste.toFixed(2) || '0',
                  'Efficiency (%)': data2024.sources[source]?.efficiency.toFixed(1) || '0'
                }));
                handleDownloadCSV(csvData, 'primary_vs_useful_2024.csv');
              }}
            />
            <FullscreenButton onClick={() => setIsFullscreenChart3(true)} />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={getChart3Height()}>
          <BarChart
            data={ENERGY_SOURCES.map(source => ({
              source: getSourceName(source),
              sourceKey: source,
              primary: data2024?.sources[source]?.primary || 0,
              useful: data2024?.sources[source]?.useful || 0,
              waste: data2024?.sources[source]?.waste || 0,
              efficiency: data2024?.sources[source]?.efficiency || 0
            }))}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="source"
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis label={{ value: 'Energy (EJ)', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const data = payload[0].payload;
              const usefulPercent = (data.useful / data.primary) * 100;
              const wastePercent = (data.waste / data.primary) * 100;
              return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                  <div className="font-bold text-lg mb-2">{data.source}</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Primary Energy:</span>
                      <span className="font-semibold">{data.primary.toFixed(2)} EJ</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Exergy Services:</span>
                      <span className="font-semibold">{data.useful.toFixed(2)} EJ ({usefulPercent.toFixed(1)}%)</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Waste Energy:</span>
                      <span className="font-semibold text-red-600">{data.waste.toFixed(2)} EJ ({wastePercent.toFixed(1)}%)</span>
                    </div>
                    <div className="flex justify-between gap-4 pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Efficiency:</span>
                      <span className="font-bold">{data.efficiency.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            }} />
            <Legend />
            <Bar dataKey="useful" name="Exergy Services" stackId="a" fill="#000000">
              {ENERGY_SOURCES.map(source => (
                <Cell key={source} fill={ENERGY_COLORS[source]} />
              ))}
            </Bar>
            <Bar dataKey="waste" name="Waste Energy" stackId="a" fill="#dc2626">
              {ENERGY_SOURCES.map(source => (
                <Cell key={source} fill="#dc2626" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Data Sources */}
        <ChartSources sources={['Energy Institute Statistical Review 2024', 'RMI Inefficiency Trap 2023']} />
      </div>

      {/* Chart 3 Fullscreen Modal */}
      <ChartFullscreenModal
        isOpen={isFullscreenChart3}
        onClose={() => setIsFullscreenChart3(false)}
        title="Primary Energy vs. Exergy Services by Source (2024)"
        description="Energy services (colored by source) stacked with waste energy (red) shows total primary energy"
        exportButtons={
          <ChartExportButtons
            onDownloadPNG={() => handleDownloadPNG('chart-primary-useful-2024', 'primary_vs_useful_2024.png')}
            onDownloadCSV={() => {
              if (!data2024) return;
              const csvData = ENERGY_SOURCES.map(source => ({
                Source: getSourceName(source),
                'Primary Energy (EJ)': data2024.sources[source]?.primary.toFixed(2) || '0',
                'Exergy Services (EJ)': data2024.sources[source]?.useful.toFixed(2) || '0',
                'Waste Energy (EJ)': data2024.sources[source]?.waste.toFixed(2) || '0',
                'Efficiency (%)': data2024.sources[source]?.efficiency.toFixed(1) || '0'
              }));
              handleDownloadCSV(csvData, 'primary_vs_useful_2024.csv');
            }}
          />
        }
      >
        <ResponsiveContainer width="100%" height={getChart3Height()}>
          <BarChart
            data={ENERGY_SOURCES.map(source => ({
              source: getSourceName(source),
              sourceKey: source,
              primary: data2024?.sources[source]?.primary || 0,
              useful: data2024?.sources[source]?.useful || 0,
              waste: data2024?.sources[source]?.waste || 0,
              efficiency: data2024?.sources[source]?.efficiency || 0
            }))}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="source"
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis label={{ value: 'Energy (EJ)', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const data = payload[0].payload;
              const usefulPercent = (data.useful / data.primary) * 100;
              const wastePercent = (data.waste / data.primary) * 100;
              return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                  <div className="font-bold text-lg mb-2">{data.source}</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Primary Energy:</span>
                      <span className="font-semibold">{data.primary.toFixed(2)} EJ</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Exergy Services:</span>
                      <span className="font-semibold">{data.useful.toFixed(2)} EJ ({usefulPercent.toFixed(1)}%)</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Waste Energy:</span>
                      <span className="font-semibold text-red-600">{data.waste.toFixed(2)} EJ ({wastePercent.toFixed(1)}%)</span>
                    </div>
                    <div className="flex justify-between gap-4 pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Efficiency:</span>
                      <span className="font-bold">{data.efficiency.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            }} />
            <Legend />
            <Bar dataKey="useful" name="Exergy Services" stackId="a" fill="#000000">
              {ENERGY_SOURCES.map(source => (
                <Cell key={source} fill={ENERGY_COLORS[source]} />
              ))}
            </Bar>
            <Bar dataKey="waste" name="Waste Energy" stackId="a" fill="#dc2626">
              {ENERGY_SOURCES.map(source => (
                <Cell key={source} fill="#dc2626" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Data Sources */}
        <ChartSources sources={['Energy Institute Statistical Review 2024', 'RMI Inefficiency Trap 2023']} />
      </ChartFullscreenModal>

      {/* Understanding Energy Supply Section */}
      <div className="metric-card bg-white mb-8 border-2 border-blue-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Understanding Energy Supply</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Primary Energy</h3>
            <p className="text-gray-700">
              The total energy content of raw energy sources before conversion. For fossil fuels, this is the
              chemical energy in coal, oil, or gas. For renewables, we use the "thermal accounting method" to
              make comparisons fair.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Exergy Services</h3>
            <p className="text-gray-700">
              The actual energy services delivered to end users: heat, motion, light, etc. This is what matters
              for the economy and our lives. A car doesn't need primary energy—it needs motion.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Conversion Efficiency</h3>
            <p className="text-gray-700">
              The percentage of primary energy that becomes exergy services. Coal plants are ~32% efficient,
              meaning 68% is wasted as heat. Wind turbines are ~75% efficient, wasting only 25%.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Waste Energy</h3>
            <p className="text-gray-700">
              Energy lost during conversion, primarily as heat. This is calculated as Primary Energy minus Useful
              Energy. Globally, we waste about {((data2024?.totals.waste / data2024?.totals.primary) * 100).toFixed(0)}%
              of all energy due to inefficient conversion technologies.
            </p>
          </div>
        </div>
      </div>

      {/* AI Chatbot */}
      <div className="mb-8">
        <AIChatbot />
      </div>
    </PageLayout>
  );
}

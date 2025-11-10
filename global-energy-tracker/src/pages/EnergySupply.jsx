import { useState, useEffect, useMemo } from 'react';
import PageLayout from '../components/PageLayout';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ENERGY_COLORS, getSourceName } from '../utils/colors';
import { downloadChartAsPNG, downloadDataAsCSV, ChartExportButtons } from '../utils/chartExport';
import AIChatbot from '../components/AIChatbot';

const ENERGY_SOURCES = ['coal', 'oil', 'gas', 'nuclear', 'hydro', 'wind', 'solar', 'biomass', 'geothermal'];
const FOSSIL_SOURCES = ['coal', 'oil', 'gas'];
const CLEAN_SOURCES = ['nuclear', 'hydro', 'wind', 'solar', 'biomass', 'geothermal'];

export default function EnergySupply() {
  const [historicalData, setHistoricalData] = useState(null);
  const [projectionsData, setProjectionsData] = useState(null);
  const [efficiencyFactors, setEfficiencyFactors] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedSources, setSelectedSources] = useState(ENERGY_SOURCES);
  const [selectedScenario, setSelectedScenario] = useState('Baseline (STEPS)');

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
      fetch('/data-pipeline/efficiency_factors_corrected.json').then(r => r.json())
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
        totals: { primary: 0, useful: 0, waste: 0 }
      };

      Object.entries(yearData.sources_useful_ej).forEach(([source, useful]) => {
        const efficiency = eff[source] || 0.5;
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
      });

      return processed;
    });

    // Process projection data (2025-2050) based on selected scenario
    let projections = [];
    if (projectionsData) {
      const scenario = projectionsData.scenarios.find(s => s.name === selectedScenario);
      if (scenario) {
        projections = scenario.data.map((yearData, index) => {
          const processed = {
            year: yearData.year,
            sources: {},
            totals: { primary: 0, useful: 0, waste: 0 }
          };

          Object.entries(yearData.sources_useful_ej).forEach(([source, useful]) => {
            let efficiency = eff[source] || 0.5;

            // Apply efficiency improvements for clean sources based on scenario
            if (CLEAN_SOURCES.includes(source)) {
              const yearsSince2024 = yearData.year - 2024;
              if (selectedScenario.includes('Accelerated')) {
                efficiency = Math.min(0.95, efficiency + (yearsSince2024 * 0.01)); // +1%/year, max 95%
              } else if (selectedScenario.includes('Net-Zero')) {
                efficiency = Math.min(0.95, efficiency + (yearsSince2024 * 0.02)); // +2%/year, max 95%
              }
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
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const selectAllSources = () => setSelectedSources(ENERGY_SOURCES);
  const selectFossilOnly = () => setSelectedSources(FOSSIL_SOURCES);
  const selectCleanOnly = () => setSelectedSources(CLEAN_SOURCES);

  // Export handlers
  const handleDownloadPNG = (chartId, filename) => {
    downloadChartAsPNG(`#${chartId}`, filename);
  };

  const handleDownloadCSV = (data, filename) => {
    downloadDataAsCSV(data, filename);
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
        <h1 className="text-3xl font-bold text-gray-800 mb-3">
          Energy Supply Analysis
        </h1>
        <p className="text-sm text-gray-600">
          Total Energy Supply vs. Useful Energy Services
        </p>
      </div>

      {/* Shared Filter Controls */}
      <div className="metric-card bg-gray-50 mb-8">
        <div className="mb-4">
          <label className="block text-lg font-semibold mb-3 text-gray-700">
            Filter by Energy Source
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={selectAllSources}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedSources.length === ENERGY_SOURCES.length
                  ? 'bg-purple-600 text-white ring-2 ring-purple-600 ring-offset-2'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Sources
            </button>
            <button
              onClick={selectFossilOnly}
              className="px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Fossil Only
            </button>
            <button
              onClick={selectCleanOnly}
              className="px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Clean Only
            </button>
          </div>

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

        <div>
          <label className="block text-lg font-semibold mb-3 text-gray-700">
            Projection Scenario (2025-2050)
          </label>
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
        {/* Chart 3: Wasted Energy Over Time by Source */}
        <div className="mt-8" id="chart-waste-time">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                Wasted Energy Over Time by Source
              </h2>
              <p className="text-sm text-gray-600">
                Energy lost during conversion from primary to useful services
              </p>
            </div>
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
          </div>

          <ResponsiveContainer width="100%" height={500}>
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
              {selectedSources.map(source => (
                <Area
                  key={source}
                  type="monotone"
                  dataKey={`sources.${source}.waste`}
                  name={getSourceName(source)}
                  stackId="1"
                  stroke={ENERGY_COLORS[source]}
                  fill={ENERGY_COLORS[source]}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Global Energy System Efficiency Over Time */}
      <div className="metric-card bg-white mb-8" id="chart-efficiency-time">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              Global Energy System Efficiency Over Time
            </h2>
            <p className="text-sm text-gray-600">
              End to end conversion efficiency from primary energy to useful energy services
            </p>
          </div>
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
        </div>

        <ResponsiveContainer width="100%" height={500}>
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
                      Efficiency = Useful Energy ÷ Primary Energy
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
      </div>

      {/* Chart 1: Primary vs. Useful Bar Chart (2024 Snapshot) */}
      <div className="metric-card bg-white mb-8" id="chart-primary-useful-2024">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              Primary Energy vs. Useful Energy by Source (2024)
            </h2>
            <p className="text-sm text-gray-600">
              Useful energy (colored by source) stacked with waste energy (red) shows total primary energy
            </p>
          </div>
          <ChartExportButtons
            onDownloadPNG={() => handleDownloadPNG('chart-primary-useful-2024', 'primary_vs_useful_2024.png')}
            onDownloadCSV={() => {
              if (!data2024) return;
              const csvData = ENERGY_SOURCES.map(source => ({
                Source: getSourceName(source),
                'Primary Energy (EJ)': data2024.sources[source]?.primary.toFixed(2) || '0',
                'Useful Energy (EJ)': data2024.sources[source]?.useful.toFixed(2) || '0',
                'Waste Energy (EJ)': data2024.sources[source]?.waste.toFixed(2) || '0',
                'Efficiency (%)': data2024.sources[source]?.efficiency.toFixed(1) || '0'
              }));
              handleDownloadCSV(csvData, 'primary_vs_useful_2024.csv');
            }}
          />
        </div>

        <ResponsiveContainer width="100%" height={500}>
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
                      <span className="text-gray-600">Useful Energy:</span>
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
            <Legend
              payload={[
                { value: 'Useful Energy', type: 'rect', color: '#3b82f6' },
                { value: 'Waste Energy', type: 'rect', color: '#dc2626' }
              ]}
            />
            <Bar dataKey="useful" name="Useful Energy" stackId="a">
              {ENERGY_SOURCES.map(source => (
                <Cell key={source} fill={ENERGY_COLORS[source]} />
              ))}
            </Bar>
            <Bar dataKey="waste" name="Waste Energy" stackId="a">
              {ENERGY_SOURCES.map(source => (
                <Cell key={source} fill="#dc2626" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

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
            <h3 className="font-bold text-lg text-gray-800 mb-2">Useful Energy</h3>
            <p className="text-gray-700">
              The actual energy services delivered to end users: heat, motion, light, etc. This is what matters
              for the economy and our lives. A car doesn't need primary energy—it needs motion.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Conversion Efficiency</h3>
            <p className="text-gray-700">
              The percentage of primary energy that becomes useful energy services. Coal plants are ~32% efficient,
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

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-600 md:col-span-2">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Thermal Accounting Method</h3>
            <p className="text-gray-700">
              A standardized method for comparing all energy sources fairly. For thermal sources (coal, gas, nuclear),
              we count the heat content. For direct sources (wind, solar), we use the "substitution method"—calculating
              how much thermal fuel would be needed to generate the same electricity. This prevents accounting tricks
              where renewables appear smaller than they actually are.
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

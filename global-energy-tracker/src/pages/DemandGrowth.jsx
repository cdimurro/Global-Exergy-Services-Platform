import { useState, useEffect } from 'react';
import { useWindowSize } from '@react-hook/window-size';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageLayout from '../components/PageLayout';
import AIChatbot from '../components/AIChatbot';
import SectoralEnergyGrowth from '../components/SectoralEnergyGrowth';
import { downloadChartAsPNG, downloadDataAsCSV, ChartExportButtons, ChartSources } from '../utils/chartExport';
import ChartFullscreenModal from '../components/ChartFullscreenModal';
import FullscreenButton from '../components/FullscreenButton';

export default function DemandGrowth() {
  const [width] = useWindowSize();  // Dynamic window size for responsive charts
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState('Baseline (STEPS)');

  // Fullscreen states
  const [isFullscreenChart1, setIsFullscreenChart1] = useState(false);
  const [isFullscreenChart2, setIsFullscreenChart2] = useState(false);

  // Force scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    fetch('/data/demand_growth_projections.json')
      .then(res => res.json())
      .then(jsonData => {
        setData(jsonData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading projections:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return <div className="text-center py-8">Loading projections...</div>;
  }

  // Prepare data for charts (using Exergy Services)
  const prepareChartData = () => {
    const allYears = data.scenarios[0].data.map(d => d.year);

    return allYears.map(year => {
      const yearData = { year };

      data.scenarios.forEach(scenario => {
        const scenarioData = scenario.data.find(d => d.year === year);
        if (scenarioData) {
          const scenarioKey = scenario.name;
          // Use services data (Tier 3: useful × exergy)
          yearData[`${scenarioKey}_fossil`] = scenarioData.fossil_services_ej;
          yearData[`${scenarioKey}_clean`] = scenarioData.clean_services_ej;
          yearData[`${scenarioKey}_total`] = scenarioData.total_services_ej;
        }
      });

      return yearData;
    });
  };

  const chartData = prepareChartData();

  const COLORS = {
    'Baseline (STEPS)': '#3B82F6',
    'Accelerated (APS)': '#10B981',
    'Net-Zero (NZE)': '#8B5CF6'
  };

  const sources = data.metadata.sources;

  // Export handlers for Total Demand chart
  const handleDownloadTotalPNG = () => {
    const filename = `total-energy-demand-projections-${new Date().toISOString().split('T')[0]}`;
    downloadChartAsPNG('#total-demand-chart', filename);
  };

  const handleDownloadTotalCSV = () => {
    const filename = `total-energy-demand-projections-${new Date().toISOString().split('T')[0]}`;
    const csvData = chartData.map(row => ({
      Year: row.year,
      'Baseline STEPS (EJ)': row['Baseline (STEPS)_total']?.toFixed(2) || '',
      'Accelerated APS (EJ)': row['Accelerated (APS)_total']?.toFixed(2) || '',
      'Net-Zero NZE (EJ)': row['Net-Zero (NZE)_total']?.toFixed(2) || ''
    }));
    downloadDataAsCSV(csvData, filename);
  };

  // Export handlers for Fossil vs Clean chart
  const handleDownloadMixPNG = () => {
    const filename = `fossil-vs-clean-energy-mix-${selectedScenario.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`;
    downloadChartAsPNG('#energy-mix-chart', filename);
  };

  const handleDownloadMixCSV = () => {
    const filename = `fossil-vs-clean-energy-mix-${selectedScenario.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`;
    const csvData = chartData.map(row => ({
      Year: row.year,
      'Fossil Fuels (EJ)': row[`${selectedScenario}_fossil`]?.toFixed(2) || '',
      'Clean Energy (EJ)': row[`${selectedScenario}_clean`]?.toFixed(2) || '',
      'Total (EJ)': row[`${selectedScenario}_total`]?.toFixed(2) || ''
    }));
    downloadDataAsCSV(csvData, filename);
  };

  // Chart height functions
  const getChart1Height = () => {
    if (isFullscreenChart1) {
      // Chart 1 is simple line chart - maximize screen usage
      return width < 640 ? 500 : width < 1024 ? 700 : 850;
    }
    return width < 640 ? 280 : width < 768 ? 350 : 400;
  };

  const getChart2Height = () => {
    if (isFullscreenChart2) {
      // Chart 2 has scenario dropdown control - leave room for dropdown
      return width < 640 ? 450 : width < 1024 ? 650 : 800;
    }
    return width < 640 ? 280 : width < 768 ? 350 : 400;
  };

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-3">
          Exergy Services Demand Growth Forecast
        </h1>
        <p className="text-sm text-gray-600">
          Comprehensive projections of global exergy services demand (2025-2050) based on IEA, BP, and RMI analysis
        </p>
      </div>

      {/* Sectoral Energy Growth Chart */}
      <SectoralEnergyGrowth />

      {/* Total Demand Projection Chart */}
      <div className="metric-card bg-white mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Total Exergy Services Demand Projections
          </h2>
          <div className="flex gap-2">
            <ChartExportButtons
              onDownloadPNG={handleDownloadTotalPNG}
              onDownloadCSV={handleDownloadTotalCSV}
            />
            <FullscreenButton onClick={() => setIsFullscreenChart1(true)} />
          </div>
        </div>
        <div id="total-demand-chart">
          <ResponsiveContainer width="100%" height={getChart1Height()}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis label={{ value: 'Exergy Services (EJ)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="Baseline (STEPS)_total"
                stroke={COLORS['Baseline (STEPS)']}
                strokeWidth={2}
                name="Baseline (STEPS)"
              />
              <Line
                type="monotone"
                dataKey="Accelerated (APS)_total"
                stroke={COLORS['Accelerated (APS)']}
                strokeWidth={2}
                name="Accelerated (APS)"
              />
              <Line
                type="monotone"
                dataKey="Net-Zero (NZE)_total"
                stroke={COLORS['Net-Zero (NZE)']}
                strokeWidth={2}
                name="Net-Zero (NZE)"
              />
            </LineChart>
          </ResponsiveContainer>
          <ChartSources sources={sources} />
        </div>
      </div>

      {/* Chart 1 Fullscreen Modal */}
      <ChartFullscreenModal
        isOpen={isFullscreenChart1}
        onClose={() => setIsFullscreenChart1(false)}
        title="Total Exergy Services Demand Projections"
        description="Projected global exergy services demand by scenario (2025-2050)"
        exportButtons={
          <ChartExportButtons
            onDownloadPNG={handleDownloadTotalPNG}
            onDownloadCSV={handleDownloadTotalCSV}
          />
        }
      >
        <ResponsiveContainer width="100%" height={getChart1Height()}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis label={{ value: 'Energy (EJ)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="Baseline (STEPS)_total"
              stroke={COLORS['Baseline (STEPS)']}
              strokeWidth={2}
              name="Baseline (STEPS)"
            />
            <Line
              type="monotone"
              dataKey="Accelerated (APS)_total"
              stroke={COLORS['Accelerated (APS)']}
              strokeWidth={2}
              name="Accelerated (APS)"
            />
            <Line
              type="monotone"
              dataKey="Net-Zero (NZE)_total"
              stroke={COLORS['Net-Zero (NZE)']}
              strokeWidth={2}
              name="Net-Zero (NZE)"
            />
          </LineChart>
        </ResponsiveContainer>
        <ChartSources sources={sources} />
      </ChartFullscreenModal>

      {/* Fossil vs Clean Stacked Area Chart */}
      <div className="metric-card bg-white mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Fossil vs. Clean Energy Mix by Scenario
          </h2>
          <div className="flex gap-2">
            <ChartExportButtons
              onDownloadPNG={handleDownloadMixPNG}
              onDownloadCSV={handleDownloadMixCSV}
            />
            <FullscreenButton onClick={() => setIsFullscreenChart2(true)} />
          </div>
        </div>
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-700 mr-2">Select Scenario:</label>
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="Baseline (STEPS)">Baseline (STEPS)</option>
            <option value="Accelerated (APS)">Accelerated (APS)</option>
            <option value="Net-Zero (NZE)">Net-Zero (NZE)</option>
          </select>
        </div>
        <div id="energy-mix-chart">
          <ResponsiveContainer width="100%" height={getChart2Height()}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis label={{ value: 'Exergy Services (EJ)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey={`${selectedScenario}_fossil`}
                stackId="1"
                stroke="#DC2626"
                fill="#DC2626"
                name="Fossil Fuels"
              />
              <Area
                type="monotone"
                dataKey={`${selectedScenario}_clean`}
                stackId="1"
                stroke="#16A34A"
                fill="#16A34A"
                name="Clean Energy"
              />
            </AreaChart>
          </ResponsiveContainer>
          <ChartSources sources={sources} />
        </div>
      </div>

      {/* Chart 2 Fullscreen Modal */}
      <ChartFullscreenModal
        isOpen={isFullscreenChart2}
        onClose={() => setIsFullscreenChart2(false)}
        title="Fossil vs. Clean Energy Mix by Scenario"
        description="Projected fossil and clean energy mix over time"
        exportButtons={
          <ChartExportButtons
            onDownloadPNG={handleDownloadMixPNG}
            onDownloadCSV={handleDownloadMixCSV}
          />
        }
      >
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-700 mr-2">Select Scenario:</label>
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="Baseline (STEPS)">Baseline (STEPS)</option>
            <option value="Accelerated (APS)">Accelerated (APS)</option>
            <option value="Net-Zero (NZE)">Net-Zero (NZE)</option>
          </select>
        </div>

        <ResponsiveContainer width="100%" height={getChart2Height()}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis label={{ value: 'Energy (EJ)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey={`${selectedScenario}_fossil`}
              stackId="1"
              stroke="#DC2626"
              fill="#DC2626"
              name="Fossil Fuels"
            />
            <Area
              type="monotone"
              dataKey={`${selectedScenario}_clean`}
              stackId="1"
              stroke="#16A34A"
              fill="#16A34A"
              name="Clean Energy"
            />
          </AreaChart>
        </ResponsiveContainer>
        <ChartSources sources={sources} />
      </ChartFullscreenModal>

      {/* Understanding Demand Growth */}
      <div className="metric-card bg-white mb-8 border-2 border-blue-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Understanding Demand Growth
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Historical Evolution
            </h3>
            <p className="text-gray-700">
              Global exergy services grew from ~60 EJ in 1965 to ~140 EJ in 2024, driven primarily by fossil fuels.
              Clean energy remained under 20% until 2020, when solar and wind deployment accelerated significantly.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Growth Drivers
            </h3>
            <p className="text-gray-700">
              Fossil fuels meet ~80% of demand growth, particularly in transport and heavy industry.
              Clean energy grows 3x faster but from a smaller base, with solar and wind rapidly displacing fossil electricity.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Forecast Scenarios
            </h3>
            <p className="text-gray-700">
              IEA projects three pathways: STEPS (fossil peak ~2035), APS (fossil peak 2030), and NZE (fossil peak 2028).
              Clean energy growth rates range from 3-8 EJ/year depending on policy implementation and efficiency gains.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Forecast Uncertainty
            </h3>
            <p className="text-gray-700">
              Projections depend on economic growth, technology deployment speed, and policy implementation.
              Historical forecasts consistently underestimated clean energy growth while overestimating fossil demand.
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

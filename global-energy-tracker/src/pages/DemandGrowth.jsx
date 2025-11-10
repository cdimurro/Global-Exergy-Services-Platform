import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageLayout from '../components/PageLayout';
import AIChatbot from '../components/AIChatbot';
import SectoralEnergyGrowth from '../components/SectoralEnergyGrowth';
import { downloadChartAsPNG, downloadDataAsCSV, ChartExportButtons, ChartSources } from '../utils/chartExport';

export default function DemandGrowth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState('Baseline (STEPS)');

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

  // Prepare data for charts
  const prepareChartData = () => {
    const allYears = data.scenarios[0].data.map(d => d.year);

    return allYears.map(year => {
      const yearData = { year };

      data.scenarios.forEach(scenario => {
        const scenarioData = scenario.data.find(d => d.year === year);
        if (scenarioData) {
          const scenarioKey = scenario.name;
          yearData[`${scenarioKey}_fossil`] = scenarioData.fossil_useful_ej;
          yearData[`${scenarioKey}_clean`] = scenarioData.clean_useful_ej;
          yearData[`${scenarioKey}_total`] = scenarioData.total_useful_ej;
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

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-3">
          Energy Services Demand Growth Forecast
        </h1>
        <p className="text-sm text-gray-600">
          Comprehensive projections of global useful energy demand (2025-2050) based on IEA, BP, and RMI analysis
        </p>
      </div>

      {/* Sectoral Energy Growth Chart */}
      <SectoralEnergyGrowth />

      {/* Total Demand Projection Chart */}
      <div className="metric-card bg-white mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Total Useful Energy Demand Projections
          </h2>
          <ChartExportButtons
            onDownloadPNG={handleDownloadTotalPNG}
            onDownloadCSV={handleDownloadTotalCSV}
          />
        </div>
        <div id="total-demand-chart">
          <ResponsiveContainer width="100%" height={400}>
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
        </div>
      </div>

      {/* Fossil vs Clean Stacked Area Chart */}
      <div className="metric-card bg-white mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Fossil vs. Clean Energy Mix by Scenario
          </h2>
          <ChartExportButtons
            onDownloadPNG={handleDownloadMixPNG}
            onDownloadCSV={handleDownloadMixCSV}
          />
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
          <ResponsiveContainer width="100%" height={400}>
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
        </div>
      </div>

      {/* Key Insights */}
      <div className="metric-card bg-white mb-8 border-2 border-blue-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Understanding Scenario Pathways
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Baseline (STEPS)</h3>
            <p className="text-gray-700">
              Fossil fuels peak around 2035. Clean energy grows at 3 EJ/year.
              Efficiency improvements of 1%/year reduce total demand growth to 1%/year.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Accelerated (APS)</h3>
            <p className="text-gray-700">
              Fossil fuels peak by 2030. Clean energy grows at 5 EJ/year.
              Enhanced efficiency (1.2%/year) enables faster transition.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Net-Zero (NZE)</h3>
            <p className="text-gray-700">
              Fossil fuels peak by 2028. Aggressive clean deployment (8 EJ/year) and
              efficiency gains (1.8%/year) enable rapid decarbonization.
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

import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ENERGY_COLORS, getSourceName } from '../utils/colors';
import InteractiveChart from '../components/InteractiveChart';
import PageLayout from '../components/PageLayout';
import AIChatbot from '../components/AIChatbot';
import { downloadChartAsPNG, downloadDataAsCSV, ChartExportButtons } from '../utils/chartExport';

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refs for charts - must be before conditional return
  const globalEnergyChartRef = useRef(null);
  const fossilBreakdownChartRef = useRef(null);
  const cleanBreakdownChartRef = useRef(null);

  useEffect(() => {
    fetch('/data/useful_energy_timeseries.json')
      .then(res => res.json())
      .then(jsonData => {
        const latestYear = jsonData.data[jsonData.data.length - 1];
        setData(latestYear);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading data:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return <div className="text-center py-8">Loading data...</div>;
  }

  const {
    year,
    total_useful_ej,
    fossil_useful_ej,
    clean_useful_ej,
    fossil_share_percent,
    clean_share_percent,
    sources_useful_ej
  } = data;

  // Sort sources by energy amount
  const sortedSources = Object.entries(sources_useful_ej)
    .filter(([_, value]) => value > 0)
    .sort(([, a], [, b]) => b - a);

  const fossilSources = sortedSources.filter(([source]) =>
    ['oil', 'gas', 'coal'].includes(source)
  );

  const cleanSources = sortedSources.filter(([source]) =>
    !['oil', 'gas', 'coal'].includes(source)
  );

  // Pie chart data
  const pieData = [
    { name: 'Fossil Fuels', value: fossil_useful_ej, percentage: fossil_share_percent },
    { name: 'Clean Energy', value: clean_useful_ej, percentage: clean_share_percent }
  ];

  const COLORS = {
    'Fossil Fuels': '#DC2626',
    'Clean Energy': '#16A34A'
  };

  const renderCustomLabel = (entry) => {
    return `${entry.name}: ${entry.value.toFixed(1)} EJ (${entry.percentage.toFixed(1)}%)`;
  };

  // Download functions for Global Energy Services chart
  const downloadGlobalEnergyPNG = () => {
    downloadChartAsPNG(globalEnergyChartRef, `global_energy_services_${year}`);
  };

  const downloadGlobalEnergyCSV = () => {
    const csvData = pieData.map(item => ({
      'Energy Type': item.name,
      'Energy Services (EJ)': item.value.toFixed(2),
      'Share (%)': item.percentage.toFixed(2)
    }));
    downloadDataAsCSV(csvData, `global_energy_services_${year}`);
  };

  // Download functions for Fossil Breakdown chart
  const downloadFossilBreakdownPNG = () => {
    downloadChartAsPNG(fossilBreakdownChartRef, `fossil_fuel_breakdown_${year}`);
  };

  const downloadFossilBreakdownCSV = () => {
    const csvData = fossilSources.map(([source, ej]) => ({
      'Source': getSourceName(source),
      'Energy Services (EJ)': ej.toFixed(2),
      'Share of Fossil (%)': ((ej / fossil_useful_ej) * 100).toFixed(2)
    }));
    downloadDataAsCSV(csvData, `fossil_fuel_breakdown_${year}`);
  };

  // Download functions for Clean Breakdown chart
  const downloadCleanBreakdownPNG = () => {
    downloadChartAsPNG(cleanBreakdownChartRef, `clean_energy_breakdown_${year}`);
  };

  const downloadCleanBreakdownCSV = () => {
    const csvData = cleanSources.map(([source, ej]) => ({
      'Source': getSourceName(source),
      'Energy Services (EJ)': ej.toFixed(2),
      'Share of Clean (%)': ((ej / clean_useful_ej) * 100).toFixed(2)
    }));
    downloadDataAsCSV(csvData, `clean_energy_breakdown_${year}`);
  };

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="text-center mb-4 sm:mb-8">
        <h1 className="text-lg sm:text-3xl md:text-4xl font-bold text-gray-800 mb-1 sm:mb-3 px-2">
          Global Energy Services Tracker
        </h1>
        <p className="text-[10px] sm:text-sm text-gray-600 px-4 leading-tight">
          Get a complete view of the energy system and gain valuable insights by measuring energy services instead of primary energy.
        </p>
      </div>

      {/* Interactive Chart Explorer */}
      <div className="mb-8">
        <InteractiveChart />
      </div>

      {/* Global Energy Services */}
      <div className="metric-card mb-8 bg-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Global Energy Services for {year}
          </h2>
          <ChartExportButtons
            onDownloadPNG={downloadGlobalEnergyPNG}
            onDownloadCSV={downloadGlobalEnergyCSV}
          />
        </div>

        {/* Total Display */}
        <div className="text-center mb-3 sm:mb-6">
          <div className="text-2xl sm:text-4xl md:text-5xl font-bold mb-1 sm:mb-3 text-gray-900">
            {total_useful_ej.toFixed(1)}
            <span className="text-base sm:text-2xl md:text-3xl ml-1 sm:ml-2 text-gray-500">EJ</span>
          </div>
          <div className="text-[10px] sm:text-sm md:text-base text-gray-500 px-2">
            Exajoules of useful energy delivered globally
          </div>
        </div>

        {/* Pie Chart */}
        <div className="mb-3 sm:mb-6" ref={globalEnergyChartRef}>
          <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={(entry) => `${entry.name}: ${entry.value.toFixed(1)} EJ (${entry.percentage.toFixed(1)}%)`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          <div className="text-xs text-gray-500 text-center mt-2">
            Data sources: Our World in Data, BP Statistical Review
          </div>
          </div>

          {/* Fossil vs Clean Split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            {/* Fossil Card */}
            <div className="p-3 sm:p-5 bg-red-50 rounded-lg border-l-4 border-red-600">
              <div className="text-red-600 text-xs sm:text-base mb-1 sm:mb-3 uppercase tracking-wide font-semibold">
                Fossil Fuels
              </div>
              <div className="text-xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 text-gray-900">
                {fossil_useful_ej.toFixed(1)}
                <span className="text-sm sm:text-xl md:text-2xl ml-1 text-gray-500">EJ</span>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-red-600 mb-1 sm:mb-2">
                {fossil_share_percent.toFixed(1)}%
              </div>
              <div className="text-[10px] sm:text-sm text-gray-500">of total energy services</div>
            </div>

            {/* Clean Card */}
            <div className="p-3 sm:p-5 bg-green-50 rounded-lg border-l-4 border-green-600">
              <div className="text-green-600 text-xs sm:text-base mb-1 sm:mb-3 uppercase tracking-wide font-semibold">
                Clean Energy
              </div>
              <div className="text-xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 text-gray-900">
                {clean_useful_ej.toFixed(1)}
                <span className="text-sm sm:text-xl md:text-2xl ml-1 text-gray-500">EJ</span>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-green-600 mb-1 sm:mb-2">
                {clean_share_percent.toFixed(1)}%
              </div>
              <div className="text-[10px] sm:text-sm text-gray-500">of total energy services</div>
            </div>
          </div>
        </div>

        {/* Fossil Fuel Breakdown */}
        <div className="metric-card mb-8 bg-white">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Fossil Fuel Breakdown for {year}
            </h2>
            <ChartExportButtons
              onDownloadPNG={downloadFossilBreakdownPNG}
              onDownloadCSV={downloadFossilBreakdownCSV}
            />
          </div>

          <div className="mb-6" ref={fossilBreakdownChartRef}>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={fossilSources.map(([source, ej]) => ({
                    name: getSourceName(source),
                    value: ej,
                    percentage: (ej / fossil_useful_ej) * 100
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={(entry) => `${entry.name}: ${entry.value.toFixed(1)} EJ (${entry.percentage.toFixed(1)}%)`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {fossilSources.map(([source], index) => (
                    <Cell key={`cell-${index}`} fill={ENERGY_COLORS[source]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="text-xs text-gray-500 text-center mt-2">
              Data sources: Our World in Data, BP Statistical Review
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fossilSources.map(([source, ej]) => {
              const share = (ej / fossil_useful_ej) * 100;
              const color = ENERGY_COLORS[source];

              return (
                <div
                  key={source}
                  className="p-4 bg-gray-50 rounded-lg border-l-4"
                  style={{ borderLeftColor: color }}
                >
                  <div
                    className="text-base font-bold mb-2 uppercase tracking-wide"
                    style={{ color }}
                  >
                    {getSourceName(source)}
                  </div>
                  <div className="text-3xl font-bold mb-2" style={{ color }}>
                    {ej.toFixed(1)}
                    <span className="text-lg ml-1 text-gray-500">EJ</span>
                  </div>
                  <div className="text-2xl font-semibold text-gray-600">
                    {share.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">of fossil energy</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clean Energy Breakdown */}
        <div className="metric-card mb-8 bg-white">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Clean Energy Breakdown for {year}
            </h2>
            <ChartExportButtons
              onDownloadPNG={downloadCleanBreakdownPNG}
              onDownloadCSV={downloadCleanBreakdownCSV}
            />
          </div>

          <div className="mb-6" ref={cleanBreakdownChartRef}>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={cleanSources.map(([source, ej]) => ({
                    name: getSourceName(source),
                    value: ej,
                    percentage: (ej / clean_useful_ej) * 100
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={(entry) => `${entry.name}: ${entry.value.toFixed(1)} EJ (${entry.percentage.toFixed(1)}%)`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {cleanSources.map(([source], index) => (
                    <Cell key={`cell-${index}`} fill={ENERGY_COLORS[source]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="text-xs text-gray-500 text-center mt-2">
              Data sources: Our World in Data, BP Statistical Review
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {cleanSources.map(([source, ej]) => {
              const share = (ej / clean_useful_ej) * 100;
              const color = ENERGY_COLORS[source];

              return (
                <div
                  key={source}
                  className="p-3 bg-gray-50 rounded-lg border-t-4 text-center"
                  style={{ borderTopColor: color }}
                >
                  <div
                    className="text-xs font-bold mb-1 uppercase tracking-wide"
                    style={{ color }}
                  >
                    {getSourceName(source)}
                  </div>
                  <div className="text-2xl font-bold mb-1" style={{ color }}>
                    {ej.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500 mb-1">EJ</div>
                  <div className="text-lg font-semibold text-gray-600">
                    {share.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {/* AI Chatbot */}
      <div className="mb-8">
        <AIChatbot />
      </div>
    </PageLayout>
  );
}

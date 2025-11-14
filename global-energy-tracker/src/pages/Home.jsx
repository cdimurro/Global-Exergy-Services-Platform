import { useState, useEffect, useRef } from 'react';
import { useWindowSize } from '@react-hook/window-size';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ENERGY_COLORS, getSourceName } from '../utils/colors';
import InteractiveChart from '../components/InteractiveChart';
import PageLayout from '../components/PageLayout';
import AIChatbot from '../components/AIChatbot';
import { downloadChartAsPNG, downloadDataAsCSV, ChartExportButtons } from '../utils/chartExport';

export default function Home() {
  const [width] = useWindowSize();  // Dynamic window size for responsive charts
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refs for charts - must be before conditional return
  const globalEnergyChartRef = useRef(null);
  const fossilBreakdownChartRef = useRef(null);
  const cleanBreakdownChartRef = useRef(null);

  useEffect(() => {
    fetch('/data/energy_services_timeseries.json')
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
    total_services_ej,
    fossil_services_ej,
    clean_services_ej,
    sources_services_ej
  } = data;

  // Calculate percentages dynamically for precision (don't use pre-rounded values from JSON)
  const fossil_services_share_percent = (fossil_services_ej / total_services_ej) * 100;
  const clean_services_share_percent = (clean_services_ej / total_services_ej) * 100;

  // Sort sources by energy amount
  const sortedSources = Object.entries(sources_services_ej)
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
    { name: 'Fossil Fuels', value: fossil_services_ej, percentage: fossil_services_share_percent },
    { name: 'Clean Energy', value: clean_services_ej, percentage: clean_services_share_percent }
  ];

  const COLORS = {
    'Fossil Fuels': '#DC2626',
    'Clean Energy': '#16A34A'
  };

  const renderCustomLabel = (entry) => {
    return `${entry.name}: ${entry.value.toFixed(1)} EJ (${entry.percentage.toFixed(2)}%)`;
  };

  // Download functions for Global Exergy Services chart
  const downloadGlobalEnergyPNG = () => {
    downloadChartAsPNG(globalEnergyChartRef, `global_exergy_services_${year}`);
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
      'Exergy Services (EJ)': ej.toFixed(2),
      'Share of Fossil (%)': ((ej / fossil_services_ej) * 100).toFixed(2)
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
      'Exergy Services (EJ)': ej.toFixed(2),
      'Share of Clean (%)': ((ej / clean_services_ej) * 100).toFixed(2)
    }));
    downloadDataAsCSV(csvData, `clean_energy_breakdown_${year}`);
  };

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-3">
          Global Exergy Services Platform
        </h1>
        <p className="text-sm text-gray-600">
          Tracking global energy services using exergy-weighted methodology: measuring thermodynamic work potential, not just energy flows.
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
            Global Exergy Services for {year}
          </h2>
          <ChartExportButtons
            onDownloadPNG={downloadGlobalEnergyPNG}
            onDownloadCSV={downloadGlobalEnergyCSV}
          />
        </div>

        {/* Total Display */}
        <div className="text-center mb-3 sm:mb-6">
          <div className="text-2xl sm:text-4xl md:text-5xl font-bold mb-1 sm:mb-3 text-gray-900">
            {total_services_ej.toFixed(1)}
            <span className="text-base sm:text-2xl md:text-3xl ml-1 sm:ml-2 text-gray-500">EJ</span>
          </div>
          <div className="text-[10px] sm:text-sm md:text-base text-gray-500 px-2">
            Exajoules of exergy services (thermodynamic work potential) delivered globally
          </div>
        </div>

        {/* Pie Chart */}
        <div className="mb-3 sm:mb-6" ref={globalEnergyChartRef}>
          <ResponsiveContainer width="100%" height={width < 640 ? 280 : 350}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={width >= 640}
                  label={width >= 640 ? (entry) => `${entry.name}: ${entry.value.toFixed(1)} EJ (${entry.percentage.toFixed(2)}%)` : (entry) => `${entry.value.toFixed(0)} EJ`}
                  outerRadius={width >= 640 ? 120 : width >= 414 ? 70 : 60}
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
              <div className="text-lg sm:text-2xl md:text-4xl font-bold mb-1 sm:mb-2 text-gray-900">
                {fossil_services_ej.toFixed(1)}
                <span className="text-xs sm:text-lg md:text-2xl ml-1 text-gray-500">EJ</span>
              </div>
              <div className="text-base sm:text-2xl md:text-3xl font-bold text-red-600 mb-1 sm:mb-2">
                {fossil_services_share_percent.toFixed(2)}%
              </div>
              <div className="text-[10px] sm:text-sm text-gray-500">of total exergy services</div>
            </div>

            {/* Clean Card */}
            <div className="p-3 sm:p-5 bg-green-50 rounded-lg border-l-4 border-green-600">
              <div className="text-green-600 text-xs sm:text-base mb-1 sm:mb-3 uppercase tracking-wide font-semibold">
                Clean Energy
              </div>
              <div className="text-lg sm:text-2xl md:text-4xl font-bold mb-1 sm:mb-2 text-gray-900">
                {clean_services_ej.toFixed(1)}
                <span className="text-xs sm:text-lg md:text-2xl ml-1 text-gray-500">EJ</span>
              </div>
              <div className="text-base sm:text-2xl md:text-3xl font-bold text-green-600 mb-1 sm:mb-2">
                {clean_services_share_percent.toFixed(2)}%
              </div>
              <div className="text-[10px] sm:text-sm text-gray-500">of total exergy services</div>
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
            <ResponsiveContainer width="100%" height={width < 640 ? 280 : 350}>
              <PieChart>
                <Pie
                  data={fossilSources.map(([source, ej]) => ({
                    name: getSourceName(source),
                    value: ej,
                    percentage: (ej / fossil_services_ej) * 100
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={width >= 640}
                  label={width >= 640 ? (entry) => `${entry.name}: ${entry.value.toFixed(1)} EJ (${entry.percentage.toFixed(2)}%)` : (entry) => `${entry.value.toFixed(0)} EJ`}
                  outerRadius={width >= 640 ? 120 : width >= 414 ? 70 : 60}
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
              const share = (ej / fossil_services_ej) * 100;
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
                    {share.toFixed(2)}%
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
            <ResponsiveContainer width="100%" height={width < 640 ? 280 : 350}>
              <PieChart>
                <Pie
                  data={cleanSources.map(([source, ej]) => ({
                    name: getSourceName(source),
                    value: ej,
                    percentage: (ej / clean_services_ej) * 100
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={width >= 640}
                  label={width >= 640 ? (entry) => `${entry.name}: ${entry.value.toFixed(1)} EJ (${entry.percentage.toFixed(2)}%)` : (entry) => `${entry.value.toFixed(0)} EJ`}
                  outerRadius={width >= 640 ? 120 : width >= 414 ? 70 : 60}
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
              const share = (ej / clean_services_ej) * 100;
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
                    {share.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {/* Understanding Exergy Services */}
      <div className="metric-card bg-white mb-8 border-2 border-blue-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Understanding Exergy Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              What Are Exergy Services?
            </h3>
            <p className="text-gray-700">
              Exergy services measure the thermodynamic work potential of energy, weighted by quality.
              This captures the actual benefits society receives—heating, mobility, manufacturing—using consistent energy units (EJ).
              Unlike primary energy, exergy services account for both efficiency AND quality of energy.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Why Exergy Weighting Matters
            </h3>
            <p className="text-gray-700">
              Not all energy is equal. 1 EJ of electricity (exergy factor 1.0) can do more useful work than 1 EJ of low-temperature heat (exergy factor 0.12).
              Traditional metrics ignore this quality difference, creating a misleading picture where fossil fuels appear more important than they actually are.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Electrification Advantage
            </h3>
            <p className="text-gray-700">
              Electric technologies (heat pumps, EVs, induction furnaces) are 2-3× more efficient AND deliver higher exergy (quality).
              This dual advantage means electrification can provide the same services with 60-75% less primary energy.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Efficiency Gains
            </h3>
            <p className="text-gray-700">
              Since 1990, global GDP tripled while exergy services grew only by 80% due to efficiency improvements.
              Better insulation, LED lighting, and efficient motors cut primary energy consumption by 30-50% without sacrificing quality of life.
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

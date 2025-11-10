import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ENERGY_COLORS, getSourceName } from '../utils/colors';
import InteractiveChart from '../components/InteractiveChart';
import PageLayout from '../components/PageLayout';
import AIChatbot from '../components/AIChatbot';

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Force scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

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

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-3">
          Global Energy Services Tracker
        </h1>
        <p className="text-sm text-gray-600">
          Get a complete view of the energy system and gain valuable insights by measuring energy services instead of primary energy.
        </p>
      </div>

      {/* Interactive Chart Explorer */}
      <div className="mb-8">
        <InteractiveChart />
      </div>

      {/* Global Energy Services */}
      <div className="metric-card mb-8 bg-white">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
          Global Energy Services for {year}
        </h2>

        {/* Total Display */}
        <div className="text-center mb-6">
          <div className="text-5xl font-bold mb-3 text-gray-900">
            {total_useful_ej.toFixed(1)}
            <span className="text-3xl ml-2 text-gray-500">EJ</span>
          </div>
          <div className="text-base text-gray-500">
            Exajoules of useful energy delivered globally
          </div>
        </div>

        {/* Pie Chart */}
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={renderCustomLabel}
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
          </div>

          {/* Fossil vs Clean Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fossil Card */}
            <div className="p-5 bg-red-50 rounded-lg border-l-4 border-red-600">
              <div className="text-red-600 text-base mb-3 uppercase tracking-wide font-semibold">
                Fossil Fuels
              </div>
              <div className="text-4xl font-bold mb-2 text-gray-900">
                {fossil_useful_ej.toFixed(1)}
                <span className="text-2xl ml-1 text-gray-500">EJ</span>
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">
                {fossil_share_percent.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">of total energy services</div>
            </div>

            {/* Clean Card */}
            <div className="p-5 bg-green-50 rounded-lg border-l-4 border-green-600">
              <div className="text-green-600 text-base mb-3 uppercase tracking-wide font-semibold">
                Clean Energy
              </div>
              <div className="text-4xl font-bold mb-2 text-gray-900">
                {clean_useful_ej.toFixed(1)}
                <span className="text-2xl ml-1 text-gray-500">EJ</span>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {clean_share_percent.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">of total energy services</div>
            </div>
          </div>
        </div>

        {/* Fossil Fuel Breakdown */}
        <div className="metric-card mb-8 bg-white">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
            Fossil Fuel Breakdown for {year}
          </h2>

          <div className="mb-6">
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
          <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
            Clean Energy Breakdown for {year}
          </h2>

          <div className="mb-6">
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

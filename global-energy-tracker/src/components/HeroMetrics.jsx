import { formatEJ, formatPercent, formatChange } from '../utils/formatters';
import { ENERGY_COLORS, getSourceName } from '../utils/colors';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import InteractiveChart from './InteractiveChart';
import DisplacementTracker from './DisplacementTracker';
import NetChangeTimeline from './NetChangeTimeline';
import ParameterStatusTable from './ParameterStatusTable';

export default function HeroMetrics({ data }) {
  if (!data) return null;

  const {
    year,
    total_useful_ej,
    fossil_useful_ej,
    clean_useful_ej,
    fossil_share_percent,
    clean_share_percent,
    sources_useful_ej
  } = data;

  // Map to expected variable names
  const fossil_share_pct = fossil_share_percent;
  const clean_share_pct = clean_share_percent;

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
    { name: 'Fossil Fuels', value: fossil_useful_ej, percentage: fossil_share_pct },
    { name: 'Clean Energy', value: clean_useful_ej, percentage: clean_share_pct }
  ];

  const COLORS = {
    'Fossil Fuels': '#DC2626', // red-600
    'Clean Energy': '#16A34A'  // green-600
  };

  const renderCustomLabel = (entry) => {
    return `${entry.name}: ${entry.value.toFixed(1)} EJ (${entry.percentage.toFixed(1)}%)`;
  };

  return (
    <div className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Interactive Chart Explorer */}
        <div className="mb-16">
          <InteractiveChart />
        </div>

        {/* Displacement Tracking Section */}
        <DisplacementTracker />

        {/* Net Change Timeline */}
        <NetChangeTimeline />

        {/* Parameter Status Table */}
        <ParameterStatusTable />

        {/* Section 1: Global Energy Services for 2024 (Fossil vs Clean) */}
        <div className="metric-card mb-16 bg-white">
          <h2 className="text-3xl font-bold mb-8 text-gray-800 text-center">
            Global Energy Services for {year}
          </h2>

          {/* Total Display */}
          <div className="text-center mb-8">
            <div className="text-7xl font-bold mb-4 text-gray-900">
              {total_useful_ej.toFixed(1)}
              <span className="text-4xl ml-4 text-gray-500">EJ</span>
            </div>
            <div className="text-lg text-gray-500">
              Exajoules of useful energy delivered globally
            </div>
          </div>

          {/* Pie Chart */}
          <div className="mb-8">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={renderCustomLabel}
                  outerRadius={140}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Fossil Card */}
            <div className="p-6 bg-red-50 rounded-lg border-l-4 border-red-600">
              <div className="text-red-600 text-xl mb-4 uppercase tracking-wide font-semibold">
                Fossil Fuels
              </div>
              <div className="text-6xl font-bold mb-2 text-gray-900">
                {fossil_useful_ej.toFixed(1)}
                <span className="text-3xl ml-2 text-gray-500">EJ</span>
              </div>
              <div className="text-4xl font-bold text-red-600 mb-2">
                {fossil_share_pct.toFixed(1)}%
              </div>
              <div className="text-lg text-gray-500">of total energy services</div>
            </div>

            {/* Clean Card */}
            <div className="p-6 bg-green-50 rounded-lg border-l-4 border-green-600">
              <div className="text-green-600 text-xl mb-4 uppercase tracking-wide font-semibold">
                Clean Energy
              </div>
              <div className="text-6xl font-bold mb-2 text-gray-900">
                {clean_useful_ej.toFixed(1)}
                <span className="text-3xl ml-2 text-gray-500">EJ</span>
              </div>
              <div className="text-4xl font-bold text-green-600 mb-2">
                {clean_share_pct.toFixed(1)}%
              </div>
              <div className="text-lg text-gray-500">of total energy services</div>
            </div>
          </div>
        </div>

        {/* Section 2: Fossil Fuel Breakdown for 2024 */}
        <div className="metric-card mb-16 bg-white">
          <h2 className="text-3xl font-bold mb-8 text-gray-800 text-center">
            Fossil Fuel Breakdown for {year}
          </h2>

          {/* Pie Chart for Fossil Fuels */}
          <div className="mb-8">
            <ResponsiveContainer width="100%" height={400}>
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
                  outerRadius={140}
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

          {/* Individual Source Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {fossilSources.map(([source, ej]) => {
              const share = (ej / fossil_useful_ej) * 100;
              const color = ENERGY_COLORS[source];

              return (
                <div
                  key={source}
                  className="p-6 bg-gray-50 rounded-lg border-l-4 hover:shadow-lg transition-shadow"
                  style={{ borderLeftColor: color }}
                >
                  <div
                    className="text-2xl font-bold mb-3 uppercase tracking-wide"
                    style={{ color }}
                  >
                    {getSourceName(source)}
                  </div>
                  <div className="text-5xl font-bold mb-2" style={{ color }}>
                    {ej.toFixed(1)}
                    <span className="text-2xl ml-2 text-gray-500">EJ</span>
                  </div>
                  <div className="text-3xl font-semibold text-gray-600">
                    {share.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">of fossil fuel energy</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Clean Energy Breakdown for 2024 */}
        <div className="metric-card bg-white">
          <h2 className="text-3xl font-bold mb-8 text-gray-800 text-center">
            Clean Energy Breakdown for {year}
          </h2>

          {/* Pie Chart for Clean Energy */}
          <div className="mb-8">
            <ResponsiveContainer width="100%" height={400}>
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
                  outerRadius={140}
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

          {/* Individual Source Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {cleanSources.map(([source, ej]) => {
              const share = (ej / clean_useful_ej) * 100;
              const color = ENERGY_COLORS[source];

              return (
                <div
                  key={source}
                  className="p-4 bg-gray-50 rounded-lg border-t-4 hover:shadow-lg transition-shadow text-center"
                  style={{ borderTopColor: color }}
                >
                  <div
                    className="text-lg font-bold mb-2 uppercase tracking-wide"
                    style={{ color }}
                  >
                    {getSourceName(source)}
                  </div>
                  <div className="text-3xl font-bold mb-1" style={{ color }}>
                    {ej.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">EJ</div>
                  <div className="text-xl font-semibold text-gray-600">
                    {share.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">of clean energy</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

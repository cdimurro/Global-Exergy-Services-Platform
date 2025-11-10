import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ENERGY_COLORS, getSourceName } from '../utils/colors';

const ENERGY_SOURCES = ['coal', 'oil', 'gas', 'nuclear', 'hydro', 'wind', 'solar', 'biomass', 'geothermal', 'other'];

export default function HistoricalTrends({ data }) {
  if (!data || !data.data || data.data.length === 0) return null;

  // Transform data for the chart
  const chartData = data.data.map(yearData => ({
    year: yearData.year,
    coal: yearData.sources_useful_ej.coal || 0,
    oil: yearData.sources_useful_ej.oil || 0,
    gas: yearData.sources_useful_ej.gas || 0,
    nuclear: yearData.sources_useful_ej.nuclear || 0,
    hydro: yearData.sources_useful_ej.hydro || 0,
    wind: yearData.sources_useful_ej.wind || 0,
    solar: yearData.sources_useful_ej.solar || 0,
    biomass: yearData.sources_useful_ej.biomass || 0,
    geothermal: yearData.sources_useful_ej.geothermal || 0,
    other: yearData.sources_useful_ej.other || 0,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;

    const total = payload.reduce((sum, entry) => sum + entry.value, 0);

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <div className="font-bold text-lg mb-2">{label}</div>
        <div className="text-sm font-semibold mb-2">Total: {total.toFixed(1)} EJ</div>
        <div className="space-y-1">
          {payload
            .filter(entry => entry.value > 0)
            .sort((a, b) => b.value - a.value)
            .map((entry, index) => {
              const percentage = ((entry.value / total) * 100).toFixed(1);
              return (
                <div key={index} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm">{getSourceName(entry.name)}</span>
                  </div>
                  <span className="text-sm font-medium">{entry.value.toFixed(1)} EJ ({percentage}%)</span>
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  return (
    <div className="py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-gray-800">Historical Trends</h2>
          <p className="text-xl text-gray-600">
            Global useful energy services by source (1965-2024)
          </p>
        </div>

        <div className="metric-card">
          <ResponsiveContainer width="100%" height={700}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 40, left: 20, bottom: 20 }}
            >
              <defs>
                {ENERGY_SOURCES.map(source => (
                  <linearGradient key={source} id={`color-${source}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ENERGY_COLORS[source]} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={ENERGY_COLORS[source]} stopOpacity={0.3} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 15 }}
                interval="preserveStartEnd"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 15 }}
                width={80}
                label={{ value: 'Useful Energy (EJ)', angle: -90, position: 'insideLeft', style: { fontSize: 17, fontWeight: 600 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '15px', paddingTop: '25px' }}
                formatter={(value) => getSourceName(value)}
                iconSize={18}
              />
              {ENERGY_SOURCES.map(source => (
                <Area
                  key={source}
                  type="monotone"
                  dataKey={source}
                  stackId="1"
                  stroke={ENERGY_COLORS[source]}
                  fill={`url(#color-${source})`}
                  fillOpacity={1}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}

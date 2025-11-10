import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ENERGY_COLORS, getSourceName } from '../utils/colors';

const ENERGY_SOURCES = ['coal', 'oil', 'gas', 'nuclear', 'hydro', 'wind', 'solar', 'biomass', 'geothermal', 'other'];

export default function FFGrowthChart() {
  const [energyData, setEnergyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSources, setSelectedSources] = useState(['fossil', 'clean']);

  useEffect(() => {
    // Load the main energy data to calculate year-over-year changes
    fetch('/data/useful_energy_timeseries.json')
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

  // Calculate year-over-year changes for each source
  const timeseries = energyData.data;
  const changeData = [];

  for (let i = 1; i < timeseries.length; i++) {
    const prev = timeseries[i - 1];
    const curr = timeseries[i];

    const yearChange = {
      year: curr.year,
      fossil: curr.fossil_useful_ej - prev.fossil_useful_ej,
      clean: curr.clean_useful_ej - prev.clean_useful_ej,
      fossil_pct: prev.fossil_useful_ej > 0 ? ((curr.fossil_useful_ej - prev.fossil_useful_ej) / prev.fossil_useful_ej) * 100 : 0,
      clean_pct: prev.clean_useful_ej > 0 ? ((curr.clean_useful_ej - prev.clean_useful_ej) / prev.clean_useful_ej) * 100 : 0,
    };

    // Add individual sources with both absolute and percentage change
    ENERGY_SOURCES.forEach(source => {
      const prevValue = prev.sources_useful_ej[source] || 0;
      const currValue = curr.sources_useful_ej[source] || 0;
      yearChange[source] = currValue - prevValue;
      yearChange[`${source}_pct`] = prevValue > 0 ? ((currValue - prevValue) / prevValue) * 100 : 0;
    });

    changeData.push(yearChange);
  }

  // Filter options
  const filterOptions = [
    { key: 'fossil', label: 'Fossil Fuels', color: '#DC2626' },
    { key: 'clean', label: 'Clean Energy', color: '#16A34A' },
    ...ENERGY_SOURCES.map(source => ({
      key: source,
      label: getSourceName(source),
      color: ENERGY_COLORS[source]
    }))
  ];

  const toggleSource = (sourceKey) => {
    setSelectedSources(prev =>
      prev.includes(sourceKey)
        ? prev.filter(s => s !== sourceKey)
        : [...prev, sourceKey]
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const currentYear = changeData.find(d => d.year === label);
    if (!currentYear) return null;

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <div className="font-bold text-lg mb-2">{label}</div>
        <div className="space-y-1 text-sm">
          {payload.map((entry, index) => {
            const sourceKey = entry.dataKey;
            const pctKey = `${sourceKey}_pct`;
            const pctValue = currentYear[pctKey];

            return (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span>{entry.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {entry.value > 0 ? '+' : ''}{entry.value.toFixed(2)} EJ
                  </div>
                  {pctValue !== undefined && (
                    <div className="text-xs text-gray-500">
                      Relative Change: {pctValue > 0 ? '+' : ''}{pctValue.toFixed(1)}%
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

  // Calculate min/max for Y-axis
  const allValues = changeData.flatMap(d =>
    selectedSources.map(source => d[source] || 0)
  );
  const maxAbs = Math.max(Math.abs(Math.min(...allValues)), Math.abs(Math.max(...allValues)));
  const yAxisMax = Math.ceil(maxAbs * 1.1); // 10% padding
  const yAxisMin = -yAxisMax;

  return (
    <div className="py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-gray-800">Annual Change in Energy Services</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Year-over-year change in useful energy services by source
          </p>
        </div>

        {/* Filter buttons */}
        <div className="mb-8">
          <div className="text-lg font-semibold mb-4 text-gray-700">Select sources to display:</div>
          <div className="flex flex-wrap gap-3">
            {filterOptions.map(option => (
              <button
                key={option.key}
                onClick={() => toggleSource(option.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedSources.includes(option.key)
                    ? 'ring-2 ring-offset-2'
                    : 'opacity-50 hover:opacity-75'
                }`}
                style={{
                  backgroundColor: selectedSources.includes(option.key) ? option.color : '#f3f4f6',
                  color: selectedSources.includes(option.key) ? 'white' : '#374151',
                  ringColor: option.color
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="metric-card">
          <ResponsiveContainer width="100%" height={700}>
            <LineChart
              data={changeData}
              margin={{ top: 20, right: 40, left: 20, bottom: 20 }}
            >
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
                domain={[yAxisMin, yAxisMax]}
                label={{
                  value: 'Change in Energy Services (EJ)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 17, fontWeight: 600 }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '15px', paddingTop: '25px' }}
                iconSize={18}
              />
              <ReferenceLine y={0} stroke="#000" strokeWidth={2} />

              {/* Fossil line */}
              {selectedSources.includes('fossil') && (
                <Line
                  type="monotone"
                  dataKey="fossil"
                  stroke="#DC2626"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                  name="Fossil Fuels"
                />
              )}

              {/* Clean line */}
              {selectedSources.includes('clean') && (
                <Line
                  type="monotone"
                  dataKey="clean"
                  stroke="#16A34A"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                  name="Clean Energy"
                />
              )}

              {/* Individual source lines */}
              {ENERGY_SOURCES.map(source =>
                selectedSources.includes(source) && (
                  <Line
                    key={source}
                    type="monotone"
                    dataKey={source}
                    stroke={ENERGY_COLORS[source]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                    name={getSourceName(source)}
                  />
                )
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

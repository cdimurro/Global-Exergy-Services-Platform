import { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { ENERGY_COLORS, getSourceName } from '../utils/colors';

export default function Costs() {
  const [costData, setCostData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [scenario, setScenario] = useState('NZE');
  const [region, setRegion] = useState('Global');
  const [viewMode, setViewMode] = useState('lcoes'); // 'lcoes' or 'service_units'
  const [serviceUnit, setServiceUnit] = useState('home_heating_year');
  const [sccEnabled, setSccEnabled] = useState(false);
  const [sccLevel, setSccLevel] = useState('moderate');
  const [selectedSources, setSelectedSources] = useState(['solar', 'wind', 'nuclear', 'gas', 'coal']);
  const [chartMode, setChartMode] = useState('trends'); // 'trends' or 'regional'

  // Load cost data
  useEffect(() => {
    fetch('/data/full_system_costs.json')
      .then(res => res.json())
      .then(data => {
        setCostData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading cost data:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !costData) {
    return (
      <PageLayout
        title="Full System Costs"
        description="Loading comprehensive energy cost analysis..."
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading cost data...</div>
        </div>
      </PageLayout>
    );
  }

  const scenarios = Object.keys(costData.scenarios);
  const regions = Object.keys(costData.scenarios[scenario]?.regions || {});
  const sources = ['solar', 'wind', 'nuclear', 'gas', 'coal', 'hydro', 'oil', 'biofuels', 'other_renewables'];

  // Get timeseries data for selected scenario and region
  const timeseriesData = costData.scenarios[scenario]?.regions[region]?.timeseries || [];

  // Service unit options
  const serviceUnitOptions = timeseriesData[0]?.sources?.solar?.service_units || {};

  // Prepare chart data: System LCOES Trends over time
  const lcoesTrendsData = timeseriesData.map(yearData => {
    const point = { year: yearData.year };
    selectedSources.forEach(source => {
      if (yearData.sources[source]) {
        point[source] = yearData.sources[source].total_lcoes_mwh;
      }
    });
    return point;
  });

  // Prepare chart data: Cost breakdown for latest year (stacked bar)
  const latestYear = timeseriesData[timeseriesData.length - 1];
  const costBreakdownData = selectedSources.map(source => {
    const sourceData = latestYear?.sources?.[source];
    if (!sourceData) return null;

    return {
      source: getSourceName(source),
      sourceKey: source,
      'Base LCOE': sourceData.base_lcoe_mwh,
      'Firming': sourceData.system_costs?.firming || 0,
      'Storage': sourceData.system_costs?.storage || 0,
      'Grid': sourceData.system_costs?.grid || 0,
      'Capacity': sourceData.system_costs?.capacity || 0,
      total: sourceData.total_lcoes_mwh
    };
  }).filter(d => d !== null);

  // Prepare chart data: Regional comparison for current year
  const currentYear = 2030;
  const regionalData = [];
  if (costData.scenarios[scenario]) {
    Object.entries(costData.scenarios[scenario].regions).forEach(([regionName, regionData]) => {
      const yearData = regionData.timeseries.find(y => y.year === currentYear);
      if (yearData) {
        const dataPoint = { region: regionName };
        selectedSources.forEach(source => {
          if (yearData.sources[source]) {
            dataPoint[source] = yearData.sources[source].total_lcoes_mwh;
          }
        });
        regionalData.push(dataPoint);
      }
    });
  }

  // Prepare chart data: Service unit comparison
  const serviceUnitData = selectedSources.map(source => {
    const sourceData = latestYear?.sources?.[source];
    if (!sourceData) return null;

    const serviceData = sourceData.service_units?.[serviceUnit];
    return {
      source: getSourceName(source),
      sourceKey: source,
      value: serviceData?.value || 0,
      label: serviceData?.label || ''
    };
  }).filter(d => d !== null);

  return (
    <PageLayout
      title="Full System Costs"
      description="Comprehensive analysis of energy system costs including generation, integration, and external costs"
    >

      {/* Filters */}
      <div className="metric-card bg-white mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Analysis Settings</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Scenario */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Scenario
            </label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {scenarios.map(s => (
                <option key={s} value={s}>
                  {s} - {costData.scenarios[s].description}
                </option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* View Mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              View Mode
            </label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="lcoes">System LCOES ($/MWh)</option>
              <option value="service_units">Service Units</option>
            </select>
          </div>

          {/* Service Unit (if applicable) */}
          {viewMode === 'service_units' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Service Unit
              </label>
              <select
                value={serviceUnit}
                onChange={(e) => setServiceUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(serviceUnitOptions).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.description}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Social Cost of Carbon Toggle */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={sccEnabled}
                  onChange={(e) => setSccEnabled(e.target.checked)}
                  className="mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Include Social Cost of Carbon (SCC)
                </span>
              </label>
              <p className="text-xs text-gray-600 ml-8 mt-1">
                External costs from climate damages, health impacts, and environmental degradation
              </p>
            </div>

            {sccEnabled && (
              <select
                value={sccLevel}
                onChange={(e) => setSccLevel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="conservative">Conservative ($100/tCO2)</option>
                <option value="moderate">Moderate ($200/tCO2)</option>
                <option value="aggressive">Aggressive ($400/tCO2)</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Source Selection */}
      <div className="metric-card bg-white mb-8">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Energy Sources to Compare</h3>
        <div className="flex flex-wrap gap-3">
          {sources.map(source => (
            <label key={source} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedSources.includes(source)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedSources([...selectedSources, source]);
                  } else {
                    setSelectedSources(selectedSources.filter(s => s !== source));
                  }
                }}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">{getSourceName(source)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Chart 1: System LCOES Analysis (Combined Trends + Regional) */}
      <div className="metric-card bg-white mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {chartMode === 'trends' ? 'System LCOES Trends (2024-2050)' : 'Regional Cost Comparison (2030)'}
            </h3>
            <p className="text-sm text-gray-600">
              {chartMode === 'trends'
                ? 'How full system costs evolve over time for different energy sources'
                : 'How System LCOES varies by region due to labor, resources, and infrastructure'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setChartMode('trends')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                chartMode === 'trends'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Time Trends
            </button>
            <button
              onClick={() => setChartMode('regional')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                chartMode === 'regional'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Regional
            </button>
          </div>
        </div>

        {chartMode === 'trends' ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={lcoesTrendsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis label={{ value: '$/MWh', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                formatter={(value) => `$${value}/MWh`}
              />
              <Legend />
              {selectedSources.map(source => (
                <Line
                  key={source}
                  type="monotone"
                  dataKey={source}
                  name={getSourceName(source)}
                  stroke={ENERGY_COLORS[source]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={regionalData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis type="number" label={{ value: '$/MWh', position: 'insideBottom', offset: -5 }} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="region" tick={{ fontSize: 11 }} width={120} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                formatter={(value) => `$${value}/MWh`}
              />
              <Legend />
              {selectedSources.map(source => (
                <Bar
                  key={source}
                  dataKey={source}
                  name={getSourceName(source)}
                  fill={ENERGY_COLORS[source]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart 2: Cost Breakdown (Stacked Bar) */}
      <div className="metric-card bg-white mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          Full System Cost Breakdown ({latestYear?.year})
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Base LCOE plus system integration costs (firming, storage, grid, capacity)
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={costBreakdownData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="source" tick={{ fontSize: 12 }} />
            <YAxis label={{ value: '$/MWh', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
              formatter={(value) => `$${value}/MWh`}
            />
            <Legend />
            <Bar dataKey="Base LCOE" stackId="a" fill="#3498DB" />
            <Bar dataKey="Firming" stackId="a" fill="#E74C3C" />
            <Bar dataKey="Storage" stackId="a" fill="#F39C12" />
            <Bar dataKey="Grid" stackId="a" fill="#9B59B6" />
            <Bar dataKey="Capacity" stackId="a" fill="#16A085" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 text-xs text-gray-600">
          <strong>Note:</strong> Negative values indicate grid stability benefits (e.g., nuclear at high VRE penetration)
        </div>
      </div>

      {/* Chart 3: Service Unit Comparison */}
      {viewMode === 'service_units' && (
        <div className="metric-card bg-white mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Real-World Service Cost Comparison ({latestYear?.year})
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {serviceUnitOptions[serviceUnit]?.description || 'Cost per service unit'}
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={serviceUnitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="source" tick={{ fontSize: 12 }} />
              <YAxis
                label={{ value: serviceUnitData[0]?.label || '', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                formatter={(value) => `$${value.toFixed(2)}`}
              />
              <Bar dataKey="value">
                {serviceUnitData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={ENERGY_COLORS[entry.sourceKey]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Educational Cards */}
      <div className="metric-card bg-white mb-8 border-2 border-blue-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Key Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: The Fossil Fuel Trap */}
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-600">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              The Fossil Fuel Trap
            </h3>
            <p className="text-gray-700 text-sm leading-relaxed mb-3">
              Fossil fuels appear cheap today, but their true costs are hidden. Coal and gas plants require:
            </p>
            <ul className="text-gray-700 text-sm space-y-1 ml-5 mb-3 list-disc">
              <li><strong>Fuel costs</strong> that rise with demand and depletion</li>
              <li><strong>Carbon pricing</strong> increasing globally ($50-200/tCO2)</li>
              <li><strong>Health externalities</strong> from air pollution ($100B+ annually)</li>
              <li><strong>Climate damages</strong> from emissions ($200-400/tCO2 SCC)</li>
            </ul>
            <p className="text-gray-700 text-sm leading-relaxed">
              <strong>Result:</strong> By 2050, coal reaches $400+/MWh and gas becomes uncompetitive as a peaker at $300+/MWh in high-VRE grids.
            </p>
          </div>

          {/* Card 2: The Electrification Advantage */}
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-600">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              The Electrification Advantage
            </h3>
            <p className="text-gray-700 text-sm leading-relaxed mb-3">
              Switching from fossil fuels to clean electricity unlocks massive savings:
            </p>
            <ul className="text-gray-700 text-sm space-y-1 ml-5 mb-3 list-disc">
              <li><strong>Home heating:</strong> Heat pumps 3-4× more efficient than gas furnaces</li>
              <li><strong>Transportation:</strong> EVs 3-5× more efficient than gas cars</li>
              <li><strong>Industry:</strong> Electric arc furnaces beat coal for steel</li>
            </ul>
            <p className="text-gray-700 text-sm leading-relaxed">
              <strong>Example:</strong> Heating a home with solar electricity costs ~$1,600/year in 2050. With gas? $3,800/year. Clean electricity wins by 2.4×.
            </p>
          </div>

          {/* Card 3: The Renewable Cost Edge */}
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-600">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              The Renewable Cost Edge
            </h3>
            <p className="text-gray-700 text-sm leading-relaxed mb-3">
              Solar and wind have <strong>zero fuel costs</strong>, so their economics improve over time:
            </p>
            <ul className="text-gray-700 text-sm space-y-1 ml-5 mb-3 list-disc">
              <li><strong>Base LCOE</strong> falls 40-60% from 2024-2050</li>
              <li><strong>System costs</strong> rise at high VRE but remain manageable with storage, grids, and nuclear</li>
              <li><strong>Learning curves</strong> continue: every doubling of capacity → 20% cost reduction</li>
            </ul>
            <p className="text-gray-700 text-sm leading-relaxed">
              <strong>Result:</strong> By 2050 NZE, solar and wind deliver full system LCOES of $130-165/MWh, beating all fossil fuels.
            </p>
          </div>

          {/* Card 4: What You Can Do */}
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-600">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              What You Can Do
            </h3>
            <p className="text-gray-700 text-sm leading-relaxed mb-3">
              Individual and policy actions accelerate the clean energy transition:
            </p>
            <ul className="text-gray-700 text-sm space-y-1 ml-5 mb-3 list-disc">
              <li><strong>Electrify your home:</strong> Heat pump, induction stove, solar panels</li>
              <li><strong>Drive electric:</strong> EVs save $500-1,500/year on fuel + maintenance</li>
              <li><strong>Support policy:</strong> Carbon pricing, clean energy subsidies, grid upgrades</li>
              <li><strong>Invest wisely:</strong> Divest from fossil fuels, back renewable infrastructure</li>
            </ul>
            <p className="text-gray-700 text-sm leading-relaxed">
              <strong>Impact:</strong> Every action reduces demand for fossil fuels and accelerates cost declines for clean energy.
            </p>
          </div>
        </div>
      </div>

      {/* Methodology Note */}
      <div className="metric-card bg-white mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Methodology & Data Sources</h3>
        <p className="text-sm text-gray-700 leading-relaxed mb-3">
          This analysis uses the world's most comprehensive public dataset on full system energy costs. We calculate not just
          generation costs (LCOE), but the complete System LCOES including firming, storage, grid infrastructure, and capacity adequacy.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
          <div>
            <strong>Base LCOE Sources:</strong>
            <ul className="ml-4 mt-1 list-disc">
              <li>Lazard LCOE 2025</li>
              <li>BNEF New Energy Outlook 2025</li>
              <li>IEA World Energy Outlook 2024</li>
            </ul>
          </div>
          <div>
            <strong>System Costs Sources:</strong>
            <ul className="ml-4 mt-1 list-disc">
              <li>NREL Cambium 2024</li>
              <li>RMI Clean Energy Portfolio 2024</li>
              <li>MIT Energy Initiative 2024</li>
            </ul>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

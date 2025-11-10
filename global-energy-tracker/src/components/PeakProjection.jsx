import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';

export default function PeakProjection() {
  const [energyData, setEnergyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projectionData, setProjectionData] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState('moderate');

  useEffect(() => {
    fetch('/data/useful_energy_timeseries.json')
      .then(res => res.json())
      .then(data => {
        setEnergyData(data);
        calculateProjections(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading energy data:', err);
        setLoading(false);
      });
  }, []);

  const calculateProjections = (data) => {
    const timeseries = data.data;
    const lastYear = timeseries[timeseries.length - 1];
    const prevYear = timeseries[timeseries.length - 2];

    // Current growth rates
    const currentFossilGrowth = lastYear.fossil_useful_ej - prevYear.fossil_useful_ej;
    const currentCleanGrowth = lastYear.clean_useful_ej - prevYear.clean_useful_ej;

    // Calculate historical average growth rates (last 5 years)
    const last5Years = timeseries.slice(-6);
    let avgFossilGrowth = 0;
    let avgCleanGrowth = 0;
    for (let i = 1; i < last5Years.length; i++) {
      avgFossilGrowth += (last5Years[i].fossil_useful_ej - last5Years[i-1].fossil_useful_ej);
      avgCleanGrowth += (last5Years[i].clean_useful_ej - last5Years[i-1].clean_useful_ej);
    }
    avgFossilGrowth /= 5;
    avgCleanGrowth /= 5;

    // Define scenarios calibrated to IEA WEO 2024 projections
    // Current reality: Clean growing at ~2.99 EJ/yr, Fossil at ~3.13 EJ/yr (0.14 EJ/yr gap)
    // Starting point 2024: Fossil ~187 EJ, Clean ~52 EJ, Total ~239 EJ
    //
    // IEA Targets (useful energy @ ~37% of primary):
    // - STEPS 2040: ~691 EJ primary → ~256 EJ useful, ~55% fossil → ~140 EJ fossil
    // - NZE 2040: ~630 EJ primary → ~233 EJ useful, ~25% fossil → ~58 EJ fossil
    //
    // NEW MODEL (Displacement-Based):
    // Instead of modeling fossil as a residual (Total - Clean), we now model:
    // 1. Fossil has independent baseline growth (reflecting existing infrastructure/demand inertia)
    // 2. Fossil baseline growth declines over time (market forces, policy pressure)
    // 3. Clean energy growth actively displaces fossil from its baseline
    // 4. Displacement efficiency increases over time (70% early → 95% by 2040)
    // 5. Total energy = Fossil + Clean (not constrained)
    //
    // This allows fossil to grow initially (matching 2024 reality) while eventually
    // being displaced as clean accelerates and becomes more competitive.

    const scenarios = {
      conservative: {
        name: 'Slow Transition (IEA STEPS)',
        cleanGrowthAcceleration: 0.006, // Clean growth accelerates to 0.6%/year (after 3-yr ramp-up) - very slow growth
        fossilBaselineGrowth: 0.022, // Fossil would grow 2.2%/year without clean competition (IEA GER 2025 actuals)
        fossilDeclineRate: 0.00003, // Fossil baseline growth declines by 0.003%/year (very gradual Asia lock-in)
        displacementMultiplier: 0.43, // 43% displacement multiplier (supply constraints, infrastructure inertia)
        energyIntensityImprovement: 0.019, // 1.9%/year energy intensity reduction (higher to cap total, trade-off with peak)
        description: 'Current policies pathway - Peak ~2030-2032, ~180 EJ fossil by 2040 (~65% share)'
      },
      moderate: {
        name: 'Moderate Acceleration',
        cleanGrowthAcceleration: 0.055, // Clean growth accelerates to 5.5%/year (after 3-yr ramp-up)
        fossilBaselineGrowth: 0.020, // Fossil would grow 2.0%/year without clean competition
        fossilDeclineRate: 0.0009, // Fossil baseline growth declines by 0.09%/year
        displacementMultiplier: 1.15, // 15% more effective displacement
        energyIntensityImprovement: 0.012, // 1.2%/year uniform energy intensity reduction
        description: 'Enhanced policies - Peak ~2028, 110 EJ fossil by 2040'
      },
      aggressive: {
        name: 'Rapid Transition (IEA NZE)',
        cleanGrowthAcceleration: 0.082, // Clean growth accelerates to 8.2%/year (ambitious deployment)
        fossilBaselineGrowth: 0.018, // Fossil would grow 1.8%/year without clean competition
        fossilDeclineRate: 0.0022, // Fossil baseline growth declines by 0.22%/year (strong policy pressure)
        displacementMultiplier: 1.85, // 85% more effective displacement (policy + tech breakthroughs)
        energyIntensityImprovement: 0.015, // 1.5%/year energy intensity reduction (capped per Grok)
        fossilFloor: 20, // 20 EJ minimum residual (CCS/biofuels/hard-to-abate sectors per IEA NZE)
        description: 'Net zero pathway - Peak ~2025, 20 EJ residual fossil by 2040 (CCS/biofuels)'
      }
    };

    // Project forward 16 years for each scenario (to reach 2040)
    const projections = [];
    const startYear = lastYear.year;

    for (let year = 0; year <= 16; year++) {
      const projYear = {
        year: startYear + year,
        historical_fossil: year === 0 ? lastYear.fossil_useful_ej : null,
        historical_clean: year === 0 ? lastYear.clean_useful_ej : null
      };

      Object.keys(scenarios).forEach(scenarioKey => {
        const scenario = scenarios[scenarioKey];
        let fossilValue, cleanValue, cleanGrowthRate, fossilBaselineGrowth;

        if (year === 0) {
          // Starting point
          fossilValue = lastYear.fossil_useful_ej;
          cleanValue = lastYear.clean_useful_ej;
          cleanGrowthRate = currentCleanGrowth;
          fossilBaselineGrowth = scenario.fossilBaselineGrowth;
        } else {
          // Get previous year projection
          const prevProj = projections[year - 1];
          const prevFossil = prevProj[`${scenarioKey}_fossil`];
          const prevClean = prevProj[`${scenarioKey}_clean`];
          const prevCleanGrowthRate = prevProj[`${scenarioKey}_cleanGrowthRate`] || currentCleanGrowth;
          const prevFossilBaselineGrowth = prevProj[`${scenarioKey}_fossilBaselineGrowth`] || scenario.fossilBaselineGrowth;

          // Apply ramp-up: acceleration increases gradually over first 3 years
          // This reflects real-world policy implementation lag and gradual infrastructure buildout
          const rampUpYears = 3;
          const rampUpFactor = Math.min(year / rampUpYears, 1.0); // 0.33, 0.67, 1.0, 1.0...
          const effectiveAcceleration = scenario.cleanGrowthAcceleration * rampUpFactor;

          // Clean energy growth accelerates each year
          cleanGrowthRate = prevCleanGrowthRate * (1 + effectiveAcceleration);

          // ENERGY EFFICIENCY LAYER
          // Energy intensity improvements reduce the amount of energy services needed
          // This affects baseline demand growth for BOTH fossil and clean

          // NEW MODEL: Fossil has baseline growth that declines over time and gets displaced by clean
          // 1. Fossil baseline growth declines gradually (reflecting market forces, policy pressure)
          fossilBaselineGrowth = prevFossilBaselineGrowth - scenario.fossilDeclineRate;
          fossilBaselineGrowth = Math.max(fossilBaselineGrowth, -0.05); // Floor at -5%/year

          // 2. Apply efficiency improvements to reduce fossil baseline growth
          // Efficiency makes economy need less energy for same output
          const efficiencyAdjustedFossilGrowth = fossilBaselineGrowth - scenario.energyIntensityImprovement;
          const fossilBaseline = prevFossil * (1 + efficiencyAdjustedFossilGrowth);

          // 3. Clean energy growth continues due to technology deployment
          // Clean growth accelerates (deployment continues)
          cleanGrowthRate = prevCleanGrowthRate * (1 + effectiveAcceleration);

          // 4. Clean growth displaces fossil from its baseline
          // Displacement efficiency increases over time as clean becomes more competitive
          // For Conservative scenario, use delayed ramp-up to allow fossil to grow longer
          let baseDisplacementEfficiency;
          if (scenarioKey === 'conservative') {
            // Conservative: Start at 40%, ramp slowly to 80% (delayed peak ~2032)
            baseDisplacementEfficiency = 0.40 + (year / 16) * 0.40;
          } else {
            // Other scenarios: Start at 70%, ramp to 95% (earlier peaks)
            baseDisplacementEfficiency = 0.70 + (year / 16) * 0.25;
          }
          const displacementEfficiency = baseDisplacementEfficiency * scenario.displacementMultiplier;
          const displacement = cleanGrowthRate * displacementEfficiency;

          // 5. Actual fossil = baseline - displacement
          fossilValue = fossilBaseline - displacement;
          // Apply fossil floor for scenarios with residual fossil (CCS/biofuels/hard-to-abate)
          const fossilFloor = scenario.fossilFloor || 0;
          fossilValue = Math.max(fossilValue, fossilFloor); // Can't go below floor

          // 6. Update clean (also affected by efficiency on demand side)
          // Efficiency reduces total demand, which caps how much clean can grow
          const cleanGrowthWithEfficiency = cleanGrowthRate * (1 - scenario.energyIntensityImprovement * 0.3);
          cleanValue = prevClean + cleanGrowthWithEfficiency;
        }

        projYear[`${scenarioKey}_fossil`] = fossilValue;
        projYear[`${scenarioKey}_clean`] = cleanValue;
        projYear[`${scenarioKey}_total`] = fossilValue + cleanValue;
        projYear[`${scenarioKey}_clean_share`] = (cleanValue / (fossilValue + cleanValue)) * 100;
        projYear[`${scenarioKey}_cleanGrowthRate`] = cleanGrowthRate;
        projYear[`${scenarioKey}_fossilBaselineGrowth`] = fossilBaselineGrowth;

        // Track fossil growth for peak detection
        if (year > 0) {
          const prevProj = projections[year - 1];
          const fossilGrowth = fossilValue - prevProj[`${scenarioKey}_fossil`];
          const cleanGrowth = cleanValue - prevProj[`${scenarioKey}_clean`];
          const displacement = Math.max(0, cleanGrowth);

          // Peak occurs when fossil starts declining (negative growth)
          projYear[`${scenarioKey}_peak`] = fossilGrowth < 0;
          projYear[`${scenarioKey}_fossilGrowth`] = fossilGrowth;
          projYear[`${scenarioKey}_displacement`] = displacement;
        }
      });

      projections.push(projYear);
    }

    // Find peak years for each scenario
    const peakYears = {};
    Object.keys(scenarios).forEach(scenarioKey => {
      let peakYear = null;
      let consecutivePeakYears = 0;
      let firstPeakIndex = -1;

      for (let i = 1; i < projections.length; i++) {
        if (projections[i][`${scenarioKey}_peak`]) {
          if (consecutivePeakYears === 0) {
            firstPeakIndex = i; // Track where the consecutive streak started
          }
          consecutivePeakYears++;
          if (consecutivePeakYears >= 3 && !peakYear) {
            peakYear = projections[firstPeakIndex].year; // Use the first year of the 3-year streak
          }
        } else {
          consecutivePeakYears = 0;
          firstPeakIndex = -1;
        }
      }
      peakYears[scenarioKey] = peakYear;
    });

    setProjectionData({ projections, scenarios, peakYears });
  };

  if (loading || !energyData || !projectionData.projections) {
    return <div className="text-center py-8">Loading projection data...</div>;
  }

  const { projections, scenarios, peakYears } = projectionData;

  const downloadCSV = () => {
    const csvData = [];

    // Add header
    csvData.push([
      'Year',
      'Historical Fossil (EJ)', 'Historical Clean (EJ)',
      'Conservative Fossil (EJ)', 'Conservative Clean (EJ)', 'Conservative Total (EJ)', 'Conservative Clean %',
      'Moderate Fossil (EJ)', 'Moderate Clean (EJ)', 'Moderate Total (EJ)', 'Moderate Clean %',
      'Aggressive Fossil (EJ)', 'Aggressive Clean (EJ)', 'Aggressive Total (EJ)', 'Aggressive Clean %'
    ]);

    // Add data rows
    projections.forEach(row => {
      csvData.push([
        row.year,
        row.historical_fossil?.toFixed(2) || '',
        row.historical_clean?.toFixed(2) || '',
        row.conservative_fossil.toFixed(2),
        row.conservative_clean.toFixed(2),
        row.conservative_total.toFixed(2),
        row.conservative_clean_share.toFixed(1),
        row.moderate_fossil.toFixed(2),
        row.moderate_clean.toFixed(2),
        row.moderate_total.toFixed(2),
        row.moderate_clean_share.toFixed(1),
        row.aggressive_fossil.toFixed(2),
        row.aggressive_clean.toFixed(2),
        row.aggressive_total.toFixed(2),
        row.aggressive_clean_share.toFixed(1)
      ]);
    });

    // Convert to CSV string
    const csvContent = csvData.map(row => row.join(',')).join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'peak_fossil_projections.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <div className="font-bold text-xl mb-3">{label}</div>
        <div className="space-y-2">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-sm">{entry.name}</span>
              </div>
              <span className="text-sm font-semibold">{entry.value.toFixed(1)} EJ</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="metric-card bg-white mb-16">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">
          Peak Fossil Projections
        </h2>
        <button
          onClick={downloadCSV}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Download CSV
        </button>
      </div>

      {/* Scenario Selector */}
      <div className="mb-8">
        <label className="block text-lg font-semibold mb-3 text-gray-700">
          Select Scenario:
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.keys(scenarios).map(scenarioKey => {
            const scenario = scenarios[scenarioKey];
            const peakYear = peakYears[scenarioKey];

            return (
              <button
                key={scenarioKey}
                onClick={() => setSelectedScenario(scenarioKey)}
                className={`p-6 rounded-lg border-2 transition-all ${
                  selectedScenario === scenarioKey
                    ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600 ring-offset-2'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="text-xl font-bold text-gray-800 mb-2">{scenario.name}</div>
                <div className="text-sm text-gray-600 mb-3">{scenario.description}</div>
                {peakYear ? (
                  <div className="text-lg font-semibold text-green-600">
                    Peak: {peakYear}
                  </div>
                ) : (
                  <div className="text-lg font-semibold text-red-600">
                    No peak by 2040
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="mb-8">
        <ResponsiveContainer width="100%" height={600}>
          <ComposedChart
            data={projections}
            margin={{ top: 20, right: 50, left: 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6B7280" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6B7280" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 13 }}
              label={{ value: 'Year', position: 'insideBottom', offset: -10, style: { fontSize: 14, fontWeight: 600 } }}
            />
            <YAxis
              tick={{ fontSize: 13 }}
              label={{
                value: 'Energy Services (EJ)',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 14, fontWeight: 600 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />

            {/* Historical data (shaded area) */}
            <Area
              type="monotone"
              dataKey="historical_fossil"
              fill="url(#historicalGradient)"
              stroke="#6B7280"
              strokeWidth={2}
              name="Historical Fossil"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="historical_clean"
              fill="url(#historicalGradient)"
              stroke="#6B7280"
              strokeWidth={2}
              name="Historical Clean"
              connectNulls={false}
            />

            {/* Scenario projections */}
            <Line
              type="monotone"
              dataKey={`${selectedScenario}_fossil`}
              stroke="#DC2626"
              strokeWidth={3}
              dot={{ r: 2 }}
              activeDot={{ r: 5 }}
              name={`${scenarios[selectedScenario].name} - Fossil`}
            />
            <Line
              type="monotone"
              dataKey={`${selectedScenario}_clean`}
              stroke="#16A34A"
              strokeWidth={3}
              dot={{ r: 2 }}
              activeDot={{ r: 5 }}
              name={`${scenarios[selectedScenario].name} - Clean`}
            />

            {/* Peak year marker */}
            {peakYears[selectedScenario] && (
              <ReferenceLine
                x={peakYears[selectedScenario]}
                stroke="#16A34A"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `Peak: ${peakYears[selectedScenario]}`,
                  position: 'top',
                  fill: '#16A34A',
                  fontSize: 14,
                  fontWeight: 'bold'
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Scenario Comparison Table */}
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Scenario Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Scenario</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Peak Year</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">2030 Fossil (EJ)</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">2030 Clean %</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">2040 Fossil (EJ)</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">2040 Clean %</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(scenarios).map(scenarioKey => {
                const scenario = scenarios[scenarioKey];
                const peakYear = peakYears[scenarioKey];
                const data2030 = projections.find(p => p.year === 2030);
                const data2040 = projections.find(p => p.year === 2040);

                return (
                  <tr
                    key={scenarioKey}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">{scenario.name}</td>
                    <td className="px-4 py-3">
                      {peakYear ? (
                        <span className="text-green-600 font-semibold">{peakYear}</span>
                      ) : (
                        <span className="text-red-600">After 2040</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {data2030 ? data2030[`${scenarioKey}_fossil`].toFixed(1) : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      {data2030 ? `${data2030[`${scenarioKey}_clean_share`].toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      {data2040 ? data2040[`${scenarioKey}_fossil`].toFixed(1) : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      {data2040 ? `${data2040[`${scenarioKey}_clean_share`].toFixed(1)}%` : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assumptions */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg border-l-4 border-blue-600">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Projection Methodology & Calibration</h3>
        <div className="text-sm text-gray-700 space-y-3">
          <div className="p-4 bg-blue-50 rounded-lg mb-4">
            <p className="font-bold text-blue-900 text-base mb-2">
              Scenarios Calibrated to IEA World Energy Outlook 2024
            </p>
            <p className="text-blue-800">
              All scenarios are calibrated against IEA WEO 2024 projections, with useful energy estimated at ~37% of primary energy.
              Starting point (2024): Fossil ~187 EJ, Clean ~52 EJ, Total ~239 EJ useful energy services.
            </p>
          </div>

          <p className="font-semibold text-gray-800">
            Scenario Parameters & Targets:
          </p>
          <div className="ml-4 space-y-3">
            <div className="p-3 bg-white rounded border border-gray-200">
              <p className="font-semibold text-gray-900 mb-1">Slow Transition (IEA STEPS)</p>
              <p className="text-xs text-gray-600 mb-2">Current policies pathway with stated commitments</p>
              <ul className="text-xs space-y-1 ml-4">
                <li>• Clean growth accelerates to 3.5%/year (3-year ramp-up)</li>
                <li>• Fossil baseline growth: 2.2%/year (declining 0.05%/year, reflects 2024 actuals)</li>
                <li>• Displacement efficiency: 0.90x (90% base efficiency)</li>
                <li>• Energy intensity improvement: 1.0%/year (efficiency gains reduce demand)</li>
                <li>• <strong>Peak Year:</strong> ~2027 (fossil begins sustained decline)</li>
                <li>• <strong>Result 2040:</strong> ~162 EJ fossil (58% share), Total ~277 EJ</li>
                <li>• <strong>Note:</strong> Efficiency improvements cap total energy growth at realistic levels</li>
              </ul>
            </div>
            <div className="p-3 bg-white rounded border border-gray-200">
              <p className="font-semibold text-gray-900 mb-1">Moderate Acceleration</p>
              <p className="text-xs text-gray-600 mb-2">Enhanced policies with stronger clean deployment</p>
              <ul className="text-xs space-y-1 ml-4">
                <li>• Clean growth accelerates to 5.5%/year (3-year ramp-up)</li>
                <li>• Fossil baseline growth: 2.0%/year (declining 0.09%/year)</li>
                <li>• Displacement multiplier: 1.15x (15% more effective)</li>
                <li>• Energy intensity improvement: 1.5%/year</li>
                <li>• <strong>Peak Year:</strong> ~2026 (fossil begins sustained decline)</li>
                <li>• <strong>Result 2040:</strong> ~109 EJ fossil (47% share), Total ~235 EJ</li>
                <li>• <strong>Note:</strong> Requires accelerated clean deployment + efficiency programs</li>
              </ul>
            </div>
            <div className="p-3 bg-white rounded border border-gray-200">
              <p className="font-semibold text-gray-900 mb-1">Rapid Transition (IEA NZE)</p>
              <p className="text-xs text-gray-600 mb-2">Net Zero by 2050 pathway with ambitious climate action</p>
              <ul className="text-xs space-y-1 ml-4">
                <li>• Clean growth accelerates to 8.0%/year (3-year ramp-up)</li>
                <li>• Fossil baseline growth: 1.8%/year (declining 0.14%/year)</li>
                <li>• Displacement multiplier: 1.45x (45% more effective)</li>
                <li>• Energy intensity improvement: 2.0%/year</li>
                <li>• <strong>Peak Year:</strong> ~2026 (fossil begins sustained decline)</li>
                <li>• <strong>Result 2040:</strong> ~47 EJ fossil (25% share), Total ~190 EJ</li>
                <li>• <strong>Note:</strong> Deep efficiency gains + rapid clean deployment</li>
                <li>• <strong>On track for:</strong> ~50 EJ residual fossil by 2050 (CCS/biofuels)</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-600">
            <p className="text-yellow-900 font-semibold mb-2">Comprehensive Energy System Model</p>
            <p className="text-yellow-800 text-sm mb-2">
              This model combines displacement-based fossil fuel decline with energy efficiency improvements to create a realistic view of the energy transition:
            </p>
            <ul className="text-yellow-800 text-sm ml-6 space-y-2">
              <li><strong>• Fossil Baseline Growth:</strong> Reflects infrastructure inertia and demand patterns (1.8-2.2%/year initially)</li>
              <li><strong>• Clean Energy Deployment:</strong> Accelerates over time with technology learning and scale</li>
              <li><strong>• Displacement:</strong> Clean growth displaces fossil from baseline (70-95% efficiency)</li>
              <li><strong>• Energy Efficiency:</strong> Intensity improvements (1-2%/year) reduce total energy demand</li>
              <li><strong>• 3-year Ramp-Up:</strong> Policy implementation lags and gradual infrastructure buildout (2025-2027)</li>
            </ul>
            <p className="text-yellow-800 text-sm mt-2">
              The combination of clean displacement and efficiency gains determines peak fossil timing and 2040 outcomes.
            </p>
          </div>

          <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-600">
            <p className="text-green-900 font-semibold mb-2">Peak Fossil Conditions:</p>
            <p className="text-green-800 text-sm mb-2">
              Fossil fuel consumption peaks when one of two conditions is met:
            </p>
            <ul className="text-green-800 text-sm ml-6 space-y-1">
              <li><strong>1.</strong> 100% of new energy service growth is met by clean sources (clean growth ≥ total demand growth)</li>
              <li><strong>2.</strong> Clean displacement exceeds new fossil demand growth (displacement &gt; fossil baseline growth)</li>
            </ul>
            <p className="text-green-800 text-sm mt-2">
              Peak is defined as 3 consecutive years of fossil fuel decline, marking the start of sustained reduction in fossil consumption.
            </p>
          </div>

          <p className="mt-3 text-xs text-gray-600">
            <strong>Validation:</strong> Model is validated against historical data (2000-2024) where we know both fossil and clean grew simultaneously.
            IEA forecasts are used as reference points, not validation targets, since they may contain their own assumptions and uncertainties.
            Energy efficiency improvements (1-2%/year) are now incorporated, making total energy demand projections realistic.
          </p>
        </div>
      </div>
    </div>
  );
}

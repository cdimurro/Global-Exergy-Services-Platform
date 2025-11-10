import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';

export default function DisplacementTracker() {
  const [energyData, setEnergyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displacementRate, setDisplacementRate] = useState(0);
  const [fossilGrowth, setFossilGrowth] = useState(0);
  const [netChange, setNetChange] = useState(0);
  const [totalEnergyGrowth, setTotalEnergyGrowth] = useState(0);
  const [totalEnergyGrowthPercent, setTotalEnergyGrowthPercent] = useState(0);
  const [netChangePercent, setNetChangePercent] = useState(0);
  const [cleanRelativeChange, setCleanRelativeChange] = useState(0);
  const [fossilRelativeChange, setFossilRelativeChange] = useState(0);
  const [status, setStatus] = useState('rising');

  useEffect(() => {
    fetch('/data/useful_energy_timeseries.json')
      .then(res => res.json())
      .then(data => {
        setEnergyData(data);
        calculateDisplacement(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading energy data:', err);
        setLoading(false);
      });
  }, []);

  const calculateDisplacement = (data) => {
    const timeseries = data.data;
    if (timeseries.length < 2) return;

    // Get the last two years to calculate current rates
    const currentYear = timeseries[timeseries.length - 1];
    const previousYear = timeseries[timeseries.length - 2];

    // Calculate fossil fuel growth
    const fossilGrowthValue = currentYear.fossil_useful_ej - previousYear.fossil_useful_ej;

    // Calculate clean growth
    const cleanGrowth = currentYear.clean_useful_ej - previousYear.clean_useful_ej;

    // Displacement (D) = clean energy growth (positive only)
    // This represents clean services added, which offset fossil growth
    const displacementValue = Math.max(0, cleanGrowth);

    // Total Energy Service Growth = Total energy change year-over-year
    const totalEnergyGrowthValue = currentYear.total_useful_ej - previousYear.total_useful_ej;
    const totalEnergyGrowthPercentValue = previousYear.total_useful_ej > 0
      ? (totalEnergyGrowthValue / previousYear.total_useful_ej) * 100
      : 0;

    // Net Change = Fossil Growth - Clean Displacement
    // This is what we're trying to track - is fossil going up or down?
    const netChangeValue = fossilGrowthValue - displacementValue;
    const netChangePercentValue = previousYear.fossil_useful_ej > 0
      ? (netChangeValue / previousYear.fossil_useful_ej) * 100
      : 0;

    // Relative changes for clean and fossil
    const cleanRelativeChangeValue = previousYear.clean_useful_ej > 0
      ? (cleanGrowth / previousYear.clean_useful_ej) * 100
      : 0;
    const fossilRelativeChangeValue = previousYear.fossil_useful_ej > 0
      ? (fossilGrowthValue / previousYear.fossil_useful_ej) * 100
      : 0;

    setDisplacementRate(displacementValue);
    setFossilGrowth(fossilGrowthValue);
    setNetChange(netChangeValue);
    setTotalEnergyGrowth(totalEnergyGrowthValue);
    setTotalEnergyGrowthPercent(totalEnergyGrowthPercentValue);
    setNetChangePercent(netChangePercentValue);
    setCleanRelativeChange(cleanRelativeChangeValue);
    setFossilRelativeChange(fossilRelativeChangeValue);

    // Determine status
    if (cleanGrowth < 0) {
      setStatus('recarbonization');
    } else if (displacementValue < fossilGrowthValue) {
      setStatus('rising');
    } else if (Math.abs(displacementValue - fossilGrowthValue) < 0.01) {
      setStatus('peak');
    } else {
      setStatus('declining');
    }
  };

  if (loading || !energyData) {
    return <div className="text-center py-8">Loading displacement data...</div>;
  }

  // Gauge chart data - only show the actual values without empty space
  const total = Math.max(0, displacementRate) + Math.max(0, fossilGrowth);
  const gaugeData = [
    { name: 'Clean Energy Displacement', value: Math.max(0, displacementRate), color: '#16A34A' },
    { name: 'Fossil Fuel Growth', value: Math.max(0, fossilGrowth), color: '#DC2626' }
  ];

  // Calculate percentages
  const displacementPercent = total > 0 ? (Math.max(0, displacementRate) / total * 100) : 0;
  const fossilPercent = total > 0 ? (Math.max(0, fossilGrowth) / total * 100) : 0;

  // Custom label renderer for pie chart
  const renderCustomLabel = (entry) => {
    const value = entry.value;
    const percent = (entry.value / total * 100);
    return `${entry.name}: ${value.toFixed(2)} EJ (${percent.toFixed(1)}%)`;
  };

  const getStatusColor = () => {
    switch (status) {
      case 'recarbonization': return '#7C2D12'; // dark red/brown
      case 'rising': return '#DC2626'; // red
      case 'peak': return '#F59E0B'; // yellow/orange
      case 'declining': return '#16A34A'; // green
      default: return '#6B7280'; // gray
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'recarbonization': return 'Recarbonization';
      case 'rising': return 'Fossil Fuel Consumption\nIncreased in 2024';
      case 'peak': return 'Peak Reached';
      case 'declining': return 'Consumption Declining';
      default: return 'Unknown';
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case 'recarbonization':
        return 'Clean energy services shrank in 2024. Fossil fuels expanded to meet all energy demand.';
      case 'rising':
        return 'Clean energy grew in 2024, but fossil fuel demand grew by more.';
      case 'peak':
        return 'Clean growth perfectly balanced fossil demand changes in 2024. Fossil consumption was flat.';
      case 'declining':
        return 'Clean energy growth exceeded fossil demand growth in 2024. Fossil consumption declined.';
      default:
        return '';
    }
  };

  const downloadCSV = () => {
    if (!energyData) return;

    const timeseries = energyData.data;
    const csvData = [];

    // Add header
    csvData.push(['Year', 'Displacement (EJ/year)', 'Fossil Growth (EJ/year)', 'Clean Growth (EJ/year)', 'Net Change (EJ/year)', 'Status', 'Fossil Total (EJ)', 'Clean Total (EJ)']);

    // Calculate for all years
    for (let i = 1; i < timeseries.length; i++) {
      const prev = timeseries[i - 1];
      const curr = timeseries[i];

      const fossilGrowthValue = curr.fossil_useful_ej - prev.fossil_useful_ej;
      const cleanGrowthValue = curr.clean_useful_ej - prev.clean_useful_ej;

      // Displacement is clean growth (if positive)
      const displacementValue = Math.max(0, cleanGrowthValue);

      // Net Change is simply the fossil growth (is fossil going up or down?)
      const netChangeValue = fossilGrowthValue;

      let status;
      if (displacementValue < fossilGrowthValue) {
        status = 'Displacement < Fossil Fuel Growth (Consumption Rising)';
      } else if (Math.abs(displacementValue - fossilGrowthValue) < 0.01) {
        status = 'Displacement = Fossil Fuel Growth (Peak Reached)';
      } else {
        status = 'Displacement > Fossil Fuel Growth (Consumption Declining)';
      }

      csvData.push([
        curr.year,
        displacementValue.toFixed(4),
        fossilGrowthValue.toFixed(4),
        cleanGrowthValue.toFixed(4),
        netChangeValue.toFixed(4),
        status,
        curr.fossil_useful_ej.toFixed(4),
        curr.clean_useful_ej.toFixed(4)
      ]);
    }

    // Convert to CSV string
    const csvContent = csvData.map(row => row.join(',')).join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'displacement_tracker_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="metric-card bg-white mb-16">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">
          Fossil Fuel Displacement Tracker (2024)
        </h2>
        <button
          onClick={downloadCSV}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Download CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Gauge Visualization */}
        <div className="flex flex-col items-center justify-center overflow-visible">
          <div className="relative w-full max-w-md overflow-visible">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="50%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius="60%"
                  outerRadius="90%"
                  paddingAngle={0}
                  dataKey="value"
                >
                  {gaugeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Status indicator in center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-2 text-center w-full px-4">
              <div
                className="text-2xl font-bold mb-1 whitespace-pre-line"
                style={{ color: getStatusColor() }}
              >
                {getStatusText()}
              </div>
              <div className="text-base text-gray-600 font-semibold">
                Net Change: {netChange > 0 ? '+' : ''}{netChange.toFixed(2)} EJ
              </div>
            </div>
          </div>

          {/* Legend with percentages and values */}
          <div className="flex flex-col gap-3 mt-6 w-full max-w-md overflow-visible">
            <div className="relative overflow-visible group">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-l-4 border-green-600 cursor-help">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-600"></div>
                  <span className="text-sm font-semibold text-gray-800">Clean Displacement (D)</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">+{displacementRate.toFixed(2)} EJ</div>
                  <div className="text-sm text-gray-600">Relative Change: {cleanRelativeChange > 0 ? '+' : ''}{cleanRelativeChange.toFixed(1)}%</div>
                </div>
              </div>
              {/* Tooltip */}
              <div className="absolute left-1/2 bottom-full -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[9999]">
                <div>Share of New Energy Services: {displacementPercent.toFixed(1)}%</div>
                <div>Absolute Change: +{displacementRate.toFixed(2)} EJ</div>
                <div className="absolute left-1/2 top-full -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-gray-800"></div>
              </div>
            </div>
            <div className="relative overflow-visible group">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border-l-4 border-red-600 cursor-help">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-600"></div>
                  <span className="text-sm font-semibold text-gray-800">Fossil Fuel Growth</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-red-600">{fossilGrowth > 0 ? '+' : ''}{fossilGrowth.toFixed(2)} EJ</div>
                  <div className="text-sm text-gray-600">Relative Change: {fossilRelativeChange > 0 ? '+' : ''}{fossilRelativeChange.toFixed(1)}%</div>
                </div>
              </div>
              {/* Tooltip */}
              <div className="absolute left-1/2 bottom-full -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[9999]">
                <div>Share of New Energy Services: {fossilPercent.toFixed(1)}%</div>
                <div>Absolute Change: {fossilGrowth > 0 ? '+' : ''}{fossilGrowth.toFixed(2)} EJ</div>
                <div className="absolute left-1/2 top-full -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-gray-800"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Metrics and Status */}
        <div className="flex flex-col justify-center space-y-6">
          {/* Total Energy Service Growth */}
          <div className="p-6 bg-green-50 rounded-lg border-l-4 border-green-600">
            <div className="text-green-700 text-sm font-semibold uppercase tracking-wide mb-2">
              Total Energy Service Growth
            </div>
            <div className="text-5xl font-bold text-gray-900">
              {totalEnergyGrowth > 0 ? '+' : ''}{totalEnergyGrowth.toFixed(2)}
              <span className="text-2xl ml-2 text-gray-500">EJ</span>
            </div>
            <div className="text-lg font-semibold text-green-600 mt-2">
              {totalEnergyGrowthPercent > 0 ? '+' : ''}{totalEnergyGrowthPercent.toFixed(2)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">
              New demand for energy services in 2024
            </div>
          </div>

          {/* Net Change in Fossil Fuel Consumption */}
          <div className="p-6 bg-red-50 rounded-lg border-l-4 border-red-600">
            <div className="text-red-700 text-sm font-semibold uppercase tracking-wide mb-2">
              Net Change in Fossil Fuel Consumption
            </div>
            <div className="text-5xl font-bold text-gray-900">
              {netChange > 0 ? '+' : ''}{netChange.toFixed(2)}
              <span className="text-2xl ml-2 text-gray-500">EJ</span>
            </div>
            <div className="text-lg font-semibold text-red-600 mt-2">
              {netChangePercent > 0 ? '+' : ''}{netChangePercent.toFixed(2)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Change in fossil fuel consumption for 2024
            </div>
          </div>

          {/* Status Description */}
          <div
            className="p-6 rounded-lg border-l-4"
            style={{
              backgroundColor: `${getStatusColor()}10`,
              borderLeftColor: getStatusColor()
            }}
          >
            <div
              className="text-sm font-semibold uppercase tracking-wide mb-2"
              style={{ color: getStatusColor() }}
            >
              Current Status
            </div>
            <div className="text-gray-700">
              {getStatusDescription()}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Formula Explanation */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <div className="text-center mb-4">
          <div className="text-lg font-semibold text-gray-800 mb-2">
            Peak Fossil Fuel Consumption Occurs When:
          </div>
          <div className="text-2xl font-mono text-gray-900">
            Clean Energy Displacement ≥ Fossil Fuel Growth
          </div>
        </div>
        <div className="text-sm text-gray-600 text-center max-w-3xl mx-auto">
          When clean energy displacement (D) meets or exceeds fossil fuel growth for a sustained period,
          fossil fuel consumption peaks and begins to decline. Net Change shows the actual change in fossil consumption.
        </div>
      </div>
    </div>
  );
}

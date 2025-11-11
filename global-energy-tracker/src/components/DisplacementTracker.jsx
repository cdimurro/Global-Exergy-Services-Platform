import { useState, useEffect, useRef } from 'react';
import { useWindowSize } from '@react-hook/window-size';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { downloadChartAsPNG, ChartExportButtons } from '../utils/chartExport';
import ChartFullscreenModal from './ChartFullscreenModal';
import FullscreenButton from './FullscreenButton';

export default function DisplacementTracker() {
  const [width] = useWindowSize();  // Dynamic window size for responsive charts
  const [energyData, setEnergyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);
  const [displacementRate, setDisplacementRate] = useState(0);
  const [fossilGrowth, setFossilGrowth] = useState(0);
  const [netChange, setNetChange] = useState(0);
  const [totalEnergyGrowth, setTotalEnergyGrowth] = useState(0);
  const [totalEnergyGrowthPercent, setTotalEnergyGrowthPercent] = useState(0);
  const [netChangePercent, setNetChangePercent] = useState(0);
  const [cleanRelativeChange, setCleanRelativeChange] = useState(0);
  const [fossilRelativeChange, setFossilRelativeChange] = useState(0);
  const [status, setStatus] = useState('rising');
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Bar chart data
  const barChartData = [
    {
      name: 'Clean Displacement',
      value: Math.max(0, displacementRate),
      percent: cleanRelativeChange,
      color: '#16A34A',
      label: 'Clean Displacement (D)'
    },
    {
      name: 'Fossil Fuel Growth',
      value: Math.max(0, fossilGrowth),
      percent: fossilRelativeChange,
      color: '#DC2626',
      label: 'Fossil Fuel Growth'
    },
    {
      name: 'Net Change',
      value: netChange,
      percent: netChangePercent,
      color: '#9333EA',
      label: 'Net Change'
    }
  ];

  // Custom tooltip for bar chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-gray-800 mb-2">{data.label}</p>
          <p className="text-sm text-gray-700">
            Annual Change: {data.value > 0 ? '+' : ''}{data.value.toFixed(2)} EJ ({data.percent > 0 ? '+' : ''}{data.percent.toFixed(2)}%)
          </p>
        </div>
      );
    }
    return null;
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

  const downloadPNG = () => {
    downloadChartAsPNG(chartRef, 'displacement_tracker_2024');
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

  // Responsive chart heights: adjusted for fullscreen to fit without scrolling
  // In fullscreen, the 2-column layout with metrics cards means chart shouldn't be too tall
  const getChartHeight = () => {
    if (isFullscreen) {
      return width < 640 ? 300 : width < 1024 ? 400 : 500;
    }
    return 350;
  };

  // Render chart content (used in both normal and fullscreen modes)
  const renderChartContent = () => (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Bar Chart Visualization */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-full">
            <ResponsiveContainer width="100%" height={getChartHeight()}>
              <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  label={{ value: 'Energy (EJ)', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status indicator below chart */}
          <div className="mt-4 text-center w-full">
            <div
              className="text-xl font-bold mb-1"
              style={{ color: getStatusColor() }}
            >
              {getStatusText()}
            </div>
            <div className="text-sm text-gray-600">
              Net Change: {netChange > 0 ? '+' : ''}{netChange.toFixed(2)} EJ
            </div>
          </div>

          {/* Color-coded legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#16A34A' }}></div>
              <span className="text-sm font-medium text-gray-700">Clean Displacement</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#DC2626' }}></div>
              <span className="text-sm font-medium text-gray-700">Fossil Fuel Growth</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#9333EA' }}></div>
              <span className="text-sm font-medium text-gray-700">Net Change</span>
            </div>
          </div>
        </div>

        {/* Right: Metrics and Status */}
        <div className="flex flex-col justify-center space-y-6">
          {/* Total Energy Service Growth */}
          <div className="p-4 sm:p-6 bg-green-50 rounded-lg border-l-4 border-green-600">
            <div className="text-green-700 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-2">
              Total Energy Service Growth
            </div>
            <div className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900">
              {totalEnergyGrowth > 0 ? '+' : ''}{totalEnergyGrowth.toFixed(2)}
              <span className="text-base sm:text-xl md:text-2xl ml-1 sm:ml-2 text-gray-500">EJ</span>
            </div>
            <div className="text-base sm:text-lg font-semibold text-green-600 mt-2">
              {totalEnergyGrowthPercent > 0 ? '+' : ''}{totalEnergyGrowthPercent.toFixed(2)}%
            </div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">
              New demand for energy services in 2024
            </div>
          </div>

          {/* Net Change in Fossil Fuel Consumption */}
          <div className="p-4 sm:p-6 bg-red-50 rounded-lg border-l-4 border-red-600">
            <div className="text-red-700 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-2">
              Net Change in Fossil Fuel Consumption
            </div>
            <div className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900">
              {netChange > 0 ? '+' : ''}{netChange.toFixed(2)}
              <span className="text-base sm:text-xl md:text-2xl ml-1 sm:ml-2 text-gray-500">EJ</span>
            </div>
            <div className="text-base sm:text-lg font-semibold text-red-600 mt-2">
              {netChangePercent > 0 ? '+' : ''}{netChangePercent.toFixed(2)}%
            </div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">
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
        <div className="text-xs text-gray-500 text-center mt-4">
          Data sources: Our World in Data, BP Statistical Review
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Normal View */}
      <div className="metric-card bg-white mb-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">
            Fossil Fuel Displacement Tracker (2024)
          </h2>
          <div className="flex gap-2">
            <ChartExportButtons
              onDownloadPNG={downloadPNG}
              onDownloadCSV={downloadCSV}
            />
            <FullscreenButton onClick={() => setIsFullscreen(true)} />
          </div>
        </div>

        <div ref={chartRef}>
          {renderChartContent()}
        </div>
      </div>

      {/* Fullscreen View */}
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Fossil Fuel Displacement Tracker (2024)"
        description="Real-time tracking of clean energy displacement vs fossil fuel growth"
        exportButtons={
          <ChartExportButtons
            onDownloadPNG={downloadPNG}
            onDownloadCSV={downloadCSV}
          />
        }
      >
        {renderChartContent()}
      </ChartFullscreenModal>
    </>
  );
}

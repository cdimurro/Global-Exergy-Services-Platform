import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { downloadChartAsPNG, ChartExportButtons } from '../utils/chartExport';
import ChartFullscreenModal from './ChartFullscreenModal';
import FullscreenButton from './FullscreenButton';

export default function NetChangeTimeline() {
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    fetch('/data/useful_energy_timeseries.json')
      .then(res => res.json())
      .then(data => {
        calculateTimeline(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading energy data:', err);
        setLoading(false);
      });
  }, []);

  const calculateTimeline = (data) => {
    const timeseries = data.data;
    const calculatedData = [];

    for (let i = 1; i < timeseries.length; i++) {
      const prev = timeseries[i - 1];
      const curr = timeseries[i];

      // Calculate fossil growth
      const fossilGrowth = curr.fossil_useful_ej - prev.fossil_useful_ej;

      // Calculate clean growth
      const cleanGrowth = curr.clean_useful_ej - prev.clean_useful_ej;

      // Calculate displacement (clean growth if positive, 0 otherwise)
      const displacement = Math.max(0, cleanGrowth);

      // Net change = Fossil Growth - Displacement
      // This shows the actual change in fossil consumption after accounting for clean energy displacement
      const netChange = fossilGrowth - displacement;

      // Calculate relative changes (%)
      const fossilGrowthPercent = (fossilGrowth / prev.fossil_useful_ej) * 100;
      const cleanGrowthPercent = (cleanGrowth / prev.clean_useful_ej) * 100;
      const displacementPercent = (displacement / prev.fossil_useful_ej) * 100;
      const netChangePercent = (netChange / prev.fossil_useful_ej) * 100;

      calculatedData.push({
        year: curr.year,
        displacement,
        fossilGrowth,
        netChange,
        cleanGrowth,
        totalFossil: curr.fossil_useful_ej,
        totalClean: curr.clean_useful_ej,
        isPeak: displacement >= fossilGrowth,
        // Percentage changes
        fossilGrowthPercent,
        cleanGrowthPercent,
        displacementPercent,
        netChangePercent
      });
    }

    setTimelineData(calculatedData);
  };

  if (loading) {
    return <div className="text-center py-8">Loading timeline data...</div>;
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white p-4 rounded-lg shadow-xl border-2 border-gray-300">
        <div className="font-bold text-lg mb-3 text-gray-900">{label}</div>

        <div className="space-y-2">
          {/* Clean Displacement */}
          <div className="flex justify-between items-center gap-6">
            <span className="text-xs font-semibold text-green-700">Clean Displacement</span>
            <div className="text-right">
              <div className="text-sm font-bold text-green-700">
                {data.displacement > 0 ? '+' : ''}{data.displacement.toFixed(2)} EJ
              </div>
              <div className="text-xs text-green-600">
                {data.displacementPercent > 0 ? '+' : ''}{data.displacementPercent.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Fossil Fuel Growth */}
          <div className="flex justify-between items-center gap-6">
            <span className="text-xs font-semibold text-red-700">Fossil Fuel Growth</span>
            <div className="text-right">
              <div className="text-sm font-bold text-red-700">
                {data.fossilGrowth > 0 ? '+' : ''}{data.fossilGrowth.toFixed(2)} EJ
              </div>
              <div className="text-xs text-red-600">
                {data.fossilGrowthPercent > 0 ? '+' : ''}{data.fossilGrowthPercent.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Net Change */}
          <div className={`${data.netChange > 0 ? 'bg-red-50' : 'bg-green-50'} p-2 rounded border ${data.netChange > 0 ? 'border-red-300' : 'border-green-300'} mt-2`}>
            <div className="flex justify-between items-center gap-6">
              <span className="text-xs font-semibold text-gray-700">Net Change</span>
              <div className="text-right">
                <div className={`text-base font-bold ${data.netChange > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {data.netChange > 0 ? '+' : ''}{data.netChange.toFixed(2)} EJ
                </div>
                <div className={`text-xs ${data.netChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {data.netChangePercent > 0 ? '+' : ''}{data.netChangePercent.toFixed(2)}%
                </div>
              </div>
            </div>
            <div className={`text-xs italic mt-1 ${data.netChange > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {data.netChange > 0
                ? '↑ Fossil consumption rising'
                : data.netChange < 0
                  ? '↓ Fossil consumption declining'
                  : '→ Fossil consumption flat'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const downloadPNG = () => {
    downloadChartAsPNG(chartRef, 'displacement_timeline');
  };

  const downloadCSV = () => {
    const csvData = [];

    // Add header
    csvData.push([
      'Year',
      'Displacement (EJ/year)',
      'Displacement (%)',
      'Fossil Growth (EJ/year)',
      'Fossil Growth (%)',
      'Clean Growth (EJ/year)',
      'Clean Growth (%)',
      'Net Change (EJ/year)',
      'Net Change (%)',
      'Is Peak Year',
      'Total Fossil (EJ)',
      'Total Clean (EJ)'
    ]);

    // Add data rows
    timelineData.forEach(row => {
      csvData.push([
        row.year,
        row.displacement.toFixed(4),
        row.displacementPercent.toFixed(4),
        row.fossilGrowth.toFixed(4),
        row.fossilGrowthPercent.toFixed(4),
        row.cleanGrowth.toFixed(4),
        row.cleanGrowthPercent.toFixed(4),
        row.netChange.toFixed(4),
        row.netChangePercent.toFixed(4),
        row.isPeak ? 'Yes' : 'No',
        row.totalFossil.toFixed(4),
        row.totalClean.toFixed(4)
      ]);
    });

    // Convert to CSV string
    const csvContent = csvData.map(row => row.join(',')).join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'displacement_timeline_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render chart content (used in both normal and fullscreen modes)
  const renderChartContent = () => (
    <>
      <ResponsiveContainer width="100%" height={isFullscreen ? 600 : 500}>
        <ComposedChart
          data={timelineData}
          margin={{ top: 20, right: 30, left: 30, bottom: 30 }}
        >
          <defs>
            <linearGradient id="netChangeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#DC2626" stopOpacity={0.2} />
              <stop offset="50%" stopColor="#94a3b8" stopOpacity={0.05} />
              <stop offset="100%" stopColor="#16A34A" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#9ca3af' }}
            label={{ value: 'Year', position: 'insideBottom', offset: -15, style: { fontSize: 13, fontWeight: 600, fill: '#374151' } }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#9ca3af' }}
            label={{
              value: 'Change (EJ/year)',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 13, fontWeight: 600, fill: '#374151' }
            }}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Legend
            wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }}
            iconType="line"
            iconSize={16}
          />

          {/* Reference line at zero */}
          <ReferenceLine y={0} stroke="#1f2937" strokeWidth={2} />

          {/* Shaded area for net change */}
          <Area
            type="monotone"
            dataKey="netChange"
            fill="url(#netChangeGradient)"
            stroke="none"
            fillOpacity={1}
          />

          {/* Main lines */}
          <Line
            type="monotone"
            dataKey="displacement"
            stroke="#16A34A"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 6, fill: '#16A34A' }}
            name="Displacement (D)"
          />
          <Line
            type="monotone"
            dataKey="fossilGrowth"
            stroke="#DC2626"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 6, fill: '#DC2626' }}
            name="Fossil Fuel Growth"
          />
          <Line
            type="monotone"
            dataKey="netChange"
            stroke="#7C3AED"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: '#7C3AED' }}
            name="Net Change"
            strokeDasharray="5 5"
          />

        </ComposedChart>
      </ResponsiveContainer>

      {/* Explanation */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-green-50 rounded-lg border-l-2 border-green-600">
          <div className="font-semibold text-green-800 mb-2">Displacement (D)</div>
          <div className="text-sm text-gray-700">
            Rate at which clean energy replaces fossil fuels (EJ/year)
          </div>
        </div>
        <div className="p-4 bg-red-50 rounded-lg border-l-2 border-red-600">
          <div className="font-semibold text-red-800 mb-2">Fossil Fuel Growth</div>
          <div className="text-sm text-gray-700">
            Annual change in fossil fuel services (EJ/year)
          </div>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg border-l-2 border-purple-600">
          <div className="font-semibold text-purple-800 mb-2">Net Change</div>
          <div className="text-sm text-gray-700">
            Fossil Growth - Displacement. Shows the net impact on fossil consumption after clean energy displacement. Negative means fossil is actually declining.
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500 text-center mt-4">
        Data sources: Our World in Data, BP Statistical Review
      </div>
    </>
  );

  return (
    <>
      {/* Normal View */}
      <div className="metric-card bg-white mb-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">
            Historical Displacement & Net Change Timeline
          </h2>
          <div className="flex gap-2">
            <FullscreenButton onClick={() => setIsFullscreen(true)} />
            <ChartExportButtons
              onDownloadPNG={downloadPNG}
              onDownloadCSV={downloadCSV}
            />
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
        title="Historical Displacement & Net Change Timeline"
        description="Annual changes in energy services delivery"
      >
        <div className="flex justify-end mb-4">
          <ChartExportButtons
            onDownloadPNG={downloadPNG}
            onDownloadCSV={downloadCSV}
          />
        </div>
        {renderChartContent()}
      </ChartFullscreenModal>
    </>
  );
}

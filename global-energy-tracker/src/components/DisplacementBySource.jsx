import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { ENERGY_COLORS, getSourceName } from '../utils/colors';
import { downloadChartAsPNG, ChartExportButtons } from '../utils/chartExport';

const CLEAN_SOURCES = ['nuclear', 'hydro', 'wind', 'solar', 'geothermal', 'biomass'];

export default function DisplacementBySource() {
  const [energyData, setEnergyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sourceData, setSourceData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('current'); // 'current', '5year', '10year'
  const chartRef = useRef(null);

  useEffect(() => {
    fetch('/data/useful_energy_timeseries.json')
      .then(res => res.json())
      .then(data => {
        setEnergyData(data);
        calculateSourceDisplacement(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading energy data:', err);
        setLoading(false);
      });
  }, []);

  const calculateSourceDisplacement = (data) => {
    const timeseries = data.data;

    // Calculate for different time periods
    const periods = {
      current: { years: 1, label: 'Last Year (2023-2024)' },
      '5year': { years: 5, label: 'Last 5 Years (2019-2024)' },
      '10year': { years: 10, label: 'Last 10 Years (2014-2024)' }
    };

    const sourceDisplacement = {};

    Object.keys(periods).forEach(periodKey => {
      const period = periods[periodKey];
      const startIdx = Math.max(0, timeseries.length - 1 - period.years);
      const endIdx = timeseries.length - 1;

      const startYear = timeseries[startIdx];
      const endYear = timeseries[endIdx];

      // Calculate displacement for each clean source
      const sources = CLEAN_SOURCES.map(source => {
        const startValue = startYear.sources_useful_ej[source] || 0;
        const endValue = endYear.sources_useful_ej[source] || 0;
        const growth = endValue - startValue;
        const annualGrowth = growth / period.years;
        const growthRate = startValue > 0 ? ((endValue / startValue) - 1) * 100 / period.years : 0;

        return {
          source,
          name: getSourceName(source),
          totalGrowth: growth,
          annualGrowth: annualGrowth,
          growthRate: growthRate,
          startValue: startValue,
          endValue: endValue,
          color: ENERGY_COLORS[source]
        };
      });

      // Sort by total growth (descending)
      sources.sort((a, b) => b.totalGrowth - a.totalGrowth);

      // Calculate totals
      const totalDisplacement = sources.reduce((sum, s) => sum + Math.max(0, s.totalGrowth), 0);
      const totalAnnual = sources.reduce((sum, s) => sum + Math.max(0, s.annualGrowth), 0);

      sourceDisplacement[periodKey] = {
        sources,
        totalDisplacement,
        totalAnnual,
        period: period.label
      };
    });

    setSourceData(sourceDisplacement);
  };

  if (loading || !energyData || !sourceData.current) {
    return <div className="text-center py-8">Loading source displacement data...</div>;
  }

  const currentData = sourceData[selectedPeriod];

  const downloadPNG = () => {
    downloadChartAsPNG(chartRef, `displacement_by_source_${selectedPeriod}`);
  };

  const downloadCSV = () => {
    const csvData = [];

    // Add header
    csvData.push(['Source', 'Start Value (EJ)', 'End Value (EJ)', 'Total Growth (EJ)', 'Annual Growth (EJ/year)', 'Annual Growth Rate (%)']);

    // Add data rows
    currentData.sources.forEach(source => {
      csvData.push([
        source.name,
        source.startValue.toFixed(3),
        source.endValue.toFixed(3),
        source.totalGrowth.toFixed(3),
        source.annualGrowth.toFixed(3),
        source.growthRate.toFixed(2)
      ]);
    });

    // Add totals
    csvData.push([
      'TOTAL',
      '',
      '',
      currentData.totalDisplacement.toFixed(3),
      currentData.totalAnnual.toFixed(3),
      ''
    ]);

    // Convert to CSV string
    const csvContent = csvData.map(row => row.join(',')).join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `displacement_by_source_${selectedPeriod}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <div className="font-bold text-lg mb-3">{label}</div>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Annual Growth:</strong> {data.annualGrowth > 0 ? '+' : ''}{data.annualGrowth.toFixed(2)} EJ/year
          </div>
          <div>
            <strong>Total Growth:</strong> {data.totalGrowth > 0 ? '+' : ''}{data.totalGrowth.toFixed(2)} EJ
          </div>
          <div>
            <strong>Growth Rate:</strong> {data.growthRate > 0 ? '+' : ''}{data.growthRate.toFixed(1)}% per year
          </div>
          <div className="border-t pt-2 mt-2">
            <div><strong>Start:</strong> {data.startValue.toFixed(2)} EJ</div>
            <div><strong>End:</strong> {data.endValue.toFixed(2)} EJ</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="metric-card bg-white mb-16">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">
          Displacement by Clean Energy Source
        </h2>
        <ChartExportButtons
          onDownloadPNG={downloadPNG}
          onDownloadCSV={downloadCSV}
        />
      </div>

      {/* Period Selector */}
      <div className="mb-8">
        <label className="block text-lg font-semibold mb-3 text-gray-700">
          Time Period:
        </label>
        <div className="flex gap-3">
          {Object.keys(sourceData).map(periodKey => (
            <button
              key={periodKey}
              onClick={() => setSelectedPeriod(periodKey)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                selectedPeriod === periodKey
                  ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {sourceData[periodKey].period}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-green-50 rounded-lg border-l-4 border-green-600">
          <div className="text-green-700 text-sm font-semibold uppercase tracking-wide mb-2">
            Total Displacement
          </div>
          <div className="text-5xl font-bold text-gray-900">
            {currentData.totalDisplacement.toFixed(1)}
            <span className="text-2xl ml-2 text-gray-500">EJ</span>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Total clean energy services added over the period
          </div>
        </div>

        <div className="p-6 bg-blue-50 rounded-lg border-l-4 border-blue-600">
          <div className="text-blue-700 text-sm font-semibold uppercase tracking-wide mb-2">
            Annual Average
          </div>
          <div className="text-5xl font-bold text-gray-900">
            {currentData.totalAnnual.toFixed(2)}
            <span className="text-2xl ml-2 text-gray-500">EJ/year</span>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Average annual displacement rate
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="mb-8" ref={chartRef}>
        <h3 className="text-xl font-bold text-gray-800 mb-4">Annual Growth by Source</h3>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart
            data={currentData.sources}
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 13 }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis
              tick={{ fontSize: 13 }}
              label={{
                value: 'Annual Growth (EJ/year)',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 14, fontWeight: 600 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#000" strokeWidth={1.5} />
            <Bar dataKey="annualGrowth" radius={[8, 8, 0, 0]}>
              {currentData.sources.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Table */}
      <div className="mt-4">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Detailed Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Source</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Start (EJ)</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">End (EJ)</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Growth</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Annual Growth</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Growth Rate</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Share of Displacement</th>
              </tr>
            </thead>
            <tbody>
              {currentData.sources.map((source, index) => {
                const shareOfDisplacement = currentData.totalDisplacement > 0
                  ? (Math.max(0, source.totalGrowth) / currentData.totalDisplacement) * 100
                  : 0;

                return (
                  <tr
                    key={index}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: source.color }}
                        />
                        <span className="font-semibold text-gray-900">{source.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {source.startValue.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {source.endValue.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={source.totalGrowth > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {source.totalGrowth > 0 ? '+' : ''}{source.totalGrowth.toFixed(2)} EJ
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={source.annualGrowth > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {source.annualGrowth > 0 ? '+' : ''}{source.annualGrowth.toFixed(3)} EJ/year
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {source.growthRate > 0 ? '+' : ''}{source.growthRate.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {shareOfDisplacement.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                <td className="px-4 py-3">TOTAL</td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right text-green-600">
                  +{currentData.totalDisplacement.toFixed(2)} EJ
                </td>
                <td className="px-4 py-3 text-right text-green-600">
                  +{currentData.totalAnnual.toFixed(3)} EJ/year
                </td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right">100.0%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-xs text-gray-500 text-center mt-4">
        Data sources: Our World in Data, BP Statistical Review
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useMemo } from 'react';
import { useWindowSize } from '@react-hook/window-size';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LineChart, Line } from 'recharts';
import { getRegionColor, getRegionName } from '../utils/colors';
import { downloadChartAsPNG, ChartExportButtons } from '../utils/chartExport';
import ChartFullscreenModal from './ChartFullscreenModal';
import FullscreenButton from './FullscreenButton';

// Default regions to show (major economies + regions)
const DEFAULT_REGIONS = ['China', 'United States', 'Europe', 'India', 'Japan'];

// All available regions categorized
const REGION_CATEGORIES = {
  'Major Economies': ['China', 'United States', 'India', 'Japan', 'Germany', 'United Kingdom', 'France', 'Brazil', 'Canada', 'South Korea', 'Russia', 'Indonesia', 'Mexico', 'Saudi Arabia', 'Australia', 'Spain', 'South Africa'],
  'Continental': ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'],
  'Economic Groups': ['European Union', 'OECD', 'Non-OECD']
};

export default function DisplacementByRegion() {
  const [width] = useWindowSize();
  const [regionalData, setRegionalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRegions, setSelectedRegions] = useState(DEFAULT_REGIONS);
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [viewMode, setViewMode] = useState('comparison'); // 'comparison' or 'timeline'
  const chartRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetch('/data/regional_energy_timeseries.json')
      .then(res => res.json())
      .then(data => {
        setRegionalData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading regional data:', err);
        setLoading(false);
      });
  }, []);

  // Calculate displacement metrics for each region
  const displacementData = useMemo(() => {
    if (!regionalData) return null;

    const periods = {
      current: { years: 1, label: '2023-2024' },
      '5year': { years: 5, label: 'Last 5 Years' },
      '10year': { years: 10, label: 'Last 10 Years' },
      '20year': { years: 20, label: 'Last 20 Years' }
    };

    const allRegionData = {};

    Object.keys(regionalData.regions).forEach(regionKey => {
      const regionTimeseries = regionalData.regions[regionKey].data;
      if (!regionTimeseries || regionTimeseries.length === 0) return;

      const regionPeriodData = {};

      Object.keys(periods).forEach(periodKey => {
        const period = periods[periodKey];
        const endIdx = regionTimeseries.length - 1;
        const startIdx = Math.max(0, endIdx - period.years);

        const startYear = regionTimeseries[startIdx];
        const endYear = regionTimeseries[endIdx];

        if (!startYear || !endYear) return;

        // Calculate clean energy growth (displacement)
        const cleanStart = startYear.clean_useful_ej || 0;
        const cleanEnd = endYear.clean_useful_ej || 0;
        const cleanGrowth = cleanEnd - cleanStart;
        const annualCleanGrowth = cleanGrowth / period.years;

        // Calculate fossil fuel change
        const fossilStart = startYear.fossil_useful_ej || 0;
        const fossilEnd = endYear.fossil_useful_ej || 0;
        const fossilChange = fossilEnd - fossilStart;
        const annualFossilChange = fossilChange / period.years;

        // Net change (negative is good - means fossil reduction)
        const netChange = fossilChange - cleanGrowth;
        const annualNetChange = netChange / period.years;

        // Displacement rate: clean growth as percentage of fossil base
        const displacementRate = fossilStart > 0 ? (cleanGrowth / fossilStart) * 100 : 0;

        regionPeriodData[periodKey] = {
          region: regionKey,
          name: getRegionName(regionKey),
          color: getRegionColor(regionKey),
          cleanGrowth,
          annualCleanGrowth,
          fossilChange,
          annualFossilChange,
          netChange,
          annualNetChange,
          displacementRate,
          cleanStart,
          cleanEnd,
          fossilStart,
          fossilEnd,
          startYear: startYear.year,
          endYear: endYear.year,
          period: periods[periodKey].label
        };
      });

      allRegionData[regionKey] = regionPeriodData;
    });

    return allRegionData;
  }, [regionalData]);

  // Get timeline data for selected regions
  const timelineData = useMemo(() => {
    if (!regionalData || !selectedRegions.length) return [];

    // Find common year range
    const years = [];
    const firstRegion = selectedRegions[0];
    if (regionalData.regions[firstRegion]) {
      regionalData.regions[firstRegion].data.forEach(d => {
        if (d.year >= 2000) { // Show from 2000 onwards for clarity
          years.push(d.year);
        }
      });
    }

    return years.map(year => {
      const point = { year };
      selectedRegions.forEach(region => {
        const regionData = regionalData.regions[region]?.data;
        if (regionData) {
          const yearData = regionData.find(d => d.year === year);
          if (yearData) {
            // Calculate displacement (clean energy growth from previous year)
            const prevYearData = regionData.find(d => d.year === year - 1);
            if (prevYearData) {
              const cleanGrowth = (yearData.clean_useful_ej || 0) - (prevYearData.clean_useful_ej || 0);
              point[region] = cleanGrowth;
            }
          }
        }
      });
      return point;
    });
  }, [regionalData, selectedRegions]);

  // Get comparison data for bar chart
  const comparisonData = useMemo(() => {
    if (!displacementData || !selectedRegions.length) return [];

    return selectedRegions
      .filter(region => displacementData[region] && displacementData[region][selectedPeriod])
      .map(region => displacementData[region][selectedPeriod])
      .sort((a, b) => b.annualCleanGrowth - a.annualCleanGrowth);
  }, [displacementData, selectedRegions, selectedPeriod]);

  const toggleRegion = (region) => {
    if (selectedRegions.includes(region)) {
      if (selectedRegions.length > 1) {
        setSelectedRegions(selectedRegions.filter(r => r !== region));
      }
    } else {
      if (selectedRegions.length < 8) {
        setSelectedRegions([...selectedRegions, region]);
      }
    }
  };

  const selectCategory = (category) => {
    const regions = REGION_CATEGORIES[category];
    setSelectedRegions(regions.slice(0, 8)); // Max 8 regions
  };

  if (loading || !regionalData || !displacementData) {
    return <div className="text-center py-8">Loading regional displacement data...</div>;
  }

  const downloadPNG = () => {
    downloadChartAsPNG(chartRef, `displacement_by_region_${selectedPeriod}`);
  };

  const downloadCSV = () => {
    const csvData = [];
    csvData.push(['Region', 'Period', 'Clean Growth (EJ)', 'Annual Clean Growth (EJ/yr)', 'Fossil Change (EJ)', 'Annual Fossil Change (EJ/yr)', 'Net Change (EJ)', 'Displacement Rate (%)']);

    comparisonData.forEach(d => {
      csvData.push([
        d.name,
        d.period,
        d.cleanGrowth.toFixed(3),
        d.annualCleanGrowth.toFixed(3),
        d.fossilChange.toFixed(3),
        d.annualFossilChange.toFixed(3),
        d.netChange.toFixed(3),
        d.displacementRate.toFixed(2)
      ]);
    });

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `displacement_by_region_${selectedPeriod}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    if (viewMode === 'timeline') {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <div className="font-bold text-lg mb-3">{label}</div>
          <div className="space-y-2 text-sm">
            {payload.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="font-medium">{entry.name}:</span>
                <span className={entry.value > 0 ? 'text-green-600' : 'text-red-600'}>
                  {entry.value > 0 ? '+' : ''}{entry.value?.toFixed(3)} EJ/year
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <div className="font-bold text-lg mb-3" style={{ color: data.color }}>{data.name}</div>
        <div className="space-y-2 text-sm">
          <div className="border-b pb-2 mb-2">
            <strong>Clean Energy Growth:</strong>
            <div className="text-green-600 font-semibold">
              +{data.annualCleanGrowth.toFixed(3)} EJ/year ({data.cleanGrowth.toFixed(2)} EJ total)
            </div>
          </div>
          <div className="border-b pb-2 mb-2">
            <strong>Fossil Fuel Change:</strong>
            <div className={data.fossilChange < 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
              {data.annualFossilChange > 0 ? '+' : ''}{data.annualFossilChange.toFixed(3)} EJ/year
            </div>
          </div>
          <div>
            <strong>Displacement Rate:</strong>
            <div className="text-blue-600 font-semibold">
              {data.displacementRate.toFixed(1)}% of fossil base
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getChartHeight = () => {
    if (isFullscreen) {
      return width < 640 ? 500 : width < 1024 ? 700 : 800;
    }
    return 450;
  };

  const renderChartContent = () => (
    <>
      {/* Period and View Mode Selectors */}
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">Time Period:</label>
          <div className="flex gap-2 flex-wrap">
            {['current', '5year', '10year', '20year'].map(period => {
              const labels = { current: '1 Year', '5year': '5 Years', '10year': '10 Years', '20year': '20 Years' };
              return (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                    selectedPeriod === period
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {labels[period]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">View:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('comparison')}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                viewMode === 'comparison'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Comparison
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                viewMode === 'timeline'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Timeline
            </button>
          </div>
        </div>
      </div>

      {/* Region Selection */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          Select Regions to Compare (max 8):
        </label>
        <div className="flex gap-2 mb-3 flex-wrap">
          {Object.keys(REGION_CATEGORIES).map(category => (
            <button
              key={category}
              onClick={() => selectCategory(category)}
              className="px-3 py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
            >
              {category}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.keys(regionalData.regions).map(region => (
            <button
              key={region}
              onClick={() => toggleRegion(region)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedRegions.includes(region)
                  ? 'ring-2 ring-offset-1'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={selectedRegions.includes(region) ? {
                backgroundColor: getRegionColor(region),
                color: 'white',
                ringColor: getRegionColor(region)
              } : {}}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        {viewMode === 'comparison' ? (
          <>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Annual Clean Energy Growth by Region</h3>
            <ResponsiveContainer width="100%" height={getChartHeight()}>
              <BarChart
                data={comparisonData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  label={{
                    value: 'Annual Displacement (EJ/year)',
                    position: 'insideBottom',
                    offset: -10,
                    style: { fontSize: 13, fontWeight: 600 }
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 13 }}
                  width={110}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x={0} stroke="#000" strokeWidth={1} />
                <Bar dataKey="annualCleanGrowth" radius={[0, 4, 4, 0]}>
                  {comparisonData.map((entry, index) => (
                    <rect key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Annual Clean Energy Growth Over Time</h3>
            <ResponsiveContainer width="100%" height={getChartHeight()}>
              <LineChart
                data={timelineData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  label={{
                    value: 'Displacement (EJ/year)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 13, fontWeight: 600 }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                {selectedRegions.map(region => (
                  <Line
                    key={region}
                    type="monotone"
                    dataKey={region}
                    stroke={getRegionColor(region)}
                    strokeWidth={2}
                    dot={false}
                    name={region}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Summary Table */}
      {viewMode === 'comparison' && (
        <div className="mt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Regional Comparison Table</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Region</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Clean Growth</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Fossil Change</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Net Change</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Displacement Rate</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((d, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="font-medium">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-green-600 font-semibold">
                        +{d.annualCleanGrowth.toFixed(3)} EJ/yr
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={d.annualFossilChange < 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {d.annualFossilChange > 0 ? '+' : ''}{d.annualFossilChange.toFixed(3)} EJ/yr
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={d.netChange < 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {d.netChange > 0 ? '+' : ''}{d.annualNetChange.toFixed(3)} EJ/yr
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-600">
                      {d.displacementRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center mt-4">
        Data sources: Our World in Data, BP Statistical Review, Energy Institute
      </div>
    </>
  );

  return (
    <>
      {/* Normal View */}
      <div className="metric-card bg-white mb-16">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Displacement by Region
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
        title="Displacement by Region"
        description="Compare fossil fuel displacement rates across different countries and regions"
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

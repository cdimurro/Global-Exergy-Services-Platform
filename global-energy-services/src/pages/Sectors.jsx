import { useState, useEffect, useRef } from 'react';
import { useWindowSize } from '@react-hook/window-size';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import PageLayout from '../components/PageLayout';
import AIChatbot from '../components/AIChatbot';
import { downloadChartAsPNG, downloadDataAsCSV, ChartExportButtons, ChartSources } from '../utils/chartExport';
import ChartFullscreenModal from '../components/ChartFullscreenModal';
import FullscreenButton from '../components/FullscreenButton';

export default function Sectors() {
  const [width] = useWindowSize();
  const [sectorData, setSectorData] = useState(null);
  const [exergyData, setExergyData] = useState(null);
  const [exergyTimeseries, setExergyTimeseries] = useState(null);
  const [loading, setLoading] = useState(true);

  // Interactive chart state
  const [viewMode, setViewMode] = useState('absolute'); // 'absolute' or 'percentage'

  // Chart refs
  const sectorBreakdownChartRef = useRef(null);
  const fossilCleanChartRef = useRef(null);
  const timeseriesChartRef = useRef(null);

  // Fullscreen states
  const [isFullscreenChart1, setIsFullscreenChart1] = useState(false);
  const [isFullscreenChart2, setIsFullscreenChart2] = useState(false);
  const [isFullscreenChart3, setIsFullscreenChart3] = useState(false);

  // Force scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/data/sectoral_energy_breakdown_v2.json').then(res => res.json()),
      fetch('/data/exergy_services_timeseries.json').then(res => res.json()),
      fetch('/data/sectoral_energy_timeseries_2004_2024.json').then(res => res.json())
    ])
      .then(([sectorJson, exergyJson, sectorTimeseriesJson]) => {
        setSectorData(sectorJson);
        // Get 2024 data
        const latestYear = exergyJson.data[exergyJson.data.length - 1];
        setExergyData(latestYear);
        setExergyTimeseries(sectorTimeseriesJson); // Use new sectoral timeseries
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading data:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !sectorData || !exergyData || !exergyTimeseries) {
    return <div className="text-center py-8">Loading sectoral data...</div>;
  }

  const totalServices = exergyData.total_services_ej;

  // Prepare sector breakdown data from v2.0 structure
  const sectorBreakdownData = Object.entries(sectorData.sectors)
    .map(([sector, sectorInfo]) => {
      const share = sectorInfo.share;
      const servicesEJ = share * totalServices;
      const fossilIntensity = sectorInfo.fossil_intensity;
      const fossilEJ = servicesEJ * fossilIntensity;
      const cleanEJ = servicesEJ * (1 - fossilIntensity);

      return {
        sector,
        name: formatSectorName(sector),
        share: share * 100,
        servicesEJ,
        fossilEJ,
        cleanEJ,
        fossilIntensity,
        description: sectorInfo.description
      };
    })
    .sort((a, b) => b.servicesEJ - a.servicesEJ);

  // Prepare fossil vs clean data
  const fossilCleanData = sectorBreakdownData.map(s => ({
    name: s.name,
    sector: s.sector,
    fossil: s.fossilEJ,
    clean: s.cleanEJ,
    fossilIntensity: s.fossilIntensity
  }));

  // Prepare historical sectoral timeseries data from v2.0 sectoral timeseries
  const timeseriesData = exergyTimeseries.data.map(yearData => {
    const dataPoint = { year: yearData.year };

    // Extract sector totals from the new sectoral timeseries structure
    Object.entries(yearData.sectors).forEach(([sectorKey, sectorData]) => {
      dataPoint[sectorKey] = sectorData.total_ej;
    });

    return dataPoint;
  });

  // Convert to percentage if needed
  const timeseriesDataProcessed = viewMode === 'percentage'
    ? timeseriesData.map(row => {
        const total = Object.values(row).reduce((sum, val) =>
          typeof val === 'number' ? sum + val : sum, 0);
        const newRow = { year: row.year };
        Object.keys(row).forEach(key => {
          if (key !== 'year') {
            newRow[key] = (row[key] / total) * 100;
          }
        });
        return newRow;
      })
    : timeseriesData;

  // Chart heights
  const getChart1Height = () => width < 640 ? 500 : width < 1024 ? 600 : 700;
  const getChart2Height = () => width < 640 ? 400 : width < 1024 ? 500 : 600;
  const getChart3Height = () => width < 640 ? 400 : width < 1024 ? 450 : 500;

  // Export handlers
  const handleDownloadBreakdownPNG = () => {
    downloadChartAsPNG(sectorBreakdownChartRef, 'sectoral-energy-breakdown-2024');
  };

  const handleDownloadBreakdownCSV = () => {
    const csvData = sectorBreakdownData.map(s => ({
      'Sector': s.name,
      'Energy Services (EJ)': s.servicesEJ.toFixed(2),
      'Share (%)': s.share.toFixed(1),
      'Fossil (EJ)': s.fossilEJ.toFixed(2),
      'Clean (EJ)': s.cleanEJ.toFixed(2)
    }));
    downloadDataAsCSV(csvData, 'sectoral-energy-breakdown-2024');
  };

  const handleDownloadFossilCleanPNG = () => {
    downloadChartAsPNG(fossilCleanChartRef, 'fossil-vs-clean-by-sector-2024');
  };

  const handleDownloadFossilCleanCSV = () => {
    const csvData = fossilCleanData.map(s => ({
      'Sector': s.name,
      'Fossil (EJ)': s.fossil.toFixed(2),
      'Clean (EJ)': s.clean.toFixed(2),
      'Fossil Intensity (%)': (s.fossilIntensity * 100).toFixed(1)
    }));
    downloadDataAsCSV(csvData, 'fossil-vs-clean-by-sector-2024');
  };

  const handleDownloadTimeseriesPNG = () => {
    downloadChartAsPNG(timeseriesChartRef, 'sectoral-energy-evolution-2004-2024');
  };

  const handleDownloadTimeseriesCSV = () => {
    downloadDataAsCSV(timeseriesData, 'sectoral-energy-evolution-2004-2024');
  };

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-3">
          Sectors
        </h1>
        <p className="text-sm text-gray-600">
          Explore how energy services are delivered across different sectors of the global economy
        </p>
      </div>

      {/* Chart 1: Interactive Sectoral Energy Services Breakdown */}
      <div className="metric-card bg-white mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Sectoral Energy Services (2024)
          </h2>
          <div className="flex gap-2">
            <ChartExportButtons
              onDownloadPNG={handleDownloadBreakdownPNG}
              onDownloadCSV={handleDownloadBreakdownCSV}
            />
            <FullscreenButton onClick={() => setIsFullscreenChart1(true)} />
          </div>
        </div>

        <div ref={sectorBreakdownChartRef}>
          <ResponsiveContainer width="100%" height={getChart1Height()}>
            <BarChart
              data={sectorBreakdownData}
              layout="vertical"
              margin={{ left: 150 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: 'Energy Services (EJ)', position: 'insideBottom', offset: -5 }} />
              <YAxis type="category" dataKey="name" width={145} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="servicesEJ" fill="#3B82F6" name="Energy Services (EJ)">
                {sectorBreakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getSectorColor(entry.sector)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <ChartSources sources={sectorData.metadata.sources} />
        </div>
      </div>

      {/* Chart 1 Fullscreen Modal */}
      <ChartFullscreenModal
        isOpen={isFullscreenChart1}
        onClose={() => setIsFullscreenChart1(false)}
        title="Sectoral Energy Services (2024)"
        description="Total energy services delivered by each sector of the global economy"
        exportButtons={
          <ChartExportButtons
            onDownloadPNG={handleDownloadBreakdownPNG}
            onDownloadCSV={handleDownloadBreakdownCSV}
          />
        }
      >
        <ResponsiveContainer width="100%" height={getChart1Height()}>
          <BarChart
            data={sectorBreakdownData}
            layout="vertical"
            margin={{ left: 150 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" label={{ value: 'Energy Services (EJ)', position: 'insideBottom', offset: -5 }} />
            <YAxis type="category" dataKey="name" width={145} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="servicesEJ" fill="#3B82F6" name="Energy Services (EJ)">
              {sectorBreakdownData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getSectorColor(entry.sector)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <ChartSources sources={sectorData.metadata.sources} />
      </ChartFullscreenModal>

      {/* Chart 2: Fossil vs Clean by Sector */}
      <div className="metric-card bg-white mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Fossil vs. Clean Energy by Sector (2024)
          </h2>
          <div className="flex gap-2">
            <ChartExportButtons
              onDownloadPNG={handleDownloadFossilCleanPNG}
              onDownloadCSV={handleDownloadFossilCleanCSV}
            />
            <FullscreenButton onClick={() => setIsFullscreenChart2(true)} />
          </div>
        </div>
        <div ref={fossilCleanChartRef}>
          <ResponsiveContainer width="100%" height={getChart2Height()}>
            <BarChart data={fossilCleanData} layout="vertical" margin={{ left: 150 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: 'Energy Services (EJ)', position: 'insideBottom', offset: -5 }} />
              <YAxis type="category" dataKey="name" width={145} />
              <Tooltip content={<FossilCleanTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="fossil" stackId="a" fill="#DC2626" name="Fossil Fuels" />
              <Bar dataKey="clean" stackId="a" fill="#16A34A" name="Clean Energy" />
            </BarChart>
          </ResponsiveContainer>
          <ChartSources sources={sectorData.metadata.sources} />
        </div>
      </div>

      {/* Chart 2 Fullscreen Modal */}
      <ChartFullscreenModal
        isOpen={isFullscreenChart2}
        onClose={() => setIsFullscreenChart2(false)}
        title="Fossil vs. Clean Energy by Sector (2024)"
        description="Breakdown of fossil and clean energy services delivered by each sector"
        exportButtons={
          <ChartExportButtons
            onDownloadPNG={handleDownloadFossilCleanPNG}
            onDownloadCSV={handleDownloadFossilCleanCSV}
          />
        }
      >
        <ResponsiveContainer width="100%" height={getChart2Height()}>
          <BarChart data={fossilCleanData} layout="vertical" margin={{ left: 150 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" label={{ value: 'Energy Services (EJ)', position: 'insideBottom', offset: -5 }} />
            <YAxis type="category" dataKey="name" width={145} />
            <Tooltip content={<FossilCleanTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="fossil" stackId="a" fill="#DC2626" name="Fossil Fuels" />
            <Bar dataKey="clean" stackId="a" fill="#16A34A" name="Clean Energy" />
          </BarChart>
        </ResponsiveContainer>
        <ChartSources sources={sectorData.metadata.sources} />
      </ChartFullscreenModal>

      {/* Chart 3: Sectoral Energy Evolution Over Time */}
      <div className="metric-card bg-white mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Sectoral Energy Evolution (2004-2024)
          </h2>
          <div className="flex gap-2">
            <ChartExportButtons
              onDownloadPNG={handleDownloadTimeseriesPNG}
              onDownloadCSV={handleDownloadTimeseriesCSV}
            />
            <FullscreenButton onClick={() => setIsFullscreenChart3(true)} />
          </div>
        </div>
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-700 mr-2">Display Mode:</label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="absolute">Absolute (EJ)</option>
            <option value="percentage">Relative (%)</option>
          </select>
        </div>
        <div ref={timeseriesChartRef}>
          <ResponsiveContainer width="100%" height={getChart3Height()}>
            <AreaChart data={timeseriesDataProcessed}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis label={{ value: viewMode === 'percentage' ? 'Share (%)' : 'Exergy Services (EJ)', angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<TimeseriesTooltip viewMode={viewMode} />} />
              <Legend />
              {sectorBreakdownData.slice(0, 8).map((sector) => (
                <Area
                  key={sector.sector}
                  type="monotone"
                  dataKey={sector.sector}
                  stackId="1"
                  fill={getSectorColor(sector.sector)}
                  stroke={getSectorColor(sector.sector)}
                  name={sector.name}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          <ChartSources sources={sectorData.metadata.sources} />
        </div>
      </div>

      {/* Chart 3 Fullscreen Modal */}
      <ChartFullscreenModal
        isOpen={isFullscreenChart3}
        onClose={() => setIsFullscreenChart3(false)}
        title="Sectoral Energy Evolution (2004-2024)"
        description="Historical evolution of energy services by sector"
        exportButtons={
          <ChartExportButtons
            onDownloadPNG={handleDownloadTimeseriesPNG}
            onDownloadCSV={handleDownloadTimeseriesCSV}
          />
        }
      >
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-700 mr-2">Display Mode:</label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="absolute">Absolute (EJ)</option>
            <option value="percentage">Relative (%)</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={getChart3Height()}>
          <AreaChart data={timeseriesDataProcessed}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis label={{ value: viewMode === 'percentage' ? 'Share (%)' : 'Exergy Services (EJ)', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<TimeseriesTooltip viewMode={viewMode} />} />
            <Legend />
            {sectorBreakdownData.slice(0, 8).map((sector) => (
              <Area
                key={sector.sector}
                type="monotone"
                dataKey={sector.sector}
                stackId="1"
                fill={getSectorColor(sector.sector)}
                stroke={getSectorColor(sector.sector)}
                name={sector.name}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        <ChartSources sources={sectorData.metadata.sources} />
      </ChartFullscreenModal>

      {/* Understanding Sectors */}
      <div className="metric-card bg-white mb-8 border-2 border-blue-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Understanding Energy Sectors
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Sectoral Distribution
            </h3>
            <p className="text-gray-700">
              Global energy services are dominated by transportation (26%), industrial processes (47%), and buildings (33%).
              Understanding sectoral breakdown helps identify where decarbonization efforts should focus.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Fossil Dependence
            </h3>
            <p className="text-gray-700">
              Transport sectors (road, aviation, shipping) show 95-100% fossil dependence, while residential and commercial buildings
              have significantly lower fossil intensity due to electricity adoption and heat pumps.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Clean Energy Growth
            </h3>
            <p className="text-gray-700">
              Sectors with existing clean energy adoption (residential appliances, cooling, aluminum production) demonstrate
              the viability of electrification. EVs now represent ~4% of road transport energy services globally.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Hard-to-Abate Sectors
            </h3>
            <p className="text-gray-700">
              Aviation, shipping, and heavy industry (cement, chemicals) remain nearly entirely fossil-dependent, requiring
              alternative solutions like sustainable fuels, hydrogen, or carbon capture.
            </p>
          </div>
        </div>
      </div>

      {/* AI Chatbot */}
      <div className="mb-8">
        <AIChatbot />
      </div>
    </PageLayout>
  );
}

// Helper functions
function formatSectorName(sector) {
  return sector
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getSectorColor(sector) {
  const colorMap = {
    transport_road: '#EF4444',
    transport_aviation: '#DC2626',
    transport_shipping: '#B91C1C',
    transport_rail: '#991B1B',
    industry_iron_steel: '#6366F1',
    industry_chemicals: '#4F46E5',
    industry_cement: '#4338CA',
    industry_aluminum: '#3730A3',
    industry_pulp_paper: '#312E81',
    other_industry: '#1E1B4B',
    residential_heating: '#F59E0B',
    residential_appliances: '#D97706',
    residential_cooling: '#B45309',
    commercial_buildings: '#10B981',
    agriculture: '#84CC16'
  };
  return colorMap[sector] || '#6B7280';
}

// Custom tooltip component for sectoral breakdown
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
        <p className="font-bold text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-700">Energy Services: {data.servicesEJ.toFixed(2)} EJ</p>
        <p className="text-sm text-gray-700">Share: {data.share.toFixed(2)}%</p>
        <p className="text-sm text-gray-700">Fossil: {data.fossilEJ.toFixed(2)} EJ ({(data.fossilIntensity * 100).toFixed(2)}%)</p>
        <p className="text-sm text-gray-700">Clean: {data.cleanEJ.toFixed(2)} EJ ({((1 - data.fossilIntensity) * 100).toFixed(2)}%)</p>
      </div>
    );
  }
  return null;
};

// Custom tooltip for fossil vs clean chart
const FossilCleanTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = data.fossil + data.clean;
    const fossilPercent = (data.fossil / total) * 100;
    const cleanPercent = (data.clean / total) * 100;

    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
        <p className="font-bold text-gray-900 mb-2">{data.name}</p>
        <p className="text-sm text-red-700">Fossil Fuels: {data.fossil.toFixed(2)} EJ ({fossilPercent.toFixed(2)}%)</p>
        <p className="text-sm text-green-700">Clean Energy: {data.clean.toFixed(2)} EJ ({cleanPercent.toFixed(2)}%)</p>
      </div>
    );
  }
  return null;
};

// Custom tooltip for sectoral evolution timeseries
const TimeseriesTooltip = ({ active, payload, viewMode }) => {
  if (active && payload && payload.length) {
    // Calculate total for percentage calculation
    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg max-h-96 overflow-y-auto">
        <p className="font-bold text-gray-900 mb-2">{payload[0].payload.year}</p>
        {viewMode === 'absolute' && (
          <p className="text-sm text-gray-700 mb-2 font-semibold">Total: {total.toFixed(2)} EJ</p>
        )}
        <div className="space-y-1">
          {payload.map((entry, index) => {
            const percent = total > 0 ? (entry.value / total) * 100 : 0;
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {viewMode === 'absolute'
                  ? `${entry.value.toFixed(2)} EJ (${percent.toFixed(2)}%)`
                  : `${entry.value.toFixed(2)}%`
                }
              </p>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

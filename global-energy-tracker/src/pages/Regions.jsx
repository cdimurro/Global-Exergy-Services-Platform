import { useState, useEffect, useMemo } from 'react';
import PageLayout from '../components/PageLayout';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ENERGY_COLORS, getSourceName, REGION_COLORS, getRegionColor } from '../utils/colors';
import { downloadChartAsPNG, downloadDataAsCSV, ChartExportButtons } from '../utils/chartExport';
import ChartFullscreenModal from '../components/ChartFullscreenModal';
import FullscreenButton from '../components/FullscreenButton';
import { useWindowSize } from '@react-hook/window-size';
import AIChatbot from '../components/AIChatbot';

const ENERGY_SOURCES = ['coal', 'oil', 'gas', 'nuclear', 'hydro', 'wind', 'solar', 'biofuels', 'other_renewables'];
const FOSSIL_SOURCES = ['coal', 'oil', 'gas'];
const CLEAN_SOURCES = ['nuclear', 'hydro', 'wind', 'solar', 'biofuels', 'other_renewables'];

// Helper function to handle both _services_ej and _useful_ej field names for backward compatibility
const getEnergyValue = (data, field) => {
  if (!data) return 0;
  // Try services field first (new format), fall back to useful field (old format)
  const servicesField = field.replace('_useful_', '_services_');
  return data[servicesField] || data[field] || 0;
};

const getSourcesObject = (data) => {
  if (!data) return {};
  // Try services field first (new format), fall back to useful field (old format)
  return data.sources_services_ej || data.sources_useful_ej || {};
};

const AVAILABLE_REGIONS = [
  // Global first
  'Global',
  // Continental regions (alphabetical)
  'Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America',
  // Major countries (alphabetical)
  'Australia', 'Brazil', 'Canada', 'China', 'France', 'Germany',
  'India', 'Indonesia', 'Japan', 'Mexico', 'Russia', 'Saudi Arabia',
  'South Africa', 'South Korea', 'United Kingdom', 'United States'
];

export default function Regions() {
  const [width] = useWindowSize();  // Dynamic window size for responsive charts
  const [regionalData, setRegionalData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fullscreen states
  const [isFullscreenChart1, setIsFullscreenChart1] = useState(false);
  const [isFullscreenChart2, setIsFullscreenChart2] = useState(false);
  const [isFullscreenChart3, setIsFullscreenChart3] = useState(false);

  // Filter states
  const [selectedRegions, setSelectedRegions] = useState(['United States']);
  const [selectedSource, setSelectedSource] = useState('all'); // Single source for regions mode - default to "all"
  const [selectedSources, setSelectedSources] = useState([]); // Multiple sources for sources mode - starts empty when category is active
  const [selectedRegion, setSelectedRegion] = useState('United States'); // Single region for sources mode - default to US
  const [selectedRegionForMix, setSelectedRegionForMix] = useState('United States');
  const [viewMode, setViewMode] = useState('regions'); // 'regions' or 'sources'
  const [quickFilterRegions, setQuickFilterRegions] = useState('all'); // 'all', 'fossil', 'clean' for regions mode
  const [quickFilterSources, setQuickFilterSources] = useState('all'); // 'all', 'fossil', 'clean' for sources mode - when active, selectedSources is ignored
  const [showRelativeChart3, setShowRelativeChart3] = useState(false); // Show relative values for Chart 3
  const [showAnnualChange, setShowAnnualChange] = useState(false); // Show annual change instead of absolute values for Chart 1

  // Force scroll to top on mount
  useEffect(() => {
    // Use multiple methods to ensure scroll works
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Also try after a slight delay to ensure DOM is ready
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 10);

    return () => clearTimeout(timer);
  }, []);

  // Load regional and global data
  useEffect(() => {
    Promise.all([
      fetch('/data/regional_energy_timeseries.json').then(res => res.json()),
      fetch('/data/energy_services_timeseries.json').then(res => res.json())
    ])
      .then(([regionalData, globalData]) => {
        // Transform global data to match regional data structure
        // Convert from EJ to PJ by multiplying by 1000
        const globalRegionData = {
          data: globalData.data.map(yearData => {
            const sources = yearData.sources_services_ej || {};
            return {
              year: yearData.year,
              total_useful_ej: (yearData.total_services_ej || 0) * 1000,
              fossil_useful_ej: (yearData.fossil_services_ej || 0) * 1000,
              clean_useful_ej: (yearData.clean_services_ej || 0) * 1000,
              sources_useful_ej: {
                coal: (sources.coal || 0) * 1000,
                oil: (sources.oil || 0) * 1000,
                gas: (sources.gas || 0) * 1000,
                nuclear: (sources.nuclear || 0) * 1000,
                hydro: (sources.hydro || 0) * 1000,
                wind: (sources.wind || 0) * 1000,
                solar: (sources.solar || 0) * 1000,
                biofuels: (sources.biomass || 0) * 1000,
                other_renewables: ((sources.geothermal || 0) + (sources.other || 0)) * 1000
              },
              fossil_share_percent: yearData.fossil_share_percent || 0,
              clean_share_percent: yearData.clean_share_percent || 0,
              efficiency_percent: yearData.overall_efficiency || 0
            };
          })
        };

        // Add Global to regional data
        const mergedData = {
          ...regionalData,
          regions: {
            Global: globalRegionData,
            ...regionalData.regions
          }
        };

        setRegionalData(mergedData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading data:', err);
        setLoading(false);
      });
  }, []);

  // Get regions data (full time period: 1965-2024)
  const filteredByTime = useMemo(() => {
    if (!regionalData) return null;
    return regionalData.regions;
  }, [regionalData]);

  // Process data for Chart 1 (Regional comparison over time)
  const chart1Data = useMemo(() => {
    if (!filteredByTime) return [];

    // Get all years
    const firstRegion = Object.values(filteredByTime)[0];
    if (!firstRegion || !firstRegion.data.length) return [];

    const absoluteData = firstRegion.data
      .filter(yearEntry => yearEntry.year >= 1965) // Only show data from 1965-2024
      .map(yearEntry => {
        const row = { year: yearEntry.year };

        if (viewMode === 'regions') {
          // Compare Regions mode: Multiple regions, single energy source
          selectedRegions.forEach(region => {
            if (!filteredByTime[region]) return;

            const regionYearData = filteredByTime[region].data.find(d => d.year === yearEntry.year);
            if (!regionYearData) return;

            // Handle virtual source aggregations
            if (selectedSource === 'all') {
              // Sum all energy sources
              row[region] = getEnergyValue(regionYearData, 'total_useful_ej');
            } else if (selectedSource === 'fossil') {
              // Sum fossil fuel sources
              const fossilSources = ['coal', 'oil', 'gas'];
              const sourcesObj = getSourcesObject(regionYearData);
              row[region] = fossilSources.reduce((sum, source) =>
                sum + (sourcesObj[source] || 0), 0);
            } else if (selectedSource === 'clean') {
              // Sum clean energy sources
              const cleanSources = ['nuclear', 'hydro', 'wind', 'solar', 'biofuels', 'other_renewables'];
              const sourcesObj = getSourcesObject(regionYearData);
              row[region] = cleanSources.reduce((sum, source) =>
                sum + (sourcesObj[source] || 0), 0);
            } else {
              // Show the selected individual energy source for this region
              const sourcesObj = getSourcesObject(regionYearData);
              row[region] = sourcesObj[selectedSource] || 0;
            }
          });
        } else if (viewMode === 'sources') {
          // Compare Sources mode: Multiple sources, single region
          const regionYearData = filteredByTime[selectedRegion]?.data.find(d => d.year === yearEntry.year);
          if (!regionYearData) return row;

          // Determine which sources to show based on category filter or individual selections
          let sourcesToShow = [];
          if (quickFilterSources === 'all') {
            sourcesToShow = ENERGY_SOURCES;
          } else if (quickFilterSources === 'fossil') {
            sourcesToShow = FOSSIL_SOURCES;
          } else if (quickFilterSources === 'clean') {
            sourcesToShow = CLEAN_SOURCES;
          } else {
            // No category active, use individual selections
            sourcesToShow = selectedSources;
          }

          sourcesToShow.forEach(source => {
            const sourcesObj = getSourcesObject(regionYearData);
            row[source] = sourcesObj[source] || 0;
          });
        }

        return row;
      });

    // If showing annual change, calculate year-over-year differences
    if (showAnnualChange && absoluteData.length > 1) {
      return absoluteData.slice(1).map((row, index) => {
        const prevRow = absoluteData[index];
        const changeRow = { year: row.year };

        // Calculate change for each data key (excluding 'year')
        Object.keys(row).forEach(key => {
          if (key !== 'year') {
            changeRow[key] = row[key] - prevRow[key];
          }
        });

        return changeRow;
      });
    }

    return absoluteData;
  }, [filteredByTime, selectedRegions, selectedSource, viewMode, selectedSources, selectedRegion, quickFilterSources, showAnnualChange]);

  // Process data for Chart 2 (2024 snapshot comparison)
  const chart2Data = useMemo(() => {
    if (!regionalData) return [];

    return AVAILABLE_REGIONS
      .map(region => {
        const regionInfo = regionalData.regions[region];
        if (!regionInfo || !regionInfo.data.length) return null;

        const latest = regionInfo.data[regionInfo.data.length - 1];
        return {
          region,
          cleanShare: latest.clean_services_share_percent || latest.clean_share_percent || 0,
          efficiency: latest.efficiency_percent || 0,
          totalEnergy: getEnergyValue(latest, 'total_useful_ej')
        };
      })
      .filter(d => d !== null)
      .sort((a, b) => b.cleanShare - a.cleanShare);
  }, [regionalData]);

  // Process data for Chart 3 (Energy mix for selected region)
  const chart3Data = useMemo(() => {
    if (!filteredByTime || !selectedRegionForMix) return [];

    const regionInfo = filteredByTime[selectedRegionForMix];
    if (!regionInfo) return [];

    return regionInfo.data
      .filter(yearData => yearData.year >= 1965) // Only show 1965-2024
      .map(yearData => {
        const row = { year: yearData.year };
        const total = getEnergyValue(yearData, 'total_useful_ej');
        const sourcesObj = getSourcesObject(yearData);

        ENERGY_SOURCES.forEach(source => {
          const absoluteValue = sourcesObj[source] || 0;
          // If showing relative values, convert to percentage
          if (showRelativeChart3) {
            row[source] = total > 0 ? (absoluteValue / total * 100) : 0;
          } else {
            row[source] = absoluteValue;
          }
        });
        return row;
      });
  }, [filteredByTime, selectedRegionForMix, showRelativeChart3]);

  // Toggle region selection
  const toggleRegion = (region) => {
    setSelectedRegions(prev =>
      prev.includes(region)
        ? prev.filter(r => r !== region)
        : [...prev, region]
    );
  };

  const selectAllRegions = () => setSelectedRegions(AVAILABLE_REGIONS);
  const clearRegions = () => setSelectedRegions([]);

  // Chart height functions
  const getChart1Height = () => {
    if (isFullscreenChart1) {
      // Chart 1 has many controls (region selection, source filter, view mode toggle)
      return width < 640 ? 400 : width < 1024 ? 600 : 750;
    }
    return 500;
  };

  const getChart2Height = () => {
    if (isFullscreenChart2) {
      // Chart 2 is simpler (no controls), maximize screen usage
      return width < 640 ? 500 : width < 1024 ? 700 : 850;
    }
    return 500;
  };

  const getChart3Height = () => {
    if (isFullscreenChart3) {
      // Chart 3 has controls (region selection, source selection, relative toggle)
      return width < 640 ? 400 : width < 1024 ? 600 : 750;
    }
    return 500;
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="text-center py-16">
          <div className="text-lg text-gray-600">Loading regional data...</div>
        </div>
      </PageLayout>
    );
  }

  if (!regionalData) {
    return (
      <PageLayout>
        <div className="text-center py-16">
          <div className="text-lg text-red-600">Error loading regional data. Please refresh the page.</div>
        </div>
      </PageLayout>
    );
  }

  // Get Y-axis label based on view mode and annual change toggle
  const getYAxisLabel = () => {
    const changePrefix = showAnnualChange ? 'Annual Change in ' : '';
    const changeSuffix = showAnnualChange ? ' (PJ/year)' : ' (PJ)';

    if (viewMode === 'regions') {
      // Handle virtual source labels
      if (selectedSource === 'all') {
        return changePrefix + 'All Sources Energy Services' + changeSuffix;
      } else if (selectedSource === 'fossil') {
        return changePrefix + 'Fossil Fuels Energy Services' + changeSuffix;
      } else if (selectedSource === 'clean') {
        return changePrefix + 'Clean Energy Services' + changeSuffix;
      }
      return changePrefix + `${getSourceName(selectedSource)} Energy Services` + changeSuffix;
    } else {
      return changePrefix + 'Energy Services' + changeSuffix;
    }
  };

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-3">
          Regional Energy Transition Analysis
        </h1>
        <p className="text-sm text-gray-600">
          Compare energy service efficiency, clean energy adoption, and transition progress across global regions
        </p>
      </div>

      {/* Chart 1: Regional Energy Services Over Time */}
      <div className="metric-card bg-white mb-8 pb-8" id="chart-regional-timeseries">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              Regional Energy Services Over Time
            </h2>
            <p className="text-sm text-gray-600">
              Compare energy service demand evolution across selected regions
            </p>
          </div>
          <div className="flex gap-2">
            <ChartExportButtons
              onDownloadPNG={() => downloadChartAsPNG('#chart-regional-timeseries', 'regional_energy_timeseries.png')}
              onDownloadCSV={() => {
                downloadDataAsCSV(chart1Data, 'regional_energy_timeseries.csv');
              }}
            />
            <FullscreenButton onClick={() => setIsFullscreenChart1(true)} />
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
          {/* View Mode Selection and Annual Change Toggle */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
              <label className="block text-lg font-semibold text-gray-700">
                View Mode
              </label>
              {/* Annual Change Toggle */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">View Annual Change</label>
                <button
                  onClick={() => setShowAnnualChange(!showAnnualChange)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showAnnualChange ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showAnnualChange ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setViewMode('regions')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  viewMode === 'regions'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Compare Regions
              </button>
              <button
                onClick={() => setViewMode('sources')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  viewMode === 'sources'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Compare Energy Sources
              </button>
            </div>
          </div>

          {viewMode === 'regions' ? (
            <>
              {/* Multiple Regions Selection */}
              <div className="mb-6">
                <label className="block text-lg font-semibold mb-3 text-gray-700">
                  Select Regions
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {AVAILABLE_REGIONS.map(region => (
                    <button
                      key={region}
                      onClick={() => toggleRegion(region)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        selectedRegions.includes(region)
                          ? 'text-white ring-2 ring-2-offset-2'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      style={{
                        backgroundColor: selectedRegions.includes(region) ? getRegionColor(region) : undefined,
                        ringColor: getRegionColor(region)
                      }}
                    >
                      {region}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2" style={{ minHeight: '44px' }}>
                  <button
                    onClick={selectAllRegions}
                    className="px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearRegions}
                    className="px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Single Energy Source Selection */}
              <div>
                <label className="block text-lg font-semibold mb-3 text-gray-700">
                  Select Energy Source
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedSource('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      selectedSource === 'all'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All Sources
                  </button>
                  <button
                    onClick={() => setSelectedSource('fossil')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      selectedSource === 'fossil'
                        ? 'bg-red-600 text-white ring-2 ring-red-600 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Fossil Fuels
                  </button>
                  <button
                    onClick={() => setSelectedSource('clean')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      selectedSource === 'clean'
                        ? 'bg-green-600 text-white ring-2 ring-green-600 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Clean Energy
                  </button>
                  {ENERGY_SOURCES.map(source => (
                    <button
                      key={source}
                      onClick={() => setSelectedSource(source)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        selectedSource === source
                          ? 'text-white ring-2 ring-offset-2'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      style={{
                        backgroundColor: selectedSource === source ? ENERGY_COLORS[source] : undefined,
                        ringColor: ENERGY_COLORS[source]
                      }}
                    >
                      {getSourceName(source)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Single Region Selection */}
              <div className="mb-6">
                <label className="block text-lg font-semibold mb-3 text-gray-700">
                  Select Region
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_REGIONS.map(region => (
                    <button
                      key={region}
                      onClick={() => setSelectedRegion(region)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        selectedRegion === region
                          ? 'text-white ring-2 ring-offset-2'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      style={{
                        backgroundColor: selectedRegion === region ? getRegionColor(region) : undefined,
                        ringColor: getRegionColor(region)
                      }}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>

              {/* Multiple Energy Sources Selection */}
              <div>
                <label className="block text-lg font-semibold mb-3 text-gray-700">
                  Select Energy Sources
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      // Just set the category filter - the chart data logic will handle which sources to show
                      setQuickFilterSources('all');
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      quickFilterSources === 'all'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All Sources
                  </button>
                  <button
                    onClick={() => {
                      // Just set the category filter - the chart data logic will handle which sources to show
                      setQuickFilterSources('fossil');
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      quickFilterSources === 'fossil'
                        ? 'bg-red-600 text-white ring-2 ring-red-600 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Fossil Fuels
                  </button>
                  <button
                    onClick={() => {
                      // Just set the category filter - the chart data logic will handle which sources to show
                      setQuickFilterSources('clean');
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      quickFilterSources === 'clean'
                        ? 'bg-green-600 text-white ring-2 ring-green-600 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Clean Energy
                  </button>
                  {ENERGY_SOURCES.map(source => (
                    <button
                      key={source}
                      onClick={() => {
                        // When clicking individual source:
                        // 1. Clear category filter to switch to individual selection mode
                        // 2. Toggle the source (add if not present, remove if present)
                        setQuickFilterSources(null);
                        setSelectedSources(prev => {
                          if (prev.includes(source)) {
                            // Source is already selected, remove it
                            return prev.filter(s => s !== source);
                          } else {
                            // Source is not selected, add it
                            return [...prev, source];
                          }
                        });
                      }}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        quickFilterSources === null && selectedSources.includes(source)
                          ? 'text-white ring-2 ring-offset-2'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      style={{
                        backgroundColor: (quickFilterSources === null && selectedSources.includes(source)) ? ENERGY_COLORS[source] : undefined,
                        ringColor: ENERGY_COLORS[source]
                      }}
                    >
                      {getSourceName(source)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <ResponsiveContainer width="100%" height={getChart1Height()}>
          <LineChart
            data={chart1Data}
            margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis label={{ value: getYAxisLabel(), angle: -90, position: 'insideLeft' }} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;

              // Determine what sources are being shown
              let sourcesLabel = '';
              if (viewMode === 'regions') {
                if (selectedSource === 'all') {
                  sourcesLabel = 'All Sources';
                } else if (selectedSource === 'fossil') {
                  sourcesLabel = 'Fossil Fuels (Coal, Oil, Gas)';
                } else if (selectedSource === 'clean') {
                  sourcesLabel = 'Clean Energy (Nuclear, Hydro, Wind, Solar, Biofuels, Other Renewables)';
                } else {
                  sourcesLabel = getSourceName(selectedSource);
                }
              } else {
                // In sources mode, show which sources are selected
                if (quickFilterSources === 'all') {
                  sourcesLabel = 'All Sources';
                } else if (quickFilterSources === 'fossil') {
                  sourcesLabel = 'Fossil Fuels (Coal, Oil, Gas)';
                } else if (quickFilterSources === 'clean') {
                  sourcesLabel = 'Clean Energy (Nuclear, Hydro, Wind, Solar, Biofuels, Other Renewables)';
                } else {
                  sourcesLabel = selectedSources.map(s => getSourceName(s)).join(', ');
                }
              }

              // Sort payload based on selection order (left to right)
              const sortedPayload = viewMode === 'regions'
                ? [...payload].sort((a, b) => {
                    const indexA = selectedRegions.indexOf(a.name);
                    const indexB = selectedRegions.indexOf(b.name);
                    return indexA - indexB;
                  })
                : payload;

              // Calculate total of all selected sources
              const totalEJ = sortedPayload.reduce((sum, entry) => sum + entry.value, 0);

              // Get total for region to calculate percentage
              const regionName = viewMode === 'regions'
                ? (sortedPayload[0]?.name || selectedRegion)
                : selectedRegion;
              const yearData = filteredByTime?.[regionName]?.data.find(d => d.year === label);
              const totalForRegion = getEnergyValue(yearData, 'total_useful_ej');
              const totalPercentage = totalForRegion > 0 ? (totalEJ / totalForRegion * 100) : 0;

              // Split sorted payload into columns for better display
              const itemsPerColumn = Math.ceil(sortedPayload.length / 2);
              const column1 = sortedPayload.slice(0, itemsPerColumn);
              const column2 = sortedPayload.slice(itemsPerColumn);

              return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-2xl">
                  <div className="font-bold text-lg mb-2">{label}</div>
                  <div className="text-xs text-gray-500 mb-2 italic">{sourcesLabel}</div>

                  {/* Total (only shown in sources mode when multiple sources selected) */}
                  {viewMode === 'sources' && sortedPayload.length > 1 && (
                    <div className="mb-3 pb-2 border-b-2 border-gray-300">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">Total:</span>
                        <span className="font-bold text-sm">{totalEJ.toFixed(0)} PJ ({totalPercentage.toFixed(2)}%)</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-6 text-sm">
                    {/* Column 1 */}
                    <div className="space-y-1">
                      {column1.map((entry, index) => {
                        const regionName = viewMode === 'regions' ? entry.name : selectedRegion;
                        const yearData = filteredByTime?.[regionName]?.data.find(d => d.year === label);
                        const totalForRegion = getEnergyValue(yearData, 'total_useful_ej');

                        if (showAnnualChange) {
                          // For annual change view: calculate relative change percentage
                          // Need to find previous year's value to calculate percentage change
                          const prevYearData = filteredByTime?.[regionName]?.data.find(d => d.year === label - 1);
                          let prevValue = 0;

                          if (prevYearData) {
                            if (viewMode === 'regions') {
                              // Get previous year value for the selected source
                              if (selectedSource === 'all') {
                                prevValue = getEnergyValue(prevYearData, 'total_useful_ej');
                              } else if (selectedSource === 'fossil') {
                                const fossilSources = ['coal', 'oil', 'gas'];
                                const sourcesObj = getSourcesObject(prevYearData);
                                prevValue = fossilSources.reduce((sum, source) => sum + (sourcesObj[source] || 0), 0);
                              } else if (selectedSource === 'clean') {
                                const cleanSources = ['nuclear', 'hydro', 'wind', 'solar', 'biofuels', 'other_renewables'];
                                const sourcesObj = getSourcesObject(prevYearData);
                                prevValue = cleanSources.reduce((sum, source) => sum + (sourcesObj[source] || 0), 0);
                              } else {
                                const sourcesObj = getSourcesObject(prevYearData);
                                prevValue = sourcesObj[selectedSource] || 0;
                              }
                            } else {
                              // Sources mode - get previous year value for this specific source
                              const sourcesObj = getSourcesObject(prevYearData);
                              prevValue = sourcesObj[entry.dataKey] || 0;
                            }
                          }

                          const relativeChange = prevValue > 0 ? (entry.value / prevValue) * 100 : 0;

                          return (
                            <div key={index} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1 min-w-0">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                <span className="truncate text-xs">{entry.name}:</span>
                              </div>
                              <span className="font-semibold text-xs whitespace-nowrap">{entry.value > 0 ? '+' : ''}{entry.value.toFixed(0)} PJ ({relativeChange > 0 ? '+' : ''}{relativeChange.toFixed(1)}%)</span>
                            </div>
                          );
                        } else {
                          // For absolute value view: show value and share percentage
                          const percentage = totalForRegion > 0 ? (entry.value / totalForRegion * 100) : 0;
                          return (
                            <div key={index} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1 min-w-0">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                <span className="truncate text-xs">{entry.name}:</span>
                              </div>
                              <span className="font-semibold text-xs whitespace-nowrap">{entry.value.toFixed(0)} PJ ({percentage.toFixed(2)}%)</span>
                            </div>
                          );
                        }
                      })}
                    </div>
                    {/* Column 2 */}
                    {!showAnnualChange && <div className="space-y-1">
                      {column2.map((entry, index) => {
                        const regionName = viewMode === 'regions' ? entry.name : selectedRegion;
                        const yearData = filteredByTime?.[regionName]?.data.find(d => d.year === label);
                        const totalForRegion = getEnergyValue(yearData, 'total_useful_ej');
                        const percentage = totalForRegion > 0 ? (entry.value / totalForRegion * 100) : 0;

                        return (
                          <div key={index} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 min-w-0">
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                              <span className="truncate text-xs">{entry.name}:</span>
                            </div>
                            <span className="font-semibold text-xs whitespace-nowrap">{entry.value.toFixed(0)} PJ ({percentage.toFixed(2)}%)</span>
                          </div>
                        );
                      })}
                    </div>}
                    {showAnnualChange && <div className="space-y-1">
                      {column2.map((entry, index) => {
                        const regionName = viewMode === 'regions' ? entry.name : selectedRegion;
                        const yearData = filteredByTime?.[regionName]?.data.find(d => d.year === label);
                        const totalForRegion = getEnergyValue(yearData, 'total_useful_ej');
                        const prevYearData = filteredByTime?.[regionName]?.data.find(d => d.year === label - 1);
                        let prevValue = 0;

                        if (prevYearData) {
                          if (viewMode === 'regions') {
                            if (selectedSource === 'all') {
                              prevValue = getEnergyValue(prevYearData, 'total_useful_ej');
                            } else if (selectedSource === 'fossil') {
                              const fossilSources = ['coal', 'oil', 'gas'];
                              const sourcesObj = getSourcesObject(prevYearData);
                              prevValue = fossilSources.reduce((sum, source) => sum + (sourcesObj[source] || 0), 0);
                            } else if (selectedSource === 'clean') {
                              const cleanSources = ['nuclear', 'hydro', 'wind', 'solar', 'biofuels', 'other_renewables'];
                              const sourcesObj = getSourcesObject(prevYearData);
                              prevValue = cleanSources.reduce((sum, source) => sum + (sourcesObj[source] || 0), 0);
                            } else {
                              const sourcesObj = getSourcesObject(prevYearData);
                              prevValue = sourcesObj[selectedSource] || 0;
                            }
                          } else {
                            const sourcesObj = getSourcesObject(prevYearData);
                            prevValue = sourcesObj[entry.dataKey] || 0;
                          }
                        }

                        const relativeChange = prevValue > 0 ? (entry.value / prevValue) * 100 : 0;

                        return (
                          <div key={index} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 min-w-0">
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                              <span className="truncate text-xs">{entry.name}:</span>
                            </div>
                            <span className="font-semibold text-xs whitespace-nowrap">{entry.value > 0 ? '+' : ''}{entry.value.toFixed(0)} PJ ({relativeChange > 0 ? '+' : ''}{relativeChange.toFixed(1)}%)</span>
                          </div>
                        );
                      })}
                    </div>}
                  </div>
                </div>
              );
            }} />
            <Legend />
            {viewMode === 'regions' ? (
              selectedRegions.map(region => (
                <Line
                  key={region}
                  type="monotone"
                  dataKey={region}
                  name={region}
                  stroke={getRegionColor(region)}
                  strokeWidth={2}
                  dot={false}
                />
              ))
            ) : (
              // Determine which sources to render based on category filter or individual selections
              (() => {
                let sourcesToRender = [];
                if (quickFilterSources === 'all') {
                  sourcesToRender = ENERGY_SOURCES;
                } else if (quickFilterSources === 'fossil') {
                  sourcesToRender = FOSSIL_SOURCES;
                } else if (quickFilterSources === 'clean') {
                  sourcesToRender = CLEAN_SOURCES;
                } else {
                  sourcesToRender = selectedSources;
                }
                return sourcesToRender.map(source => (
                  <Line
                    key={source}
                    type="monotone"
                    dataKey={source}
                    name={getSourceName(source)}
                    stroke={ENERGY_COLORS[source]}
                    strokeWidth={2}
                    dot={false}
                  />
                ));
              })()
            )}
          </LineChart>
        </ResponsiveContainer>
        <div className="text-xs text-gray-500 text-center mt-4">
          Data sources: Our World in Data, BP Statistical Review
        </div>
      </div>

      {/* Chart 2: Regional Clean Energy Transition Comparison (2024) */}
      <div className="metric-card bg-white mb-8 pb-8" id="chart-regional-comparison">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              Regional Clean Energy & Efficiency Comparison (2024)
            </h2>
            <p className="text-sm text-gray-600">
              Clean energy share and overall efficiency across all regions
            </p>
          </div>
          <div className="flex gap-2">
            <ChartExportButtons
              onDownloadPNG={() => downloadChartAsPNG('#chart-regional-comparison', 'regional_comparison_2024.png')}
              onDownloadCSV={() => {
                downloadDataAsCSV(chart2Data, 'regional_comparison_2024.csv');
              }}
            />
            <FullscreenButton onClick={() => setIsFullscreenChart2(true)} />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={getChart2Height()}>
          <BarChart
            data={chart2Data}
            margin={{ top: 20, right: 30, left: 60, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="region"
              angle={-45}
              textAnchor="end"
              height={120}
            />
            <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} domain={[0, 100]} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                  <div className="font-bold text-lg mb-2">{data.region}</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Clean Energy Share:</span>
                      <span className="font-semibold text-green-600">{data.cleanShare.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Overall Efficiency:</span>
                      <span className="font-semibold text-blue-600">{data.efficiency.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between gap-4 pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Total Energy:</span>
                      <span className="font-semibold">{data.totalEnergy.toFixed(1)} PJ</span>
                    </div>
                  </div>
                </div>
              );
            }} />
            <Legend />
            <Bar dataKey="cleanShare" name="Clean Energy Share (%)" fill="#27AE60" />
            <Bar dataKey="efficiency" name="Overall Efficiency (%)" fill="#3498DB" />
          </BarChart>
        </ResponsiveContainer>
        <div className="text-xs text-gray-500 text-center mt-4">
          Data sources: Our World in Data, BP Statistical Review
        </div>
      </div>

      {/* Chart 3: Energy Mix Evolution for Selected Region */}
      <div className="metric-card bg-white mb-8 pb-8" id="chart-energy-mix">
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              Regional Energy Mix Evolution
            </h2>
            <p className="text-sm text-gray-600">
              Detailed energy source breakdown over time for selected region
            </p>
          </div>
          <div className="flex gap-2">
            <ChartExportButtons
              onDownloadPNG={() => downloadChartAsPNG('#chart-energy-mix', `${selectedRegionForMix}_energy_mix.png`)}
              onDownloadCSV={() => {
                downloadDataAsCSV(chart3Data, `${selectedRegionForMix}_energy_mix.csv`);
              }}
            />
            <FullscreenButton onClick={() => setIsFullscreenChart3(true)} />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Select Region:
            </label>
            <select
              value={selectedRegionForMix}
              onChange={(e) => setSelectedRegionForMix(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-base"
            >
              {AVAILABLE_REGIONS.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          {/* Show Relative Values Toggle */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700">Show Relative Values</label>
            <button
              onClick={() => setShowRelativeChart3(!showRelativeChart3)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showRelativeChart3 ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showRelativeChart3 ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={getChart3Height()}>
          <AreaChart
            data={chart3Data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis
              label={{
                value: showRelativeChart3 ? 'Share of Total Energy (%)' : 'Energy Services (PJ)',
                angle: -90,
                position: 'insideLeft'
              }}
              domain={showRelativeChart3 ? [0, 100] : [0, 'auto']}
              ticks={showRelativeChart3 ? [0, 25, 50, 75, 100] : undefined}
            />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
              return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                  <div className="font-bold text-lg mb-2">{label}</div>
                  <div className="space-y-1 text-sm">
                    {payload.reverse().map((entry, index) => {
                      if (showRelativeChart3) {
                        // In relative mode, values are already percentages
                        return (
                          <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span>{entry.name}:</span>
                            </div>
                            <span className="font-semibold">{entry.value.toFixed(2)}%</span>
                          </div>
                        );
                      } else {
                        // In absolute mode, calculate percentages
                        const percentage = total > 0 ? (entry.value / total * 100) : 0;
                        return (
                          <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span>{entry.name}:</span>
                            </div>
                            <span className="font-semibold">{entry.value.toFixed(2)} PJ ({percentage.toFixed(2)}%)</span>
                          </div>
                        );
                      }
                    })}
                    {!showRelativeChart3 && (
                      <div className="flex justify-between gap-4 pt-2 border-t border-gray-200 font-bold">
                        <span>Total:</span>
                        <span>{total.toFixed(2)} PJ (100%)</span>
                      </div>
                    )}
                    {showRelativeChart3 && (
                      <div className="flex justify-between gap-4 pt-2 border-t border-gray-200 font-bold">
                        <span>Total:</span>
                        <span>100%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }} />
            <Legend />
            {ENERGY_SOURCES.map(source => (
              <Area
                key={source}
                type="monotone"
                dataKey={source}
                name={getSourceName(source)}
                stackId="1"
                stroke={ENERGY_COLORS[source]}
                fill={ENERGY_COLORS[source]}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        <div className="text-xs text-gray-500 text-center mt-4">
          Data sources: Our World in Data, BP Statistical Review
        </div>
      </div>

      {/* Chart 1 Fullscreen Modal */}
      <ChartFullscreenModal
        isOpen={isFullscreenChart1}
        onClose={() => setIsFullscreenChart1(false)}
        title="Regional Energy Services Over Time"
        description="Compare energy service demand evolution across selected regions"
      >
        {/* Filter Controls */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
          {/* View Mode Selection and Annual Change Toggle */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
              <label className="block text-lg font-semibold text-gray-700">
                View Mode
              </label>
              {/* Annual Change Toggle */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">View Annual Change</label>
                <button
                  onClick={() => setShowAnnualChange(!showAnnualChange)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showAnnualChange ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showAnnualChange ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setViewMode('regions')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  viewMode === 'regions'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Compare Regions
              </button>
              <button
                onClick={() => setViewMode('sources')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  viewMode === 'sources'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Compare Energy Sources
              </button>
            </div>
          </div>

          {viewMode === 'regions' ? (
            <>
              {/* Multiple Regions Selection */}
              <div className="mb-6">
                <label className="block text-lg font-semibold mb-3 text-gray-700">
                  Select Regions
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {AVAILABLE_REGIONS.map(region => (
                    <button
                      key={region}
                      onClick={() => toggleRegion(region)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        selectedRegions.includes(region)
                          ? 'text-white ring-2 ring-2-offset-2'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      style={{
                        backgroundColor: selectedRegions.includes(region) ? getRegionColor(region) : undefined,
                        ringColor: getRegionColor(region)
                      }}
                    >
                      {region}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2" style={{ minHeight: '44px' }}>
                  <button
                    onClick={selectAllRegions}
                    className="px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearRegions}
                    className="px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Single Energy Source Selection */}
              <div>
                <label className="block text-lg font-semibold mb-3 text-gray-700">
                  Select Energy Source
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedSource('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      selectedSource === 'all'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All Sources
                  </button>
                  <button
                    onClick={() => setSelectedSource('fossil')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      selectedSource === 'fossil'
                        ? 'bg-red-600 text-white ring-2 ring-red-600 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Fossil Fuels
                  </button>
                  <button
                    onClick={() => setSelectedSource('clean')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      selectedSource === 'clean'
                        ? 'bg-green-600 text-white ring-2 ring-green-600 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Clean Energy
                  </button>
                  {ENERGY_SOURCES.map(source => (
                    <button
                      key={source}
                      onClick={() => setSelectedSource(source)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        selectedSource === source
                          ? 'text-white ring-2 ring-offset-2'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      style={{
                        backgroundColor: selectedSource === source ? ENERGY_COLORS[source] : undefined,
                        ringColor: ENERGY_COLORS[source]
                      }}
                    >
                      {getSourceName(source)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Single Region Selection */}
              <div className="mb-6">
                <label className="block text-lg font-semibold mb-3 text-gray-700">
                  Select Region
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_REGIONS.map(region => (
                    <button
                      key={region}
                      onClick={() => setSelectedRegion(region)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        selectedRegion === region
                          ? 'text-white ring-2 ring-offset-2'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      style={{
                        backgroundColor: selectedRegion === region ? getRegionColor(region) : undefined,
                        ringColor: getRegionColor(region)
                      }}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>

              {/* Multiple Energy Sources Selection */}
              <div>
                <label className="block text-lg font-semibold mb-3 text-gray-700">
                  Select Energy Sources
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      // Just set the category filter - the chart data logic will handle which sources to show
                      setQuickFilterSources('all');
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      quickFilterSources === 'all'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All Sources
                  </button>
                  <button
                    onClick={() => {
                      // Just set the category filter - the chart data logic will handle which sources to show
                      setQuickFilterSources('fossil');
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      quickFilterSources === 'fossil'
                        ? 'bg-red-600 text-white ring-2 ring-red-600 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Fossil Fuels
                  </button>
                  <button
                    onClick={() => {
                      // Just set the category filter - the chart data logic will handle which sources to show
                      setQuickFilterSources('clean');
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      quickFilterSources === 'clean'
                        ? 'bg-green-600 text-white ring-2 ring-green-600 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Clean Energy
                  </button>
                  {ENERGY_SOURCES.map(source => (
                    <button
                      key={source}
                      onClick={() => {
                        // When clicking individual source:
                        // 1. Clear category filter to switch to individual selection mode
                        // 2. Toggle the source (add if not present, remove if present)
                        setQuickFilterSources(null);
                        setSelectedSources(prev => {
                          if (prev.includes(source)) {
                            // Source is already selected, remove it
                            return prev.filter(s => s !== source);
                          } else {
                            // Source is not selected, add it
                            return [...prev, source];
                          }
                        });
                      }}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        quickFilterSources === null && selectedSources.includes(source)
                          ? 'text-white ring-2 ring-offset-2'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      style={{
                        backgroundColor: (quickFilterSources === null && selectedSources.includes(source)) ? ENERGY_COLORS[source] : undefined,
                        ringColor: ENERGY_COLORS[source]
                      }}
                    >
                      {getSourceName(source)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <ResponsiveContainer width="100%" height={getChart1Height()}>
          <LineChart
            data={chart1Data}
            margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis label={{ value: getYAxisLabel(), angle: -90, position: 'insideLeft' }} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;

              // Determine what sources are being shown
              let sourcesLabel = '';
              if (viewMode === 'regions') {
                if (selectedSource === 'all') {
                  sourcesLabel = 'All Sources';
                } else if (selectedSource === 'fossil') {
                  sourcesLabel = 'Fossil Fuels (Coal, Oil, Gas)';
                } else if (selectedSource === 'clean') {
                  sourcesLabel = 'Clean Energy (Nuclear, Hydro, Wind, Solar, Biofuels, Other Renewables)';
                } else {
                  sourcesLabel = getSourceName(selectedSource);
                }
              } else {
                // In sources mode, show which sources are selected
                if (quickFilterSources === 'all') {
                  sourcesLabel = 'All Sources';
                } else if (quickFilterSources === 'fossil') {
                  sourcesLabel = 'Fossil Fuels (Coal, Oil, Gas)';
                } else if (quickFilterSources === 'clean') {
                  sourcesLabel = 'Clean Energy (Nuclear, Hydro, Wind, Solar, Biofuels, Other Renewables)';
                } else {
                  sourcesLabel = selectedSources.map(s => getSourceName(s)).join(', ');
                }
              }

              // Sort payload based on selection order (left to right)
              const sortedPayload = viewMode === 'regions'
                ? [...payload].sort((a, b) => {
                    const indexA = selectedRegions.indexOf(a.name);
                    const indexB = selectedRegions.indexOf(b.name);
                    return indexA - indexB;
                  })
                : payload;

              // Calculate total of all selected sources
              const totalEJ = sortedPayload.reduce((sum, entry) => sum + entry.value, 0);

              // Get total for region to calculate percentage
              const regionName = viewMode === 'regions'
                ? (sortedPayload[0]?.name || selectedRegion)
                : selectedRegion;
              const yearData = filteredByTime?.[regionName]?.data.find(d => d.year === label);
              const totalForRegion = getEnergyValue(yearData, 'total_useful_ej');
              const totalPercentage = totalForRegion > 0 ? (totalEJ / totalForRegion * 100) : 0;

              // Split sorted payload into columns for better display
              const itemsPerColumn = Math.ceil(sortedPayload.length / 2);
              const column1 = sortedPayload.slice(0, itemsPerColumn);
              const column2 = sortedPayload.slice(itemsPerColumn);

              return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-2xl">
                  <div className="font-bold text-lg mb-2">{label}</div>
                  <div className="text-xs text-gray-500 mb-2 italic">{sourcesLabel}</div>

                  {/* Total (only shown in sources mode when multiple sources selected) */}
                  {viewMode === 'sources' && sortedPayload.length > 1 && (
                    <div className="mb-3 pb-2 border-b-2 border-gray-300">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">Total:</span>
                        <span className="font-bold text-sm">{totalEJ.toFixed(0)} PJ ({totalPercentage.toFixed(2)}%)</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-6 text-sm">
                    {/* Column 1 */}
                    <div className="space-y-1">
                      {column1.map((entry, index) => {
                        const regionName = viewMode === 'regions' ? entry.name : selectedRegion;
                        const yearData = filteredByTime?.[regionName]?.data.find(d => d.year === label);
                        const totalForRegion = getEnergyValue(yearData, 'total_useful_ej');

                        if (showAnnualChange) {
                          // For annual change view: calculate relative change percentage
                          // Need to find previous year's value to calculate percentage change
                          const prevYearData = filteredByTime?.[regionName]?.data.find(d => d.year === label - 1);
                          let prevValue = 0;

                          if (prevYearData) {
                            if (viewMode === 'regions') {
                              // Get previous year value for the selected source
                              if (selectedSource === 'all') {
                                prevValue = getEnergyValue(prevYearData, 'total_useful_ej');
                              } else if (selectedSource === 'fossil') {
                                const fossilSources = ['coal', 'oil', 'gas'];
                                const sourcesObj = getSourcesObject(prevYearData);
                                prevValue = fossilSources.reduce((sum, source) => sum + (sourcesObj[source] || 0), 0);
                              } else if (selectedSource === 'clean') {
                                const cleanSources = ['nuclear', 'hydro', 'wind', 'solar', 'biofuels', 'other_renewables'];
                                const sourcesObj = getSourcesObject(prevYearData);
                                prevValue = cleanSources.reduce((sum, source) => sum + (sourcesObj[source] || 0), 0);
                              } else {
                                const sourcesObj = getSourcesObject(prevYearData);
                                prevValue = sourcesObj[selectedSource] || 0;
                              }
                            } else {
                              // Sources mode - get previous year value for this specific source
                              const sourcesObj = getSourcesObject(prevYearData);
                              prevValue = sourcesObj[entry.dataKey] || 0;
                            }
                          }

                          const relativeChange = prevValue > 0 ? (entry.value / prevValue) * 100 : 0;

                          return (
                            <div key={index} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1 min-w-0">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                <span className="truncate text-xs">{entry.name}:</span>
                              </div>
                              <span className="font-semibold text-xs whitespace-nowrap">{entry.value > 0 ? '+' : ''}{entry.value.toFixed(0)} PJ ({relativeChange > 0 ? '+' : ''}{relativeChange.toFixed(1)}%)</span>
                            </div>
                          );
                        } else {
                          // For absolute value view: show value and share percentage
                          const percentage = totalForRegion > 0 ? (entry.value / totalForRegion * 100) : 0;
                          return (
                            <div key={index} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1 min-w-0">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                <span className="truncate text-xs">{entry.name}:</span>
                              </div>
                              <span className="font-semibold text-xs whitespace-nowrap">{entry.value.toFixed(0)} PJ ({percentage.toFixed(2)}%)</span>
                            </div>
                          );
                        }
                      })}
                    </div>
                    {/* Column 2 */}
                    {!showAnnualChange && <div className="space-y-1">
                      {column2.map((entry, index) => {
                        const regionName = viewMode === 'regions' ? entry.name : selectedRegion;
                        const yearData = filteredByTime?.[regionName]?.data.find(d => d.year === label);
                        const totalForRegion = getEnergyValue(yearData, 'total_useful_ej');
                        const percentage = totalForRegion > 0 ? (entry.value / totalForRegion * 100) : 0;

                        return (
                          <div key={index} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 min-w-0">
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                              <span className="truncate text-xs">{entry.name}:</span>
                            </div>
                            <span className="font-semibold text-xs whitespace-nowrap">{entry.value.toFixed(0)} PJ ({percentage.toFixed(2)}%)</span>
                          </div>
                        );
                      })}
                    </div>}
                    {showAnnualChange && <div className="space-y-1">
                      {column2.map((entry, index) => {
                        const regionName = viewMode === 'regions' ? entry.name : selectedRegion;
                        const yearData = filteredByTime?.[regionName]?.data.find(d => d.year === label);
                        const totalForRegion = getEnergyValue(yearData, 'total_useful_ej');
                        const prevYearData = filteredByTime?.[regionName]?.data.find(d => d.year === label - 1);
                        let prevValue = 0;

                        if (prevYearData) {
                          if (viewMode === 'regions') {
                            if (selectedSource === 'all') {
                              prevValue = getEnergyValue(prevYearData, 'total_useful_ej');
                            } else if (selectedSource === 'fossil') {
                              const fossilSources = ['coal', 'oil', 'gas'];
                              const sourcesObj = getSourcesObject(prevYearData);
                              prevValue = fossilSources.reduce((sum, source) => sum + (sourcesObj[source] || 0), 0);
                            } else if (selectedSource === 'clean') {
                              const cleanSources = ['nuclear', 'hydro', 'wind', 'solar', 'biofuels', 'other_renewables'];
                              const sourcesObj = getSourcesObject(prevYearData);
                              prevValue = cleanSources.reduce((sum, source) => sum + (sourcesObj[source] || 0), 0);
                            } else {
                              const sourcesObj = getSourcesObject(prevYearData);
                              prevValue = sourcesObj[selectedSource] || 0;
                            }
                          } else {
                            const sourcesObj = getSourcesObject(prevYearData);
                            prevValue = sourcesObj[entry.dataKey] || 0;
                          }
                        }

                        const relativeChange = prevValue > 0 ? (entry.value / prevValue) * 100 : 0;

                        return (
                          <div key={index} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 min-w-0">
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                              <span className="truncate text-xs">{entry.name}:</span>
                            </div>
                            <span className="font-semibold text-xs whitespace-nowrap">{entry.value > 0 ? '+' : ''}{entry.value.toFixed(0)} PJ ({relativeChange > 0 ? '+' : ''}{relativeChange.toFixed(1)}%)</span>
                          </div>
                        );
                      })}
                    </div>}
                  </div>
                </div>
              );
            }} />
            <Legend />
            {viewMode === 'regions' ? (
              selectedRegions.map(region => (
                <Line
                  key={region}
                  type="monotone"
                  dataKey={region}
                  name={region}
                  stroke={getRegionColor(region)}
                  strokeWidth={2}
                  dot={false}
                />
              ))
            ) : (
              // Determine which sources to render based on category filter or individual selections
              (() => {
                let sourcesToRender = [];
                if (quickFilterSources === 'all') {
                  sourcesToRender = ENERGY_SOURCES;
                } else if (quickFilterSources === 'fossil') {
                  sourcesToRender = FOSSIL_SOURCES;
                } else if (quickFilterSources === 'clean') {
                  sourcesToRender = CLEAN_SOURCES;
                } else {
                  sourcesToRender = selectedSources;
                }
                return sourcesToRender.map(source => (
                  <Line
                    key={source}
                    type="monotone"
                    dataKey={source}
                    name={getSourceName(source)}
                    stroke={ENERGY_COLORS[source]}
                    strokeWidth={2}
                    dot={false}
                  />
                ));
              })()
            )}
          </LineChart>
        </ResponsiveContainer>
        <div className="text-xs text-gray-500 text-center mt-4">
          Data sources: Our World in Data, BP Statistical Review
        </div>
        <ChartExportButtons
          onDownloadPNG={() => downloadChartAsPNG('#chart-regional-timeseries', 'regional_energy_timeseries.png')}
          onDownloadCSV={() => {
            downloadDataAsCSV(chart1Data, 'regional_energy_timeseries.csv');
          }}
        />
      </ChartFullscreenModal>

      {/* Chart 2 Fullscreen Modal */}
      <ChartFullscreenModal
        isOpen={isFullscreenChart2}
        onClose={() => setIsFullscreenChart2(false)}
        title="Regional Clean Energy & Efficiency Comparison (2024)"
        description="Clean energy share and overall efficiency across all regions"
      >
        <ResponsiveContainer width="100%" height={getChart2Height()}>
          <BarChart
            data={chart2Data}
            margin={{ top: 20, right: 30, left: 60, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="region"
              angle={-45}
              textAnchor="end"
              height={120}
            />
            <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} domain={[0, 100]} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                  <div className="font-bold text-lg mb-2">{data.region}</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Clean Energy Share:</span>
                      <span className="font-semibold text-green-600">{data.cleanShare.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Overall Efficiency:</span>
                      <span className="font-semibold text-blue-600">{data.efficiency.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between gap-4 pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Total Energy:</span>
                      <span className="font-semibold">{data.totalEnergy.toFixed(1)} PJ</span>
                    </div>
                  </div>
                </div>
              );
            }} />
            <Legend />
            <Bar dataKey="cleanShare" name="Clean Energy Share (%)" fill="#27AE60" />
            <Bar dataKey="efficiency" name="Overall Efficiency (%)" fill="#3498DB" />
          </BarChart>
        </ResponsiveContainer>
        <div className="text-xs text-gray-500 text-center mt-4">
          Data sources: Our World in Data, BP Statistical Review
        </div>
        <ChartExportButtons
          onDownloadPNG={() => downloadChartAsPNG('#chart-regional-comparison', 'regional_comparison_2024.png')}
          onDownloadCSV={() => {
            downloadDataAsCSV(chart2Data, 'regional_comparison_2024.csv');
          }}
        />
      </ChartFullscreenModal>

      {/* Chart 3 Fullscreen Modal */}
      <ChartFullscreenModal
        isOpen={isFullscreenChart3}
        onClose={() => setIsFullscreenChart3(false)}
        title="Regional Energy Mix Evolution"
        description="Detailed energy source breakdown over time for selected region"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Select Region:
            </label>
            <select
              value={selectedRegionForMix}
              onChange={(e) => setSelectedRegionForMix(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-base"
            >
              {AVAILABLE_REGIONS.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          {/* Show Relative Values Toggle */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700">Show Relative Values</label>
            <button
              onClick={() => setShowRelativeChart3(!showRelativeChart3)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showRelativeChart3 ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showRelativeChart3 ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={getChart3Height()}>
          <AreaChart
            data={chart3Data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis
              label={{
                value: showRelativeChart3 ? 'Share of Total Energy (%)' : 'Energy Services (PJ)',
                angle: -90,
                position: 'insideLeft'
              }}
              domain={showRelativeChart3 ? [0, 100] : [0, 'auto']}
              ticks={showRelativeChart3 ? [0, 25, 50, 75, 100] : undefined}
            />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
              return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                  <div className="font-bold text-lg mb-2">{label}</div>
                  <div className="space-y-1 text-sm">
                    {payload.reverse().map((entry, index) => {
                      if (showRelativeChart3) {
                        // In relative mode, values are already percentages
                        return (
                          <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span>{entry.name}:</span>
                            </div>
                            <span className="font-semibold">{entry.value.toFixed(2)}%</span>
                          </div>
                        );
                      } else {
                        // In absolute mode, calculate percentages
                        const percentage = total > 0 ? (entry.value / total * 100) : 0;
                        return (
                          <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span>{entry.name}:</span>
                            </div>
                            <span className="font-semibold">{entry.value.toFixed(2)} PJ ({percentage.toFixed(2)}%)</span>
                          </div>
                        );
                      }
                    })}
                    {!showRelativeChart3 && (
                      <div className="flex justify-between gap-4 pt-2 border-t border-gray-200 font-bold">
                        <span>Total:</span>
                        <span>{total.toFixed(2)} PJ (100%)</span>
                      </div>
                    )}
                    {showRelativeChart3 && (
                      <div className="flex justify-between gap-4 pt-2 border-t border-gray-200 font-bold">
                        <span>Total:</span>
                        <span>100%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }} />
            <Legend />
            {ENERGY_SOURCES.map(source => (
              <Area
                key={source}
                type="monotone"
                dataKey={source}
                name={getSourceName(source)}
                stackId="1"
                stroke={ENERGY_COLORS[source]}
                fill={ENERGY_COLORS[source]}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        <div className="text-xs text-gray-500 text-center mt-4">
          Data sources: Our World in Data, BP Statistical Review
        </div>
        <ChartExportButtons
          onDownloadPNG={() => downloadChartAsPNG('#chart-energy-mix', `${selectedRegionForMix}_energy_mix.png`)}
          onDownloadCSV={() => {
            downloadDataAsCSV(chart3Data, `${selectedRegionForMix}_energy_mix.csv`);
          }}
        />
      </ChartFullscreenModal>

      {/* Understanding Regional Energy Transitions */}
      <div className="metric-card bg-white mb-8 border-2 border-blue-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Understanding Regional Energy Transitions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Why Regions Matter</h3>
            <p className="text-gray-700">
              Regional analysis reveals vastly different energy transition challenges. Europe's mature economy has high efficiency and clean energy penetration, while Asia's rapid industrialization drives 80%+ of global growth. Understanding these differences is critical for effective climate policy.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">The Efficiency Advantage</h3>
            <p className="text-gray-700">
              Developed regions (Europe, North America) achieve 45-55% end-to-end efficiency, while developing regions average 35-45%. This means developed economies need less primary energy per unit of economic output, giving them a structural advantage in the transition.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Asia's Dual Challenge</h3>
            <p className="text-gray-700">
              Asia faces both massive demand growth and an efficiency gap. As 60% of global population industrializes, Asia must simultaneously deploy clean energy AND improve efficiency. Success here determines the planet's climate trajectory.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Regional Disparities</h3>
            <p className="text-gray-700">
              Energy access remains deeply unequal across regions. Some regions consume significantly more energy services services per capita than others. Closing this gap equitably while decarbonizing is the central challenge of the 21st century.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Clean Energy Leaders</h3>
            <p className="text-gray-700">
              Regions with high clean energy shares (Europe, South America) show that clean energy transitions are possible at scale. With 40-60% clean shares achieved, they provide a roadmap—but also reveal how long transitions take even with favorable conditions.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Regional Policy Levers</h3>
            <p className="text-gray-700">
              Different regions need different strategies: Europe focuses on efficiency and electrification, Asia on clean deployment at scale, Africa on energy access and leapfrogging, and oil-dependent regions on economic diversification.
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

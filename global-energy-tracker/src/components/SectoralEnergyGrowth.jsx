import { useState, useEffect } from 'react';
import { useWindowSize } from '@react-hook/window-size';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ENERGY_COLORS, getSourceName } from '../utils/colors';
import { downloadChartAsPNG, downloadDataAsCSV, ChartExportButtons, ChartSources } from '../utils/chartExport';
import ChartFullscreenModal from './ChartFullscreenModal';
import FullscreenButton from './FullscreenButton';

// Color palette for sectors (professional spectrum: reds, oranges, yellows, greens, blues, greys)
const SECTOR_COLORS = {
  transport_road: '#DC2626',           // Strong red
  industry_iron_steel: '#EF4444',      // Bright red
  residential_heating: '#F59E0B',      // Amber/orange
  industry_chemicals: '#FBBF24',       // Yellow
  commercial_buildings: '#84CC16',     // Lime green
  residential_appliances: '#22C55E',   // Green
  industry_cement: '#10B981',          // Emerald
  transport_aviation: '#14B8A6',       // Teal
  agriculture: '#06B6D4',              // Cyan
  industry_aluminum: '#0EA5E9',        // Sky blue
  transport_shipping: '#3B82F6',       // Blue
  industry_pulp_paper: '#1E40AF',      // Dark blue
  residential_cooling: '#64748B',      // Grey
  transport_rail: '#94A3B8',           // Light grey
  other_industry: '#CBD5E1'            // Very light grey
};

const ALL_SECTORS = [
  'transport_road',
  'industry_iron_steel',
  'residential_heating',
  'industry_chemicals',
  'commercial_buildings',
  'residential_appliances',
  'industry_cement',
  'transport_aviation',
  'agriculture',
  'industry_aluminum',
  'transport_shipping',
  'industry_pulp_paper',
  'residential_cooling',
  'transport_rail',
  'other_industry'
];

const ENERGY_SOURCES = ['coal', 'oil', 'gas', 'nuclear', 'hydro', 'wind', 'solar', 'biomass', 'geothermal', 'other'];

const getSectorName = (sectorKey) => {
  const names = {
    transport_road: 'Road Transport',
    industry_iron_steel: 'Iron & Steel',
    residential_heating: 'Residential Heating',
    industry_chemicals: 'Chemicals',
    commercial_buildings: 'Commercial Buildings',
    residential_appliances: 'Residential Appliances',
    industry_cement: 'Cement',
    transport_aviation: 'Aviation',
    agriculture: 'Agriculture',
    industry_aluminum: 'Aluminum',
    transport_shipping: 'Shipping',
    industry_pulp_paper: 'Pulp & Paper',
    residential_cooling: 'Residential Cooling',
    transport_rail: 'Rail Transport',
    other_industry: 'Other Industry'
  };
  return names[sectorKey] || sectorKey;
};

export default function SectoralEnergyGrowth() {
  const [width] = useWindowSize();  // Dynamic window size for responsive charts
  const [sectoralData, setSectoralData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [projectionsData, setProjectionsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all', 'fossil', 'clean', or specific source
  const [showRelative, setShowRelative] = useState(false);
  const [selectedSectors, setSelectedSectors] = useState(ALL_SECTORS);
  const [chartData, setChartData] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/data/sectoral_energy_breakdown.json').then(res => res.json()),
      fetch('/data/useful_energy_timeseries.json').then(res => res.json()),
      fetch('/data/demand_growth_projections.json').then(res => res.json())
    ])
      .then(([sectoral, historical, projections]) => {
        setSectoralData(sectoral);
        setHistoricalData(historical);
        setProjectionsData(projections);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading data:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!sectoralData || !historicalData || !projectionsData) return;

    // CRITICAL FIX v1.9: Normalize sector shares to sum to 100%
    // Raw shares sum to 110% causing scaling discontinuities
    const rawShares = sectoralData.sector_shares;
    const totalShares = Object.values(rawShares).reduce((sum, s) => sum + s, 0);
    const normalizedShares = {};
    Object.keys(rawShares).forEach(sector => {
      normalizedShares[sector] = rawShares[sector] / totalShares;
    });

    // Generate time series data for sectors (using baseline scenario only)
    const generatedData = [];
    const startYear = 2015;
    const endYear = 2050;

    // Get baseline useful energy for 2024
    const baseline2024 = historicalData.data.find(d => d.year === 2024);
    if (!baseline2024) return;

    const totalUseful2024 = baseline2024.total_useful_ej;

    // Use baseline scenario for all projections
    const baselineScenario = projectionsData.scenarios.find(s => s.name === 'Baseline (STEPS)');

    for (let year = startYear; year <= endYear; year++) {
      const yearData = { year };

      // Get total useful energy for this year and energy source distribution
      let totalUseful;
      let historicalYear;
      let projYear;
      let globalFossilShare = 0;
      let globalCleanShare = 0;

      if (year <= 2024) {
        historicalYear = historicalData.data.find(d => d.year === year);
        totalUseful = historicalYear ? historicalYear.total_useful_ej : totalUseful2024;

        if (historicalYear) {
          globalFossilShare = historicalYear.fossil_useful_ej / historicalYear.total_useful_ej;
          globalCleanShare = historicalYear.clean_useful_ej / historicalYear.total_useful_ej;
        }
      } else {
        // For future years, find exact match or interpolate
        projYear = baselineScenario?.data.find(d => d.year === year);

        if (projYear) {
          // Exact match found
          totalUseful = projYear.total_useful_ej;
          globalFossilShare = projYear.fossil_useful_ej / projYear.total_useful_ej;
          globalCleanShare = projYear.clean_useful_ej / projYear.total_useful_ej;
        } else {
          // Interpolate between surrounding years
          const beforeYear = baselineScenario?.data.filter(d => d.year < year).sort((a, b) => b.year - a.year)[0];
          const afterYear = baselineScenario?.data.filter(d => d.year > year).sort((a, b) => a.year - b.year)[0];

          if (beforeYear && afterYear) {
            totalUseful = interpolate(year, beforeYear, afterYear, beforeYear.total_useful_ej, afterYear.total_useful_ej);
            const fossilUseful = interpolate(year, beforeYear, afterYear, beforeYear.fossil_useful_ej, afterYear.fossil_useful_ej);
            const cleanUseful = interpolate(year, beforeYear, afterYear, beforeYear.clean_useful_ej, afterYear.clean_useful_ej);
            globalFossilShare = fossilUseful / totalUseful;
            globalCleanShare = cleanUseful / totalUseful;
          } else if (beforeYear) {
            totalUseful = beforeYear.total_useful_ej;
            globalFossilShare = beforeYear.fossil_useful_ej / beforeYear.total_useful_ej;
            globalCleanShare = beforeYear.clean_useful_ej / beforeYear.total_useful_ej;
          } else {
            totalUseful = totalUseful2024;
            globalFossilShare = baseline2024.fossil_useful_ej / baseline2024.total_useful_ej;
            globalCleanShare = baseline2024.clean_useful_ej / baseline2024.total_useful_ej;
          }
        }
      }

      // Calculate sectoral values - UNIFIED METHOD (v2.2 AGGREGATE-CONSTRAINED)
      // Use SAME calculation for ALL years to ensure smooth 2024-2025 transition

      // Step 1: Calculate unconstrained sectoral values
      const unconstrainedSectors = {};
      const yearsFromBaseline = year - 2024;

      // Calculate total grown for scaling
      const totalGrown = Object.keys(normalizedShares).reduce((sum, s) => {
        const share = normalizedShares[s];
        const baseVal = totalUseful2024 * share;
        const rate = sectoralData.growth_rates.baseline[s] || 0;
        return sum + baseVal * Math.pow(1 + rate, yearsFromBaseline);
      }, 0);

      Object.keys(normalizedShares).forEach(sector => {
        const normalizedShare = normalizedShares[sector];
        const baseValue2024 = totalUseful2024 * normalizedShare;
        const growthRate = sectoralData.growth_rates.baseline[sector] || 0;
        const grownValue = baseValue2024 * Math.pow(1 + growthRate, yearsFromBaseline);

        // Scale to match actual total energy for this year
        unconstrainedSectors[sector] = grownValue * (totalUseful / totalGrown);
      });

      // Step 2: Apply source filter with AGGREGATE CONSTRAINT
      if (sourceFilter === 'fossil' || sourceFilter === 'clean') {
        // Calculate unconstrained fossil/clean values
        const unconstrainedFiltered = {};
        let unconstrainedSum = 0;

        Object.keys(normalizedShares).forEach(sector => {
          const baseFossilIntensity = sectoralData.fossil_intensity[sector];
          const intensity = sourceFilter === 'fossil'
            ? baseFossilIntensity
            : (1 - baseFossilIntensity);

          unconstrainedFiltered[sector] = unconstrainedSectors[sector] * intensity;
          unconstrainedSum += unconstrainedFiltered[sector];
        });

        // Get aggregate target from data
        const aggregateTarget = sourceFilter === 'fossil'
          ? (year <= 2024 && historicalYear ? historicalYear.fossil_useful_ej : projYear?.fossil_useful_ej || 0)
          : (year <= 2024 && historicalYear ? historicalYear.clean_useful_ej : projYear?.clean_useful_ej || 0);

        // Scale all sectors proportionally to match aggregate exactly
        const scalingFactor = unconstrainedSum > 0 ? aggregateTarget / unconstrainedSum : 1;

        Object.keys(normalizedShares).forEach(sector => {
          yearData[sector] = unconstrainedFiltered[sector] * scalingFactor;
        });

      } else if (ENERGY_SOURCES.includes(sourceFilter)) {
        // Individual energy source selected
        let sourceShare = 0;

        if (year <= 2024 && historicalYear) {
          sourceShare = (historicalYear.sources_useful_ej[sourceFilter] || 0) / historicalYear.total_useful_ej;
        } else if (projYear) {
          sourceShare = (projYear.sources_useful_ej[sourceFilter] || 0) / projYear.total_useful_ej;
        } else {
          // Interpolate individual source share for missing years
          const beforeYear = baselineScenario?.data.filter(d => d.year < year).sort((a, b) => b.year - a.year)[0];
          const afterYear = baselineScenario?.data.filter(d => d.year > year).sort((a, b) => a.year - b.year)[0];

          if (beforeYear && afterYear) {
            const beforeShare = (beforeYear.sources_useful_ej[sourceFilter] || 0) / beforeYear.total_useful_ej;
            const afterShare = (afterYear.sources_useful_ej[sourceFilter] || 0) / afterYear.total_useful_ej;
            const t = (year - beforeYear.year) / (afterYear.year - beforeYear.year);
            sourceShare = beforeShare + t * (afterShare - beforeShare);
          } else if (beforeYear) {
            sourceShare = (beforeYear.sources_useful_ej[sourceFilter] || 0) / beforeYear.total_useful_ej;
          } else {
            sourceShare = (baseline2024.sources_useful_ej[sourceFilter] || 0) / baseline2024.total_useful_ej;
          }
        }

        // Apply source share to all sectors
        Object.keys(normalizedShares).forEach(sector => {
          yearData[sector] = unconstrainedSectors[sector] * sourceShare;
        });

      } else {
        // 'all' filter - use unconstrained sectoral values
        Object.keys(normalizedShares).forEach(sector => {
          yearData[sector] = unconstrainedSectors[sector];
        });
      }

      // Calculate total for relative percentages
      const yearTotal = Object.keys(normalizedShares).reduce((sum, sector) => {
        return sum + (yearData[sector] || 0);
      }, 0);
      yearData.total = yearTotal;

      generatedData.push(yearData);
    }

    setChartData(generatedData);
  }, [sectoralData, historicalData, projectionsData, sourceFilter]);

  if (loading || !sectoralData || !chartData.length) {
    return <div className="text-center py-8">Loading sectoral data...</div>;
  }

  // Toggle sector selection
  const toggleSector = (sectorKey) => {
    setSelectedSectors(prev =>
      prev.includes(sectorKey)
        ? prev.filter(s => s !== sectorKey)
        : [...prev, sectorKey]
    );
  };

  // Preset selections
  const selectAllSectors = () => setSelectedSectors(ALL_SECTORS);
  const clearAllSectors = () => setSelectedSectors([]);

  // Export handlers
  const handleDownloadPNG = () => {
    const sourceStr = sourceFilter === 'all' ? 'all-sources' : sourceFilter;
    const viewStr = showRelative ? 'relative' : 'absolute';
    const filename = `sectoral-energy-growth-${sourceStr}-${viewStr}-${new Date().toISOString().split('T')[0]}`;
    downloadChartAsPNG('#sectoral-chart-container', filename);
  };

  const handleDownloadCSV = () => {
    const sourceStr = sourceFilter === 'all' ? 'all-sources' : sourceFilter;
    const filename = `sectoral-energy-growth-${sourceStr}-${new Date().toISOString().split('T')[0]}`;

    // Prepare CSV data
    const csvData = chartData.map(yearData => {
      const row = { Year: yearData.year };

      // Add each sector
      ALL_SECTORS.forEach(sector => {
        const sectorName = getSectorName(sector);
        const value = yearData[sector] || 0;
        if (showRelative) {
          row[`${sectorName} (%)`] = value.toFixed(2);
        } else {
          row[`${sectorName} (EJ)`] = value.toFixed(3);
        }
      });

      // Add total
      if (!showRelative) {
        row['Total (EJ)'] = yearData.total?.toFixed(3) || '';
      }

      return row;
    });

    downloadDataAsCSV(csvData, filename);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    // Get the actual year data to calculate totals
    const yearData = chartData.find(d => d.year === label);
    if (!yearData) return null;

    const totalEJ = yearData.total;

    // Filter sectors based on selection
    const sectorsToShow = selectedSectors.length > 0 ? selectedSectors : ALL_SECTORS;

    // Get filtered sectors with their values (sorted by size)
    const allSectors = sectorsToShow
      .map(sector => {
        const ejValue = yearData[sector] || 0;
        const percentage = totalEJ > 0 ? (ejValue / totalEJ * 100) : 0;
        return {
          sector,
          name: getSectorName(sector),
          ejValue,
          percentage,
          color: SECTOR_COLORS[sector]
        };
      })
      .filter(item => item.ejValue > 0)
      .sort((a, b) => b.ejValue - a.ejValue);

    // Determine energy source label for tooltip
    let sourceLabel = 'All Sources';
    if (sourceFilter === 'fossil') {
      sourceLabel = 'Fossil Sources';
    } else if (sourceFilter === 'clean') {
      sourceLabel = 'Clean Sources';
    } else if (ENERGY_SOURCES.includes(sourceFilter)) {
      sourceLabel = getSourceName(sourceFilter);
    }

    return (
      <div className="bg-white p-4 rounded-lg shadow-xl border-2 border-gray-300 max-w-md">
        <div className="font-bold text-xl mb-2 text-gray-900">{label}</div>
        <div className="text-xs font-semibold mb-3 text-blue-600">
          Energy Source: {sourceLabel}
        </div>
        <div className="text-sm font-semibold mb-3 pb-2 border-b border-gray-200">
          Total: {totalEJ.toFixed(1)} EJ (100%)
        </div>
        <div className="space-y-1.5">
          {allSectors.map((item, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-gray-700">{item.name}</span>
              </div>
              <div className="font-semibold text-gray-900 text-right whitespace-nowrap">
                {item.ejValue.toFixed(1)} EJ ({item.percentage.toFixed(1)}%)
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Prepare display data based on showRelative toggle
  const displayData = showRelative ? chartData.map(yearData => {
    const normalized = { year: yearData.year };
    const total = yearData.total;
    ALL_SECTORS.forEach(sector => {
      normalized[sector] = total > 0 ? (yearData[sector] / total * 100) : 0;
    });
    return normalized;
  }) : chartData;

  const sources = [
    'IEA World Energy Balances 2024',
    'IEA Energy Efficiency Indicators',
    'BP Statistical Review of World Energy',
    'IEA World Energy Outlook 2024'
  ];

  // Responsive chart heights: reduced for fullscreen to fit all content without scrolling
  // This chart has many controls, legend, and analysis cards
  const getChartHeight = () => {
    if (isFullscreen) {
      return width < 640 ? 250 : width < 1024 ? 350 : 450;
    }
    return 700;
  };

  // Render all chart content (controls, chart, legend, analysis)
  // Used in both normal and fullscreen views - height adjusts automatically via getChartHeight()
  const renderContent = () => (
    <>
      {/* Controls */}
      <div className="mb-8">
        {/* Show Relative Toggle */}
        <div className="flex items-center justify-end mb-6">
          <div className="flex items-center gap-4">
            <label className="text-lg font-semibold text-gray-700">Show Relative Values</label>
            <button
              onClick={() => setShowRelative(!showRelative)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                showRelative ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  showRelative ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Source Filter */}
        <div className="mb-6">
          <label className="block text-lg font-semibold mb-3 text-gray-700">
            Energy Source Filter
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => setSourceFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                sourceFilter === 'all'
                  ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Sources
            </button>
            <button
              onClick={() => setSourceFilter('fossil')}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                sourceFilter === 'fossil'
                  ? 'bg-red-600 text-white ring-2 ring-red-600 ring-offset-2'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Fossil Sources
            </button>
            <button
              onClick={() => setSourceFilter('clean')}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                sourceFilter === 'clean'
                  ? 'bg-green-600 text-white ring-2 ring-green-600 ring-offset-2'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Clean Sources
            </button>
          </div>

          {/* Individual Energy Sources */}
          <div className="flex flex-wrap gap-2">
            {ENERGY_SOURCES.map(source => (
              <button
                key={source}
                onClick={() => setSourceFilter(source)}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  sourceFilter === source
                    ? 'text-white ring-2 ring-offset-2'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                style={{
                  backgroundColor: sourceFilter === source ? ENERGY_COLORS[source] : undefined,
                  ringColor: ENERGY_COLORS[source]
                }}
              >
                {getSourceName(source)}
              </button>
            ))}
          </div>
        </div>

        {/* Sector Selection */}
        <div>
          <label className="block text-lg font-semibold mb-3 text-gray-700">
            Select Sectors
          </label>
          <div className="flex gap-3 mb-3">
            <button
              onClick={() => setSelectedSectors(ALL_SECTORS)}
              className="px-4 py-2 rounded-lg font-medium transition-all text-sm bg-blue-600 text-white hover:bg-blue-700"
            >
              All Sectors
            </button>
            <button
              onClick={() => setSelectedSectors([])}
              className="px-4 py-2 rounded-lg font-medium transition-all text-sm bg-gray-300 text-gray-700 hover:bg-gray-400"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_SECTORS.map(sector => (
              <button
                key={sector}
                onClick={() => {
                  setSelectedSectors(prev =>
                    prev.includes(sector)
                      ? prev.filter(s => s !== sector)
                      : [...prev, sector]
                  );
                }}
                className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                  selectedSectors.includes(sector)
                    ? 'text-white ring-2 ring-offset-2'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                style={{
                  backgroundColor: selectedSectors.includes(sector) ? SECTOR_COLORS[sector] : undefined
                }}
              >
                {getSectorName(sector)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div id="sectoral-chart-container" className="mb-8">
        <ResponsiveContainer width="100%" height={getChartHeight()}>
          <AreaChart
            data={displayData}
            margin={{ top: 10, right: 40, left: 20, bottom: 20 }}
          >
            <defs>
              {selectedSectors.map(sector => (
                <linearGradient key={sector} id={`color-${sector}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SECTOR_COLORS[sector]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={SECTOR_COLORS[sector]} stopOpacity={0.3} />
                </linearGradient>
              ))}
            </defs>
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
              domain={showRelative ? [0, 100] : [0, 'auto']}
              ticks={showRelative ? [0, 25, 50, 75, 100] : undefined}
              label={{
                value: showRelative ? 'Share of Total Energy (%)' : 'Useful Energy (EJ)',
                angle: -90,
                position: 'insideLeft',
                style={{ fontSize: 17, fontWeight: 600 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            {selectedSectors.map(sector => (
              <Area
                key={sector}
                type="monotone"
                dataKey={sector}
                stackId="1"
                stroke={SECTOR_COLORS[sector]}
                fill={`url(#color-${sector})`}
                fillOpacity={1}
                name={getSectorName(sector)}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>

        {/* Data Sources */}
        <ChartSources sources={sources} />
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-gray-200 mb-8">
        <div className="flex flex-wrap items-center justify-center gap-6">
          {selectedSectors.map(sector => (
            <div key={sector} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: SECTOR_COLORS[sector] }} />
              <span className="text-base font-medium text-gray-700">{getSectorName(sector)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sector Growth Analysis */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fastest Growing Sectors */}
        <div className="p-6 bg-green-50 rounded-lg border-l-4 border-green-600">
          <h3 className="text-lg font-bold text-green-800 mb-3">Fastest Growing Sectors (2024-2050)</h3>
          <div className="space-y-3 text-sm text-gray-700">
            {Object.keys(sectoralData.sector_shares)
              .map(sector => {
                const val2024 = chartData.find(d => d.year === 2024)?.[sector] || 0;
                const val2050 = chartData.find(d => d.year === 2050)?.[sector] || 0;
                const growth = val2024 > 0 ? ((val2050 - val2024) / val2024 * 100) : 0;
                return { sector, growth, val2024, val2050 };
              })
              .sort((a, b) => b.growth - a.growth)
              .slice(0, 3)
              .map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: SECTOR_COLORS[item.sector] }}
                    />
                    <strong>{getSectorName(item.sector)}</strong>
                  </div>
                  <span className="text-green-600 font-semibold">+{item.growth.toFixed(1)}%</span>
                </div>
              ))}
          </div>
        </div>

        {/* Slowest Growing Sectors */}
        <div className="p-6 bg-gray-50 rounded-lg border-l-4 border-gray-600">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Slowest Growing Sectors (2024-2050)</h3>
          <div className="space-y-3 text-sm text-gray-700">
            {Object.keys(sectoralData.sector_shares)
              .map(sector => {
                const val2024 = chartData.find(d => d.year === 2024)?.[sector] || 0;
                const val2050 = chartData.find(d => d.year === 2050)?.[sector] || 0;
                const growth = val2024 > 0 ? ((val2050 - val2024) / val2024 * 100) : 0;
                return { sector, growth, val2024, val2050 };
              })
              .sort((a, b) => a.growth - b.growth)
              .slice(0, 3)
              .map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: SECTOR_COLORS[item.sector] }}
                    />
                    <strong>{getSectorName(item.sector)}</strong>
                  </div>
                  <span className={`font-semibold ${item.growth >= 0 ? 'text-gray-600' : 'text-red-600'}`}>
                    {item.growth >= 0 ? '+' : ''}{item.growth.toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Normal View */}
      <div className="metric-card bg-white mb-16">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-1">
              Energy Services Growth by Sector
            </h2>
            <p className="text-sm text-gray-600">
              2015-2024 historical data • 2025-2050 projections
            </p>
          </div>
          <div className="flex gap-2">
            <ChartExportButtons
              onDownloadPNG={handleDownloadPNG}
              onDownloadCSV={handleDownloadCSV}
            />
            <FullscreenButton onClick={() => setIsFullscreen(true)} />
          </div>
        </div>

        {renderContent()}
      </div>

      {/* Fullscreen View */}
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Energy Services Growth by Sector"
        description="Historical data (2015-2024) and projections (2025-2050)"
        exportButtons={
          <ChartExportButtons
            onDownloadPNG={handleDownloadPNG}
            onDownloadCSV={handleDownloadCSV}
          />
        }
      >
        {renderContent()}
      </ChartFullscreenModal>
    </>
  );
}

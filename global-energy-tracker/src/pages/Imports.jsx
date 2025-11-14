import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import PageLayout from '../components/PageLayout';
import AIChatbot from '../components/AIChatbot';
import ChartFullscreenModal from '../components/ChartFullscreenModal';
import FullscreenButton from '../components/FullscreenButton';
import { downloadChartAsPNG, downloadDataAsCSV, ChartExportButtons } from '../utils/chartExport';
import { getRegionColor } from '../utils/colors';

function Imports() {
  const [netImportsData, setNetImportsData] = useState(null);
  const [lifetimeServicesData, setLifetimeServicesData] = useState(null);
  const [energyPotentialData, setEnergyPotentialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fullscreen states
  const [isFullscreenChart1, setIsFullscreenChart1] = useState(false);
  const [isFullscreenChart2, setIsFullscreenChart2] = useState(false);
  const [isFullscreenChart3, setIsFullscreenChart3] = useState(false);

  // Chart 1 controls
  const [viewMode, setViewMode] = useState('regions'); // 'regions' or 'fuels'
  const [showAnnualChange, setShowAnnualChange] = useState(false);

  // Compare Regions mode
  const [selectedRegions, setSelectedRegions] = useState(['Global']);
  const [selectedFuel, setSelectedFuel] = useState('total'); // 'total', 'coal', 'oil', 'gas', or 'fossil'

  // Compare Fuels mode
  const [selectedRegion, setSelectedRegion] = useState('Global');
  const [selectedFuels, setSelectedFuels] = useState([]); // Array of 'coal', 'oil', 'gas'
  const [fuelCategory, setFuelCategory] = useState('all'); // 'all', 'fossil', or null

  useEffect(() => {
    Promise.all([
      fetch('/data/regional_net_imports_timeseries.json').then(res => res.json()),
      fetch('/data/lifetime_services_comparison.json').then(res => res.json()),
      fetch('/data/energy_potential_by_region.json').then(res => res.json())
    ])
      .then(([imports, services, potential]) => {
        setNetImportsData(imports);
        setLifetimeServicesData(services);
        setEnergyPotentialData(potential);

        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading data:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Process Chart 1 data
  const chart1Data = useMemo(() => {
    if (!netImportsData) return [];

    let data = [];

    if (viewMode === 'regions') {
      // Compare Regions mode
      if (selectedRegions.length === 0) return [];

      // Get all years across selected regions
      const allYears = new Set();
      selectedRegions.forEach(regionName => {
        const region = netImportsData.regions.find(r => r.region === regionName);
        if (region) {
          region.years.forEach(y => allYears.add(y.year));
        }
      });

      const years = Array.from(allYears).sort((a, b) => a - b);

      data = years.map(year => {
        const dataPoint = { year };

        selectedRegions.forEach(regionName => {
          const region = netImportsData.regions.find(r => r.region === regionName);
          if (region) {
            const yearData = region.years.find(y => y.year === year);
            if (yearData) {
              let value = 0;
              if (selectedFuel === 'total') {
                value = yearData.total.primary_ej;
              } else if (selectedFuel === 'fossil') {
                // Sum coal + oil + gas
                value = yearData.coal.primary_ej +
                        yearData.oil.primary_ej +
                        yearData.gas.primary_ej;
              } else {
                value = yearData[selectedFuel].primary_ej;
              }
              dataPoint[regionName] = value;
            }
          }
        });

        return dataPoint;
      });
    } else {
      // Compare Fuels mode
      const region = netImportsData.regions.find(r => r.region === selectedRegion);
      if (!region) return [];

      // Determine which fuels to show
      let fuelsToShow = [];
      if (fuelCategory === 'all') {
        fuelsToShow = ['coal', 'oil', 'gas'];
      } else if (fuelCategory === 'fossil') {
        fuelsToShow = ['coal', 'oil', 'gas'];
      } else {
        fuelsToShow = selectedFuels;
      }

      if (fuelsToShow.length === 0 && fuelCategory !== 'all') return [];

      data = region.years.map(yearData => {
        const dataPoint = { year: yearData.year };

        if (fuelCategory === 'all') {
          // Show total for all fuels
          dataPoint['Total'] = yearData.total.primary_ej;
        } else {
          // Show individual fuels
          fuelsToShow.forEach(fuel => {
            const fuelName = fuel.charAt(0).toUpperCase() + fuel.slice(1);
            dataPoint[fuelName] = yearData[fuel].primary_ej;
          });
        }

        return dataPoint;
      });
    }

    // Apply annual change calculation if enabled
    if (showAnnualChange && data.length > 1) {
      const changedData = [];
      for (let i = 1; i < data.length; i++) {
        const currentYear = data[i];
        const previousYear = data[i - 1];
        const changedPoint = { year: currentYear.year };

        Object.keys(currentYear).forEach(key => {
          if (key !== 'year') {
            changedPoint[key] = (currentYear[key] || 0) - (previousYear[key] || 0);
          }
        });

        changedData.push(changedPoint);
      }
      return changedData;
    }

    return data;
  }, [netImportsData, viewMode, selectedRegions, selectedRegion, selectedFuel, selectedFuels, fuelCategory, showAnnualChange]);

  // Process Chart 3 data - always sort by renewable advantage
  const chart3Data = useMemo(() => {
    if (!energyPotentialData) return [];

    let sorted = [...energyPotentialData.regions];
    sorted.sort((a, b) => b.renewable_advantage_ratio - a.renewable_advantage_ratio);

    return sorted.slice(0, 20); // Top 20 regions
  }, [energyPotentialData]);

  // Define region order to match Regions page structure exactly
  const DESIRED_REGION_ORDER = [
    // Global first
    'Global',
    // Continental regions (alphabetical)
    'Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America',
    // Major countries (alphabetical)
    'Australia', 'Brazil', 'Canada', 'China', 'France', 'Germany',
    'India', 'Indonesia', 'Japan', 'Mexico', 'Russia', 'Saudi Arabia',
    'South Africa', 'South Korea', 'United Kingdom', 'United States'
  ];

  // Get actual available regions from data
  const dataRegions = netImportsData?.regions.map(r => r.region) || [];

  // Filter desired regions to only include those that exist in the data, maintaining order
  const availableRegions = DESIRED_REGION_ORDER.filter(region => dataRegions.includes(region));

  const toggleRegion = (region) => {
    setSelectedRegions(prev => {
      if (prev.includes(region)) {
        return prev.filter(r => r !== region);
      } else {
        return [...prev, region];
      }
    });
  };

  const toggleFuel = (fuel) => {
    setSelectedFuels(prev => {
      if (prev.includes(fuel)) {
        return prev.filter(f => f !== fuel);
      } else {
        return [...prev, fuel];
      }
    });
  };

  const selectAllRegions = () => {
    setSelectedRegions(availableRegions);
  };

  const clearAllRegions = () => {
    setSelectedRegions([]);
  };


  const FUEL_COLORS = {
    'Coal': '#2C3E50',
    'Oil': '#FF6B35',
    'Gas': '#4ECDC4',
    'Total': '#3B82F6'
  };

  const getFuelColor = (fuel) => {
    return FUEL_COLORS[fuel] || '#6B7280';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-300 rounded shadow-lg">
          <p className="font-bold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value >= 0 ? '+' : ''}{entry.value.toFixed(2)} EJ
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomTooltipChart2 = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-300 rounded shadow-lg max-w-md">
          <p className="font-bold mb-2">{data.name}</p>
          <p className="text-sm text-gray-600 mb-2">{data.notes}</p>
          <p className="text-blue-600">Generation: {data.lifetime_generation_twh.toFixed(1)} TWh</p>
          <p className="text-green-600">Useful Energy: {data.lifetime_useful_energy_ej.toFixed(2)} EJ</p>
          <p className="text-red-600">Fuel Imports: {data.lifetime_fuel_imports_ej.toFixed(2)} EJ</p>
          <p className="font-bold text-lg mt-2">
            Net Services: {data.net_lifetime_services_ej >= 0 ? '+' : ''}{data.net_lifetime_services_ej.toFixed(2)} EJ
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipChart3 = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-300 rounded shadow-lg max-w-md">
          <p className="font-bold mb-2">{data.region}</p>
          <p className="text-sm text-gray-600 mb-2">{data.notes}</p>
          <div className="space-y-1">
            <p className="text-red-600">Fossil Reserves: {data.fossil_reserves.total.toLocaleString()} EJ</p>
            <p className="text-green-600">Renewable Potential: {data.renewable_potential.total.toLocaleString()} EJ</p>
            <p className="font-bold text-blue-600 mt-2">
              Advantage: {data.renewable_advantage_ratio.toFixed(0)}x more renewable potential
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="text-center py-20">
          <div className="text-xl text-gray-600">Loading data...</div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="text-center py-20">
          <div className="text-xl text-red-600">Error loading data: {error}</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-3">
          Breaking the Fossil Fuel Dependence Cycle
        </h1>
        <p className="text-sm text-gray-600">
          Compare energy imports by fuel across global regions and countries.
        </p>
      </div>

      {/* Chart 1: Net Energy Imports Over Time */}
      <div className="mb-12">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                Net Energy Imports Over Time
              </h2>
              <p className="text-sm text-gray-600">
                Positive values indicate net importers, negative values indicate net exporters
              </p>
            </div>
            <div className="flex gap-2">
              <ChartExportButtons
                onDownloadPNG={() => downloadChartAsPNG('chart1', 'net_energy_imports')}
                onDownloadCSV={() => downloadDataAsCSV(chart1Data, 'net_energy_imports')}
              />
              <FullscreenButton onClick={() => setIsFullscreenChart1(true)} />
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
            {/* View Mode Toggle */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">View Mode</h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">View Annual Change</span>
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
              <div className="flex gap-3">
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
                  onClick={() => setViewMode('fuels')}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    viewMode === 'fuels'
                      ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  Compare Fuel Types
                </button>
              </div>
            </div>

            {viewMode === 'regions' ? (
              <>
                {/* Region Selection */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Regions</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {availableRegions.map((region) => (
                      <button
                        key={region}
                        onClick={() => toggleRegion(region)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                          selectedRegions.includes(region)
                            ? 'text-white ring-2 ring-offset-2'
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
                      onClick={clearAllRegions}
                      className="px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Fuel Type Selection */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Fuel Type</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedFuel('total')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        selectedFuel === 'total'
                          ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      All Fuels
                    </button>
                    <button
                      onClick={() => setSelectedFuel('coal')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        selectedFuel === 'coal'
                          ? 'text-white ring-2 ring-offset-2'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      style={{
                        backgroundColor: selectedFuel === 'coal' ? '#2C3E50' : undefined,
                        ringColor: '#2C3E50'
                      }}
                    >
                      Coal
                    </button>
                    <button
                      onClick={() => setSelectedFuel('oil')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        selectedFuel === 'oil'
                          ? 'text-white ring-2 ring-offset-2'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      style={{
                        backgroundColor: selectedFuel === 'oil' ? '#FF6B35' : undefined,
                        ringColor: '#FF6B35'
                      }}
                    >
                      Oil
                    </button>
                    <button
                      onClick={() => setSelectedFuel('gas')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        selectedFuel === 'gas'
                          ? 'text-white ring-2 ring-offset-2'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      style={{
                        backgroundColor: selectedFuel === 'gas' ? '#4ECDC4' : undefined,
                        ringColor: '#4ECDC4'
                      }}
                    >
                      Gas
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Region Selection (Single) */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Region</h3>
                  <div className="flex flex-wrap gap-2">
                    {availableRegions.map((region) => (
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

                {/* Fuel Selection */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Fuel Types</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setFuelCategory('all');
                        setSelectedFuels([]);
                      }}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        fuelCategory === 'all'
                          ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      All Fuels
                    </button>
                    {['coal', 'oil', 'gas'].map(fuel => {
                      const isSelected = fuelCategory === null && selectedFuels.includes(fuel);
                      return (
                        <button
                          key={fuel}
                          onClick={() => {
                            if (fuelCategory === null) {
                              // Already in individual mode - toggle
                              toggleFuel(fuel);
                            } else {
                              // Switching from category mode - select only this fuel
                              setFuelCategory(null);
                              setSelectedFuels([fuel]);
                            }
                          }}
                          className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                            isSelected
                              ? 'text-white ring-2 ring-offset-2'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          style={{
                            backgroundColor: isSelected ? FUEL_COLORS[fuel.charAt(0).toUpperCase() + fuel.slice(1)] : undefined,
                            ringColor: FUEL_COLORS[fuel.charAt(0).toUpperCase() + fuel.slice(1)]
                          }}
                        >
                          {fuel.charAt(0).toUpperCase() + fuel.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Chart */}
          <div id="chart1">
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chart1Data} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="year"
                  label={{ value: 'Year', position: 'insideBottom', offset: -10 }}
                />
                <YAxis
                  label={{
                    value: showAnnualChange ? 'Net Primary Energy Imports (EJ/year)' : 'Net Primary Energy Imports (EJ)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {viewMode === 'regions' ? (
                  selectedRegions.map((region) => (
                    <Line
                      key={region}
                      type="monotone"
                      dataKey={region}
                      stroke={getRegionColor(region)}
                      strokeWidth={2}
                      dot={false}
                      name={region}
                    />
                  ))
                ) : (
                  // Compare Fuels mode
                  Object.keys(chart1Data[0] || {}).filter(key => key !== 'year').map((fuel) => (
                    <Line
                      key={fuel}
                      type="monotone"
                      dataKey={fuel}
                      stroke={getFuelColor(fuel)}
                      strokeWidth={2}
                      dot={false}
                      name={fuel}
                    />
                  ))
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart 2: Lifetime Energy Services Comparison */}
      <div className="mb-12">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                Lifetime Exergy Services Comparison
              </h2>
              <p className="text-sm text-gray-600">
                Fossil plants have negative net services due to perpetual fuel consumption. Renewables deliver positive lifetime exergy services.
              </p>
            </div>
            <div className="flex gap-2">
              <ChartExportButtons
                onDownloadPNG={() => downloadChartAsPNG('chart2', 'lifetime_services_comparison')}
                onDownloadCSV={() => {
                  const csvData = lifetimeServicesData.plant_types.map(p => ({
                    'Plant Type': p.name,
                    'Capacity (MW)': p.capacity_mw,
                    'Lifetime (years)': p.lifetime_years,
                    'Generation (TWh)': p.lifetime_generation_twh,
                    'Useful Energy (EJ)': p.lifetime_useful_energy_ej,
                    'Fuel Imports (EJ)': p.lifetime_fuel_imports_ej,
                    'Net Exergy Services (EJ)': p.net_lifetime_services_ej
                  }));
                  downloadDataAsCSV(csvData, 'lifetime_services_comparison');
                }}
              />
              <FullscreenButton onClick={() => setIsFullscreenChart2(true)} />
            </div>
          </div>

          <div id="chart2">
            <ResponsiveContainer width="100%" height={500}>
              <BarChart
                data={lifetimeServicesData?.plant_types || []}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 180, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" label={{ value: 'Net Lifetime Services (EJ)', position: 'insideBottom', offset: -5 }} />
                <YAxis dataKey="name" type="category" width={170} />
                <Tooltip content={<CustomTooltipChart2 />} />
                <Bar dataKey="net_lifetime_services_ej" name="Net Services">
                  {lifetimeServicesData?.plant_types.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.type === 'fossil' ? '#DC2626' : '#22C55E'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium mb-2">Reading this chart:</p>
            <ul className="list-disc list-inside space-y-1">
              <li className="text-red-600">Red bars: Negative values show lifetime fuel consumption that exceeds energy generation values</li>
              <li className="text-green-600">Green bars: Positive values show pure energy gain with zero fuel imports</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Chart 3: Energy Potential by Region */}
      <div className="mb-12">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                Energy Potential by Region
              </h2>
              <p className="text-sm text-gray-600">
                Most regions have 10-1000x more renewable potential than fossil fuel reserves
              </p>
            </div>
            <div className="flex gap-2">
              <ChartExportButtons
                onDownloadPNG={() => downloadChartAsPNG('chart3', 'energy_potential_by_region')}
                onDownloadCSV={() => {
                  const csvData = energyPotentialData.regions.map(r => ({
                    'Region': r.region,
                    'Fossil Reserves (EJ)': r.fossil_reserves.total,
                    'Renewable Potential (EJ)': r.renewable_potential.total,
                    'Renewable Advantage': `${r.renewable_advantage_ratio}x`,
                    'Notes': r.notes
                  }));
                  downloadDataAsCSV(csvData, 'energy_potential_by_region');
                }}
              />
              <FullscreenButton onClick={() => setIsFullscreenChart3(true)} />
            </div>
          </div>

          {/* Chart */}
          <div id="chart3">
            <ResponsiveContainer width="100%" height={700}>
              <BarChart
                data={chart3Data}
                layout="vertical"
                margin={{ top: 5, right: 80, left: 150, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  scale="log"
                  domain={[1, 200000]}
                  label={{ value: 'Energy Potential (EJ, log scale)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis dataKey="region" type="category" width={140} />
                <Tooltip content={<CustomTooltipChart3 />} />
                <Legend />
                <Bar dataKey="fossil_reserves.total" fill="#DC2626" name="Fossil Reserves (EJ)" />
                <Bar dataKey="renewable_potential.total" fill="#22C55E" name="Renewable Potential (EJ)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Understanding Energy Imports Section */}
      <div className="metric-card bg-white mb-8 border-2 border-blue-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Understanding Energy Imports
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: The Fossil Trap */}
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">The Fossil Fuel Trap</h3>
            <p className="text-gray-700 mb-3">
              Fossil fuel power plants create <strong>perpetual import dependency</strong>. A coal or gas plant requires continuous fuel shipments throughout its 30-40 year lifetime.
            </p>
            <p className="text-gray-700 mb-3">
              Over its lifetime, a 600 MW coal plant will import <strong>~1,330 EJ</strong> of coal, which far exceeds the useful energy that it generates.
            </p>
          </div>

          {/* Card 2: Electrification Benefit */}
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Electrification Benefit</h3>
            <p className="text-gray-700 mb-3">
              Electric motors are <strong>3-4x more efficient</strong> than combustion engines.
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Electric vehicles →</strong> Can run on any source of electricity</li>
              <li><strong>Gasoline vehicles →</strong> Require constant fuel imports</li>
            </ul>
            <p className="text-gray-700 mt-3">
              Electrification <strong>reduces energy consumption</strong> and <strong>fossil fuel imports.</strong>
            </p>
          </div>

          {/* Card 3: Renewable Advantage */}
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">The Renewable Advantage</h3>
            <p className="text-gray-700 mb-3">
              Renewable energy infrastructure <strong>will generate energy for decades.</strong>
            </p>
            <p className="text-gray-700 mb-3">
              Fossil fuel infrastructure <strong>will require fuel deliveries for decades.</strong>
            </p>
            <p className="text-gray-700 mt-3">
              Renewables require a one-time capital investment. Then they provide <strong>decades of energy independence</strong>. No fuel price risk, no supply disruptions, no emissions.
            </p>
          </div>

          {/* Card 4: Action */}
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Action: Map Your Transition</h3>
            <p className="text-gray-700 mb-3">
              For net importing nations, the path to energy independence is clear:
            </p>
            <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Electrify as much as possible:</strong> Transport, heating, industry</li>
              <li><strong>Build domestic energy generation:</strong> Prioritize renewable energy, or nuclear</li>
              <li><strong>Implement energy efficiency measures:</strong> Better insulation, process optimization</li>
            </ol>
          </div>
        </div>
      </div>

      {/* AI Chatbot */}
      <div className="mb-8">
        <AIChatbot />
      </div>

      {/* Fullscreen Modals */}
      <ChartFullscreenModal
        isOpen={isFullscreenChart1}
        onClose={() => setIsFullscreenChart1(false)}
        title="Net Energy Imports Over Time"
        description="Positive values indicate net importers, negative values indicate net exporters"
        exportButtons={
          <>
            <button
              onClick={() => downloadChartAsPNG('chart1', 'net_energy_imports')}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              title="Download chart as PNG image"
            >
              Download PNG
            </button>
            <button
              onClick={() => downloadDataAsCSV(chart1Data, 'net_energy_imports')}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
              title="Download chart data as CSV"
            >
              Download CSV
            </button>
          </>
        }
      >
        {/* Controls */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
          {/* View Mode Toggle */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">View Mode</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">View Annual Change</span>
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
            <div className="flex gap-3">
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
                onClick={() => setViewMode('fuels')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  viewMode === 'fuels'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Compare Fuel Types
              </button>
            </div>
          </div>

          {viewMode === 'regions' ? (
            <>
              {/* Region Selection */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Regions</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {availableRegions.map((region) => (
                    <button
                      key={region}
                      onClick={() => toggleRegion(region)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        selectedRegions.includes(region)
                          ? 'text-white ring-2 ring-offset-2'
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
                    onClick={clearAllRegions}
                    className="px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Fuel Type Selection */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Fuel Type</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedFuel('total')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      selectedFuel === 'total'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All Fuels
                  </button>
                  <button
                    onClick={() => setSelectedFuel('coal')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      selectedFuel === 'coal'
                        ? 'text-white ring-2 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    style={{
                      backgroundColor: selectedFuel === 'coal' ? '#2C3E50' : undefined,
                      ringColor: '#2C3E50'
                    }}
                  >
                    Coal
                  </button>
                  <button
                    onClick={() => setSelectedFuel('oil')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      selectedFuel === 'oil'
                        ? 'text-white ring-2 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    style={{
                      backgroundColor: selectedFuel === 'oil' ? '#FF6B35' : undefined,
                      ringColor: '#FF6B35'
                    }}
                  >
                    Oil
                  </button>
                  <button
                    onClick={() => setSelectedFuel('gas')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      selectedFuel === 'gas'
                        ? 'text-white ring-2 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    style={{
                      backgroundColor: selectedFuel === 'gas' ? '#4ECDC4' : undefined,
                      ringColor: '#4ECDC4'
                    }}
                  >
                    Gas
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Region Selection (Single) */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Region</h3>
                <div className="flex flex-wrap gap-2">
                  {availableRegions.map((region) => (
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

              {/* Fuel Type Selection (Multiple) */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Fuel Types</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setFuelCategory('all');
                      setSelectedFuels([]);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      fuelCategory === 'all'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All Fuels
                  </button>
                  {['coal', 'oil', 'gas'].map(fuel => {
                    const isSelected = fuelCategory === null && selectedFuels.includes(fuel);
                    return (
                      <button
                        key={fuel}
                        onClick={() => {
                          if (fuelCategory === null) {
                            toggleFuel(fuel);
                          } else {
                            setFuelCategory(null);
                            setSelectedFuels([fuel]);
                          }
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                          isSelected
                            ? 'text-white ring-2 ring-offset-2'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        style={{
                          backgroundColor: isSelected ? FUEL_COLORS[fuel.charAt(0).toUpperCase() + fuel.slice(1)] : undefined,
                          ringColor: FUEL_COLORS[fuel.charAt(0).toUpperCase() + fuel.slice(1)]
                        }}
                      >
                        {fuel.charAt(0).toUpperCase() + fuel.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={600}>
          <LineChart data={chart1Data} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="year"
              label={{ value: 'Year', position: 'insideBottom', offset: -10 }}
            />
            <YAxis
              label={{
                value: showAnnualChange ? 'Net Primary Energy Imports (EJ/year)' : 'Net Primary Energy Imports (EJ)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {viewMode === 'regions' ? (
              selectedRegions.map((region) => (
                <Line
                  key={region}
                  type="monotone"
                  dataKey={region}
                  stroke={getRegionColor(region)}
                  strokeWidth={2}
                  dot={false}
                  name={region}
                />
              ))
            ) : (
              Object.keys(chart1Data[0] || {}).filter(key => key !== 'year').map((fuel) => (
                <Line
                  key={fuel}
                  type="monotone"
                  dataKey={fuel}
                  stroke={getFuelColor(fuel)}
                  strokeWidth={2}
                  dot={false}
                  name={fuel}
                />
              ))
            )}
          </LineChart>
        </ResponsiveContainer>
      </ChartFullscreenModal>

      <ChartFullscreenModal
        isOpen={isFullscreenChart2}
        onClose={() => setIsFullscreenChart2(false)}
        title="Lifetime Exergy Services Comparison"
        description="Fossil plants have negative net services due to perpetual fuel consumption. Renewables deliver positive lifetime exergy services."
        exportButtons={
          <>
            <button
              onClick={() => downloadChartAsPNG('chart2', 'lifetime_services_comparison')}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              title="Download chart as PNG image"
            >
              Download PNG
            </button>
            <button
              onClick={() => {
                const csvData = lifetimeServicesData.plant_types.map(p => ({
                  'Plant Type': p.name,
                  'Capacity (MW)': p.capacity_mw,
                  'Lifetime (years)': p.lifetime_years,
                  'Generation (TWh)': p.lifetime_generation_twh,
                  'Useful Energy (EJ)': p.lifetime_useful_energy_ej,
                  'Fuel Imports (EJ)': p.lifetime_fuel_imports_ej,
                  'Net Energy Services (EJ)': p.net_lifetime_services_ej
                }));
                downloadDataAsCSV(csvData, 'lifetime_services_comparison');
              }}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
              title="Download chart data as CSV"
            >
              Download CSV
            </button>
          </>
        }
      >
        <ResponsiveContainer width="100%" height={600}>
          <BarChart
            data={lifetimeServicesData?.plant_types || []}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 180, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" label={{ value: 'Net Lifetime Services (EJ)', position: 'insideBottom', offset: -5 }} />
            <YAxis dataKey="name" type="category" width={170} />
            <Tooltip content={<CustomTooltipChart2 />} />
            <Bar dataKey="net_lifetime_services_ej" name="Net Services">
              {lifetimeServicesData?.plant_types.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.type === 'fossil' ? '#DC2626' : '#22C55E'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 text-sm text-gray-600">
          <p className="font-medium mb-2">Reading this chart:</p>
          <ul className="list-disc list-inside space-y-1">
            <li className="text-red-600">Red bars: Negative values show lifetime fuel consumption that exceeds energy generation values</li>
            <li className="text-green-600">Green bars: Positive values show pure energy gain with zero fuel imports</li>
          </ul>
        </div>
      </ChartFullscreenModal>

      <ChartFullscreenModal
        isOpen={isFullscreenChart3}
        onClose={() => setIsFullscreenChart3(false)}
        title="Energy Potential by Region"
        description="Most regions have 10-1000x more renewable potential than fossil fuel reserves"
        exportButtons={
          <>
            <button
              onClick={() => downloadChartAsPNG('chart3', 'energy_potential_by_region')}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              title="Download chart as PNG image"
            >
              Download PNG
            </button>
            <button
              onClick={() => {
                const csvData = energyPotentialData.regions.map(r => ({
                  'Region': r.region,
                  'Fossil Reserves (EJ)': r.fossil_reserves.total,
                  'Renewable Potential (EJ)': r.renewable_potential.total,
                  'Renewable Advantage': `${r.renewable_advantage_ratio}x`,
                  'Notes': r.notes
                }));
                downloadDataAsCSV(csvData, 'energy_potential_by_region');
              }}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
              title="Download chart data as CSV"
            >
              Download CSV
            </button>
          </>
        }
      >
        <ResponsiveContainer width="100%" height={700}>
          <BarChart
            data={chart3Data}
            layout="vertical"
            margin={{ top: 5, right: 80, left: 150, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              scale="log"
              domain={[1, 200000]}
              label={{ value: 'Energy Potential (EJ, log scale)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis dataKey="region" type="category" width={140} />
            <Tooltip content={<CustomTooltipChart3 />} />
            <Legend />
            <Bar dataKey="fossil_reserves.total" fill="#DC2626" name="Fossil Reserves (EJ)" />
            <Bar dataKey="renewable_potential.total" fill="#22C55E" name="Renewable Potential (EJ)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartFullscreenModal>
    </PageLayout>
  );
}

export default Imports;

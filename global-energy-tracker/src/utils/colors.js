// Energy source color palette - vibrant, modern colors
export const ENERGY_COLORS = {
  oil: '#FF6B35',
  gas: '#4ECDC4',
  coal: '#2C3E50',
  nuclear: '#9B59B6',
  hydro: '#3498DB',
  wind: '#16A085',
  solar: '#F39C12',
  biomass: '#27AE60',
  biofuels: '#8B4513',
  geothermal: '#E74C3C',
  other: '#2ECC71',
  other_renewables: '#00897B',
};

// Source display names
export const ENERGY_SOURCES = {
  oil: 'Oil',
  gas: 'Natural Gas',
  coal: 'Coal',
  nuclear: 'Nuclear',
  hydro: 'Hydro',
  wind: 'Wind',
  solar: 'Solar',
  biomass: 'Biomass',
  geothermal: 'Geothermal',
  other: 'Other Renewables',
  biofuels: 'Biofuels',
  other_renewables: 'Other Renewables',
};

// Fossil vs clean categorization
export const FOSSIL_SOURCES = ['oil', 'gas', 'coal'];
export const CLEAN_SOURCES = ['nuclear', 'hydro', 'wind', 'solar', 'biomass', 'geothermal', 'other'];

// Get color for a source
export const getSourceColor = (source) => ENERGY_COLORS[source] || '#999';

// Get display name for a source
export const getSourceName = (source) => ENERGY_SOURCES[source] || source;

// Check if source is fossil
export const isFossil = (source) => FOSSIL_SOURCES.includes(source);

// Region color palette - distinct, accessible colors for all regions/countries
export const REGION_COLORS = {
  // Continental regions
  'Africa': '#E74C3C',           // Red-orange
  'Asia': '#F39C12',             // Orange
  'Europe': '#3498DB',           // Blue
  'North America': '#9B59B6',    // Purple
  'South America': '#16A085',    // Teal
  'Oceania': '#27AE60',          // Green
  // Major countries
  'China': '#E67E22',            // Dark orange
  'India': '#8E44AD',            // Dark purple
  'United States': '#2C3E50',    // Very dark blue
  'Japan': '#E91E63',            // Pink
  'Germany': '#795548',          // Brown
  'United Kingdom': '#607D8B',   // Blue-grey
  'France': '#9C27B0',           // Deep purple
  'Brazil': '#4CAF50',           // Green
  'Canada': '#FF5722',           // Deep orange
  'South Korea': '#00BCD4',      // Cyan
  'Russia': '#F44336',           // Red
  'Indonesia': '#FFEB3B',        // Yellow
  'Mexico': '#8BC34A',           // Light green
  'Saudi Arabia': '#FFC107',     // Amber
  'Australia': '#009688',        // Teal
  'Italy': '#673AB7',            // Deep purple
  'Spain': '#FF9800',            // Orange
  'South Africa': '#3F51B5',     // Indigo
  // Economic groupings
  'European Union': '#2980B9',   // Medium blue
  'OECD': '#34495E',             // Dark gray-blue
  'Non-OECD': '#95A5A6'          // Light gray
};

// Get color for a region
export const getRegionColor = (region) => REGION_COLORS[region] || '#999';

// Get display name for a region (can add mapping if needed)
export const getRegionName = (regionKey) => regionKey;

/**
 * Data loading utilities
 */

let cachedData = null;

export const loadEnergyData = async () => {
  if (cachedData) return cachedData;

  try {
    const response = await fetch('/data/useful_energy_timeseries.json');
    if (!response.ok) {
      throw new Error('Failed to load energy data');
    }
    cachedData = await response.json();
    return cachedData;
  } catch (error) {
    console.error('Error loading energy data:', error);
    throw error;
  }
};

export const getLatestYear = (data) => {
  if (!data || !data.data || data.data.length === 0) return null;
  return data.data[data.data.length - 1];
};

export const getYearData = (data, year) => {
  if (!data || !data.data) return null;
  return data.data.find(d => d.year === year);
};

export const getYearRange = (data) => {
  if (!data || !data.data || data.data.length === 0) return { min: 0, max: 0 };
  return {
    min: data.data[0].year,
    max: data.data[data.data.length - 1].year
  };
};

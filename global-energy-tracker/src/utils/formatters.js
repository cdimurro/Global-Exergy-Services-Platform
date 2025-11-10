/**
 * Format energy value in Exajoules (EJ)
 * @param {number} value - Energy value in EJ
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted string
 */
export const formatEJ = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${value.toFixed(decimals)} EJ`;
};

/**
 * Format percentage
 * @param {number} value - Percentage value (0-100)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted string
 */
export const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format change with arrow and sign
 * @param {number} value - Change value
 * @param {string} unit - Unit ('EJ' or '%')
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted string with arrow
 */
export const formatChange = (value, unit = '%', decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '—';

  const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '→';
  const sign = value > 0 ? '+' : '';
  const formatted = unit === 'EJ'
    ? `${sign}${value.toFixed(decimals)} EJ`
    : `${sign}${value.toFixed(decimals)}%`;

  return `${arrow} ${formatted}`;
};

/**
 * Format large numbers with abbreviations
 * @param {number} value - Number to format
 * @returns {string} Formatted string
 */
export const formatLargeNumber = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '—';

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(1);
};

/**
 * Format CAGR (Compound Annual Growth Rate)
 * @param {number} value - CAGR percentage
 * @returns {string} Formatted string
 */
export const formatCAGR = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}% CAGR`;
};

/**
 * Get color class for change value
 * @param {number} value - Change value
 * @param {boolean} inverse - Whether lower is better
 * @returns {string} Tailwind color class
 */
export const getChangeColor = (value, inverse = false) => {
  if (value === null || value === undefined || isNaN(value)) return 'text-gray-500';

  const isPositive = value > 0;
  const isGood = inverse ? !isPositive : isPositive;

  if (value === 0) return 'text-gray-600';
  return isGood ? 'text-green-600' : 'text-red-600';
};

/**
 * Format year for display
 * @param {number} year - Year
 * @returns {string} Formatted year
 */
export const formatYear = (year) => {
  return year.toString();
};

/**
 * Format metric with value and change
 * @param {number} value - Current value
 * @param {number} change - Change value
 * @param {string} unit - Unit ('EJ' or '%')
 * @returns {object} Object with formatted strings
 */
export const formatMetricWithChange = (value, change, unit = 'EJ') => {
  return {
    value: unit === 'EJ' ? formatEJ(value) : formatPercent(value),
    change: formatChange(change, unit),
    changeColor: getChangeColor(change),
  };
};

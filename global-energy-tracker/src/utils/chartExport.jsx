/**
 * Chart Export Utilities
 * Provides functions for exporting charts as PNG and CSV
 */

/**
 * Download chart as PNG using html2canvas
 * @param {string} selector - CSS selector for the chart element
 * @param {string} filename - Name for the downloaded file (without extension)
 */
export const downloadChartAsPNG = async (selector, filename) => {
  const chartElement = document.querySelector(selector);
  if (!chartElement) {
    console.error(`Chart element not found: ${selector}`);
    return;
  }

  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(chartElement, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher resolution
      logging: false
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Error downloading PNG:', error);
  }
};

/**
 * Download data as CSV
 * @param {Array} data - Array of objects representing rows
 * @param {string} filename - Name for the downloaded file (without extension)
 * @param {Array} columns - Optional array of column headers (uses object keys if not provided)
 */
export const downloadDataAsCSV = (data, filename, columns = null) => {
  if (!data || data.length === 0) {
    console.error('No data to download');
    return;
  }

  try {
    // Get column headers
    const headers = columns || Object.keys(data[0]);

    // Build CSV content
    const csvRows = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];

        // Handle different value types
        if (value === null || value === undefined) {
          return '';
        }

        // Handle numbers
        if (typeof value === 'number') {
          return value;
        }

        // Handle strings - escape quotes and wrap in quotes if contains comma
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      });

      csvRows.push(values.join(','));
    });

    // Create blob and download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading CSV:', error);
  }
};

/**
 * Component for displaying data sources
 * Returns a text element with source citations
 */
export const ChartSources = ({ sources, className = '' }) => {
  if (!sources || sources.length === 0) return null;

  const sourceText = sources.length === 1
    ? `Source: ${sources[0]}`
    : `Sources: ${sources.join(', ')}`;

  return (
    <div className={`text-xs text-gray-500 mt-2 ${className}`}>
      {sourceText}
    </div>
  );
};

/**
 * Component for chart export buttons
 */
export const ChartExportButtons = ({ onDownloadPNG, onDownloadCSV, className = '' }) => {
  return (
    <div className={`flex flex-col sm:flex-row gap-2 sm:gap-3 ${className}`}>
      <button
        onClick={onDownloadPNG}
        className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm whitespace-nowrap"
        title="Download chart as PNG image"
      >
        Download PNG
      </button>
      <button
        onClick={onDownloadCSV}
        className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-xs sm:text-sm whitespace-nowrap"
        title="Download chart data as CSV"
      >
        Download CSV
      </button>
    </div>
  );
};

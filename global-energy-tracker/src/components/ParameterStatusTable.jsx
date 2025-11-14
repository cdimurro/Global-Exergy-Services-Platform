import { useState, useEffect } from 'react';

export default function ParameterStatusTable() {
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(null);

  useEffect(() => {
    fetch('/data/energy_services_timeseries.json')
      .then(res => res.json())
      .then(data => {
        calculateTableData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading energy data:', err);
        setLoading(false);
      });
  }, []);

  const calculateTableData = (data) => {
    const timeseries = data.data;
    const calculated = [];

    for (let i = 1; i < timeseries.length; i++) {
      const prev = timeseries[i - 1];
      const curr = timeseries[i];

      const fossilGrowth = curr.fossil_services_ej - prev.fossil_services_ej;
      const cleanGrowth = curr.clean_services_ej - prev.clean_services_ej;

      // Displacement is clean growth (if positive)
      const displacement = Math.max(0, cleanGrowth);

      // Net change is fossil growth minus displacement
      const netChange = fossilGrowth - displacement;

      let parameterStatus;
      let result;
      let physicalMeaning;

      // Handle special cases first
      if (cleanGrowth < 0) {
        parameterStatus = 'Displacement = 0 (Clean Shrinking)';
        result = 'Recarbonization';
        physicalMeaning = 'Clean exergy services were shrinking. Fossil fuels expanded to meet all exergy demand.';
      } else if (Math.abs(displacement - fossilGrowth) < 0.01) {
        parameterStatus = 'Displacement = Fossil Fuel Growth';
        result = 'Peak Reached';
        if (fossilGrowth < 0) {
          physicalMeaning = 'Fossil services were declining at the same rate clean services were growing. Peak fossil consumption.';
        } else {
          physicalMeaning = 'Clean growth perfectly balanced new fossil demand. Fossil consumption was flat.';
        }
      } else if (displacement < fossilGrowth) {
        parameterStatus = 'Displacement < Fossil Fuel Growth';
        result = 'Consumption Rises';
        if (fossilGrowth < 0) {
          physicalMeaning = 'Fossil services were declining, but clean growth was slower than the decline rate.';
        } else {
          physicalMeaning = 'Clean energy was growing, but new fossil demand was growing by a larger amount.';
        }
      } else {
        parameterStatus = 'Displacement > Fossil Fuel Growth';
        if (fossilGrowth < 0) {
          result = 'Consumption Declines';
          physicalMeaning = 'Fossil services were declining and clean growth exceeded the decline rate. Accelerated transition.';
        } else {
          result = 'Consumption Rises (Clean Outpacing)';
          physicalMeaning = 'Fossil consumption was still rising, but clean energy was growing by a larger amount. Fossil growth was slowing.';
        }
      }

      calculated.push({
        year: curr.year,
        displacement: displacement.toFixed(3),
        fossilGrowth: fossilGrowth.toFixed(3),
        netChange: netChange.toFixed(3),
        parameterStatus,
        result,
        physicalMeaning
      });
    }

    setTableData(calculated);
    // Set most recent year as default selection
    if (calculated.length > 0) {
      setSelectedYear(calculated[calculated.length - 1].year);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading parameter status data...</div>;
  }

  const getStatusColor = (status) => {
    if (status.includes('<')) return 'bg-red-50 border-red-600 text-red-800';
    if (status.includes('=')) return 'bg-yellow-50 border-yellow-600 text-yellow-800';
    if (status.includes('>')) return 'bg-green-50 border-green-600 text-green-800';
    return 'bg-gray-50 border-gray-600 text-gray-800';
  };

  const getResultBadge = (result) => {
    if (result.includes('Recarbonization')) {
      return <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
        {result}
      </span>;
    }
    if (result.includes('Rises') && result.includes('Outpacing')) {
      return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
        {result}
      </span>;
    }
    if (result.includes('Rises')) {
      return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
        {result}
      </span>;
    }
    if (result.includes('Peak')) {
      return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
        {result}
      </span>;
    }
    if (result.includes('Declines')) {
      return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
        {result}
      </span>;
    }
    return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
      {result}
    </span>;
  };

  const selectedYearData = tableData.find(row => row.year === selectedYear);

  // Get all years for selection (reversed to show most recent first)
  const allYears = [...tableData].reverse();

  const downloadCSV = () => {
    const csvData = [];

    // Add header
    csvData.push(['Year', 'Displacement (EJ/year)', 'Fossil Growth (EJ/year)', 'Net Change (EJ/year)', 'Parameter Status', 'Result', 'Physical Meaning']);

    // Add data rows
    tableData.forEach(row => {
      csvData.push([
        row.year,
        row.displacement,
        row.fossilGrowth,
        row.netChange,
        row.parameterStatus,
        row.result,
        `"${row.physicalMeaning}"` // Wrap in quotes to handle commas in text
      ]);
    });

    // Convert to CSV string
    const csvContent = csvData.map(row => row.join(',')).join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'parameter_status_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="metric-card bg-white mb-16">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">
          Parameter Status by Year
        </h2>
        <button
          onClick={downloadCSV}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Download CSV
        </button>
      </div>


      {/* Selected Year Details */}
      {selectedYearData && (
        <div className="mb-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-800">{selectedYearData.year} Analysis</h3>
            {getResultBadge(selectedYearData.result)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Displacement */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm font-semibold text-green-700 mb-1">
                Displacement (D)
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {selectedYearData.displacement} <span className="text-sm text-gray-500">EJ/year</span>
              </div>
            </div>

            {/* Fossil Growth */}
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-sm font-semibold text-red-700 mb-1">
                Fossil Fuel Growth
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {parseFloat(selectedYearData.fossilGrowth) > 0 ? '+' : ''}
                {selectedYearData.fossilGrowth} <span className="text-sm text-gray-500">EJ/year</span>
              </div>
            </div>

            {/* Net Change */}
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className={`text-3xl font-bold ${
                parseFloat(selectedYearData.netChange) > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {parseFloat(selectedYearData.netChange) > 0 ? '+' : ''}
                {selectedYearData.netChange} <span className="text-sm text-gray-500">EJ/year</span>
              </div>
            </div>
          </div>

          {/* Parameter Status */}
          <div className={`p-6 rounded-lg border-l-4 ${getStatusColor(selectedYearData.parameterStatus)}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-semibold uppercase tracking-wide mb-1">
                  Parameter Status
                </div>
                <div className="text-2xl font-mono font-bold">
                  {selectedYearData.parameterStatus}
                </div>
              </div>
            </div>
            <div className="text-gray-700 leading-relaxed">
              {selectedYearData.physicalMeaning}
            </div>
          </div>
        </div>
      )}

      {/* Full Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Year</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Parameter Status
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Net Change (EJ/year)
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Result</th>
            </tr>
          </thead>
          <tbody>
            {allYears.map((row, index) => (
              <tr
                key={row.year}
                className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                  selectedYear === row.year ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedYear(row.year)}
              >
                <td className="px-4 py-3 font-semibold text-gray-900">{row.year}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-sm font-semibold">
                    {row.parameterStatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${
                    parseFloat(row.netChange) > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {parseFloat(row.netChange) > 0 ? '+' : ''}{row.netChange}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {getResultBadge(row.result)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-sm font-semibold text-gray-700 mb-3">Understanding the Parameters:</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-mono font-semibold text-red-800">Displacement &lt; Fossil Fuel Growth:</span>
            <span className="text-gray-700 ml-2">Fossil rose by larger amount than clean</span>
          </div>
          <div>
            <span className="font-mono font-semibold text-yellow-800">Displacement = Fossil Fuel Growth:</span>
            <span className="text-gray-700 ml-2">Peak reached (balanced)</span>
          </div>
          <div>
            <span className="font-mono font-semibold text-blue-800">Displacement &gt; Fossil Fuel Growth (FF&gt;0):</span>
            <span className="text-gray-700 ml-2">Clean outpaced fossil (both rising)</span>
          </div>
          <div>
            <span className="font-mono font-semibold text-green-800">Displacement &gt; Fossil Fuel Growth (FF&lt;0):</span>
            <span className="text-gray-700 ml-2">Fossil declined</span>
          </div>
        </div>
      </div>
    </div>
  );
}

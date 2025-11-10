import { useEffect } from 'react';
import ParameterStatusTable from '../components/ParameterStatusTable';
import PageLayout from '../components/PageLayout';
import AIChatbot from '../components/AIChatbot';

export default function ParameterStatus() {
  // Force scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-3">
          Parameter Status by Year
        </h1>
        <p className="text-sm text-gray-600">
          Explore year-by-year analysis of displacement parameters and track the relationship between clean energy growth and fossil fuel consumption.
        </p>
      </div>

      {/* Parameter Status Table */}
      <div className="mb-8">
        <ParameterStatusTable />
      </div>

      {/* Key Insights Section */}
      <div className="metric-card bg-white mb-8 border-2 border-blue-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Understanding Parameter States
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Displacement &lt; Fossil Fuel Growth (Rising)
            </h3>
            <p className="text-gray-700">
              Clean energy is growing, but fossil fuel demand is growing by a larger amount. Fossil consumption continues to rise.
              This is the current state as of 2024.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Displacement = Fossil Fuel Growth (Peak)
            </h3>
            <p className="text-gray-700">
              Clean growth perfectly balances fossil demand changes. Fossil consumption is flat. This is the critical
              inflection point where fossil fuel use peaks.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Displacement &gt; Fossil Fuel Growth (Clean Outpacing)
            </h3>
            <p className="text-gray-700">
              Fossil consumption is still rising, but clean energy is growing by a larger amount. The transition is accelerating
              and fossil growth is slowing.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Displacement &gt; Fossil Fuel Growth (Declining)
            </h3>
            <p className="text-gray-700">
              Fossil services are declining and clean growth exceeds the decline rate. This represents an accelerated
              transition with actual reductions in fossil fuel use.
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

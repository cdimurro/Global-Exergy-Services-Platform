import { useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import DisplacementTracker from '../components/DisplacementTracker';
import NetChangeTimeline from '../components/NetChangeTimeline';
import DisplacementBySource from '../components/DisplacementBySource';
import AIChatbot from '../components/AIChatbot';

export default function DisplacementAnalysis() {
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
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-3">
          Fossil Fuel Displacement Analysis
        </h1>
        <p className="text-sm text-gray-600">
          Track the energy transition from fossil fuels to clean energy through displacement metrics and historical trends.
        </p>
      </div>

      {/* Displacement Tracker */}
      <div className="mb-8">
        <DisplacementTracker />
      </div>

      {/* Historical Timeline */}
      <div className="mb-8">
        <NetChangeTimeline />
      </div>

      {/* Displacement by Source */}
      <div className="mb-8">
        <DisplacementBySource />
      </div>

      {/* Key Insights Section */}
      <div className="metric-card bg-white mb-8 border-2 border-blue-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Understanding Displacement
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              What is Displacement?
            </h3>
            <p className="text-gray-700">
              Displacement (D) measures the rate at which clean exergy services are being added to the global energy system.
              When clean energy grows, it represents new capacity that can offset fossil fuel demand.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Peak Fossil Condition
            </h3>
            <p className="text-gray-700">
              When displacement (D) meets or exceeds fossil growth (FF<sub>growth</sub>) for a sustained period,
              fossil fuel consumption reaches a peak and begins to decline. This is the critical inflection point.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Current Reality (2024)
            </h3>
            <p className="text-gray-700">
              Clean energy is growing rapidly (+2.99 EJ/year), but fossil fuel demand is still growing faster (+3.13 EJ/year).
              We need clean energy growth to accelerate beyond current fossil demand growth to reach peak fossil.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Net Change Meaning
            </h3>
            <p className="text-gray-700">
              Net Change shows the actual change in fossil fuel consumption. Positive values mean fossil use is rising,
              negative values mean it's declining. This is the metric that matters for emissions reduction.
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

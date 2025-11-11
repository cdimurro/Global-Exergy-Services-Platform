import { useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import AIChatbot from '../components/AIChatbot';

export default function Methodology() {
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
          How This Platform Works
        </h1>
      </div>

      <div className="metric-card bg-white mb-8">
        <div className="space-y-10 text-gray-700 leading-relaxed text-base">
          {/* Energy Services vs Primary Energy */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Energy Services vs Primary Energy
            </h2>
            <p className="mb-4">
              Traditional energy metrics measure <strong>primary energy</strong> - the raw energy content of fuels before they're converted into useful work. This is fundamentally misleading because it counts massive amounts of wasted heat as if it were useful energy.
            </p>
            <p className="mb-4">
              This platform measures <strong>energy services</strong> - the actual useful work that energy delivers to society. Energy services represent the motion of vehicles, the heat in buildings, the light in rooms, and the power running our factories and devices. This is what actually matters.
            </p>
            <div className="bg-gray-100 border border-gray-300 p-4 text-center">
              <p className="font-semibold mb-2">A Simple Example:</p>
              <p className="text-gray-700">
                A gas car burns 100 units of gasoline but only 30 units actually go towards moving the car.<br/>
                An electric car uses 100 units of electricity and 90 units go towards moving the car.<br/>
                <strong>The electric car is 3-4x more efficient.</strong>
              </p>
            </div>
          </section>

          {/* Why Efficiency Matters */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Why Efficiency Changes Everything
            </h2>
            <p className="mb-4">
              Fossil fuels are incredibly inefficient. Most of the energy they contain is lost as waste heat during combustion and conversion. Clean electricity delivers far more useful energy, though transmission and end-use losses still apply.
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
              <p className="font-semibold text-gray-800 mb-2">Efficiency by Source (System-Wide):</p>
              <ul className="space-y-2 ml-4">
                <li>• Coal (power plants): <strong>~32% efficient</strong></li>
                <li>• Oil (combustion engines): <strong>~30% efficient</strong></li>
                <li>• Natural Gas (heating, power): <strong>~50% efficient</strong></li>
                <li>• Nuclear (thermal plants): <strong>~25% efficient</strong></li>
                <li>• Hydro (mechanical): <strong>~85% efficient</strong></li>
                <li>• Wind & Solar (direct electricity): <strong>~75% efficient</strong></li>
              </ul>
            </div>
            <p className="mb-4">
              <strong>Note on Nuclear:</strong> Nuclear power plants are thermal systems that obey Carnot cycle limits (~33% thermal efficiency), similar to coal plants. After accounting for transmission and end-use losses, the system-wide efficiency is ~25%. This is why useful energy accounting treats nuclear differently from wind/solar, which convert renewable flows directly to electricity.
            </p>
            <p>
              This efficiency gap is why electrification is so powerful. When we replace a fossil fuel service with renewable electricity (wind/solar), we need 2-3x less primary energy to accomplish the same work. This is the efficiency advantage of the energy transition.
            </p>
          </section>

          {/* How We Calculate Everything */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              How We Perform Our Calculations
            </h2>
            <p className="mb-4">
              We start with primary energy data from <strong>Our World in Data</strong> (which sources from the BP Statistical Review and Energy Institute). This gives us the raw energy consumption by source for every year from 1965 to 2024.
            </p>
            <p className="mb-4">
              We then apply efficiency factors to convert primary energy into energy services. These factors are based on research from the <strong>Rocky Mountain Institute (RMI)</strong> and have been calibrated to match their analysis of the global energy system.
            </p>
            <div className="bg-gray-100 border border-gray-300 p-4 my-4">
              <p className="font-semibold mb-3 text-gray-800">The Conversion Process:</p>
              <div className="space-y-2 text-sm">
                <p><strong>1.</strong> Take primary energy data (e.g., 166 EJ of coal consumed in 2024)</p>
                <p><strong>2.</strong> Multiply by efficiency factor (166 EJ × 0.32 = 53.1 EJ of useful services)</p>
                <p><strong>3.</strong> Repeat for all energy sources</p>
                <p><strong>4.</strong> Sum to get total energy services delivered globally</p>
              </div>
            </div>
            <p>
              This approach reveals the true picture: in 2024, the world consumed 625 EJ of primary energy but only received 251 EJ of useful energy services. The rest - 374 EJ - was completely wasted as heat.
            </p>
          </section>

          {/* Tracking Displacement */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Tracking Displacement
            </h2>
            <p className="mb-4">
              The displacement tracker answers a critical question: <strong>Is clean energy growing faster than fossil fuel demand?</strong> This is the metric that determines when fossil fuel consumption will peak and begin declining.
            </p>
            <div className="bg-gray-100 border border-gray-300 p-4 my-4 text-center">
              <p className="text-lg font-bold text-blue-600 mb-2">
                Δ Fossil Fuel Consumption = New Services (Fossil) − New Services (Clean)
              </p>
              <p className="text-sm text-gray-600">
                When clean energy displacement exceeds fossil growth, that means that fossil fuel consumption is declining.
              </p>
            </div>
            <p className="mb-4">
              We calculate three key metrics each year:
            </p>
            <div className="space-y-3">
              <div className="border-l-4 border-green-600 pl-4">
                <strong>Clean Energy Displacement (D):</strong> The annual growth in clean energy services. This represents how much fossil fuel demand clean energy is offsetting.
              </div>
              <div className="border-l-4 border-red-600 pl-4">
                <strong>Fossil Fuel Growth:</strong> The annual change in fossil fuel energy services. When positive, fossil consumption is rising. When negative, it's falling.
              </div>
              <div className="border-l-4 border-gray-600 pl-4">
                <strong>Net Change:</strong> The actual change in fossil fuel consumption after accounting for displacement. This is the number that matters for emissions.
              </div>
            </div>
          </section>

          {/* Understanding the Status */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Understanding the Status
            </h2>
            <p className="mb-4">
              The displacement gauge shows the current relationship between clean energy growth and fossil fuel growth. Here's what each status means:
            </p>
            <div className="space-y-4">
              <div className="bg-red-50 border-l-4 border-red-600 p-3">
                <strong className="text-red-800">Consumption Rising:</strong>
                <p className="text-gray-700 mt-1">Clean energy is growing, but fossil fuel demand is growing faster. Fossil consumption continues to increase. This is where we are today.</p>
              </div>
              <div className="bg-yellow-50 border-l-4 border-yellow-600 p-3">
                <strong className="text-yellow-800">Consumption Plateauing:</strong>
                <p className="text-gray-700 mt-1">Clean energy growth exactly matches fossil fuel growth. Fossil consumption is flat. This is the tipping point - we've reached peak fossil fuel.</p>
              </div>
              <div className="bg-green-50 border-l-4 border-green-600 p-3">
                <strong className="text-green-800">Consumption Declining:</strong>
                <p className="text-gray-700 mt-1">Clean energy is growing faster than fossil demand. Fossil consumption is actively falling. The energy transition is in full swing.</p>
              </div>
            </div>
          </section>

          {/* Data Sources */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Data Sources & Validation
            </h2>
            <div className="space-y-4">
              <div>
                <strong className="text-gray-800">Our World in Data (OWID)</strong>
                <p className="mt-1">
                  Primary energy consumption data by source from 1965-2024. OWID aggregates data from the Energy Institute Statistical Review of World Energy and BP Statistical Review.
                </p>
              </div>
              <div>
                <strong className="text-gray-800">Rocky Mountain Institute (RMI)</strong>
                <p className="mt-1">
                  Energy services methodology and efficiency factors. RMI's research demonstrates that global energy services are approximately 240 EJ, derived from roughly 620 EJ of primary energy at an overall system efficiency of ~38%.
                </p>
              </div>
              <div>
                <strong className="text-gray-800">International Energy Agency (IEA)</strong>
                <p className="mt-1">
                  Final energy consumption data used to validate our calculations and ensure accuracy across different measurement approaches.
                </p>
              </div>
            </div>
          </section>

          {/* Why This Matters */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Why This Matters
            </h2>
            <p className="mb-4">
              By measuring energy services instead of primary energy, we can finally see what's really happening in the energy transition. We can track the true impact of clean energy, understand the power of electrification, and identify exactly how close we are to peak fossil fuel consumption.
            </p>
            <p className="mb-4">
              This isn't just about better metrics - it's about better decision-making. When policymakers, businesses, and citizens understand that electric vehicles displace 3x their weight in fossil fuels, or that heat pumps cut energy use by 70%, it changes the entire conversation about climate action.
            </p>
            <p>
              The energy transition is happening. This dashboard shows you exactly how fast, where we stand, and what it will take to accelerate it.
            </p>
          </section>
        </div>
      </div>

      {/* AI Chatbot */}
      <div className="mb-8">
        <AIChatbot />
      </div>
    </PageLayout>
  );
}

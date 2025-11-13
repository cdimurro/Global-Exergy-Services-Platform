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
          {/* Three-Tier Energy Framework (v2.0) */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              A Better Way to Measure Energy Consumption
            </h2>
            <p className="mb-4">
              Traditional energy metrics measure <strong>primary energy</strong> - the raw energy content of fuels before they're converted into useful work. This is fundamentally misleading because it counts massive amounts of wasted heat as if it were useful energy.
            </p>
            <p className="mb-4">
              This platform uses a <strong>three-tier framework</strong> that focuses on <strong>Energy Services</strong> and accounts for both conversion efficiency and thermodynamic exergy:
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
              <div className="space-y-3">
                <div>
                  <strong className="text-blue-800">Tier 1: Primary Energy</strong>
                  <p className="text-gray-700">The raw energy we extract from nature (coal, oil, wind, sunlight). Global: ~620 EJ/year</p>
                </div>
                <div>
                  <strong className="text-blue-800">Tier 2: Useful Energy</strong>
                  <p className="text-gray-700">Energy that reaches end-users after conversion losses (efficiency × primary). Global: ~198 EJ/year</p>
                </div>
                <div>
                  <strong className="text-blue-800">Tier 3: Energy Services</strong>
                  <p className="text-gray-700">Thermodynamic value delivered, accounting for quality (exergy × useful). Global: ~150 EJ/year</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-100 border border-gray-300 p-4 text-center">
              <p className="font-semibold mb-2">A Simple Example:</p>
              <p className="text-gray-700">
                <strong>Coal Power:</strong> 1 EJ primary → 0.32 EJ useful (68% waste) → 0.27 EJ services<br/>
                <strong>Wind Power:</strong> 1 EJ primary → 0.90 EJ useful (10% waste) → 0.75 EJ services<br/>
                <strong>Wind is 2.8× more effective and wastes far less energy</strong>
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
              We need to start measuring energy consumption based on the actual energy services provided, because that is what matters to society, not how many BTUs are in a given amount of coal.
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
              <p className="font-semibold text-gray-800 mb-2">System-Wide Efficiency Measurements by Source (Primary → Useful):</p>
              <ul className="space-y-2 ml-4">
                <li>• Coal (power plants): <strong>32% efficient</strong> - Most energy lost as waste heat</li>
                <li>• Oil (combustion engines): <strong>30% efficient</strong> - ICE engines waste ~70%</li>
                <li>• Natural Gas (heating, power): <strong>50% efficient</strong> - Better than coal/oil</li>
                <li>• Nuclear (thermal conversion): <strong>25% efficient</strong> - Thermal plant losses</li>
                <li>• Biomass (traditional/modern mix): <strong>28% efficient</strong> - Combustion losses</li>
                <li>• Hydro: <strong>90% efficient</strong> - Minimal conversion waste (T&D losses only)</li>
                <li>• Wind: <strong>90% efficient</strong> - Minimal conversion waste (T&D losses only)</li>
                <li>• Solar: <strong>90% efficient</strong> - Minimal conversion waste (T&D losses only)</li>
                <li>• Geothermal: <strong>85% efficient</strong> - Some conversion losses</li>
              </ul>
              <p className="text-sm text-gray-600 mt-3">
                <em>Note: For energy services calculations (Tier 3), these values are further adjusted by exergy quality factors and end-use efficiency, resulting in lower effective rates (e.g., wind/solar ~75% for services).</em>
              </p>
            </div>
            <p className="mb-4">
              <strong>Exergy Quality Factors:</strong> Many people are unaware of the fact that energy has both a quantity and quality to it. In order to accurately calculate the quantity of energy, it's important to also account for the thermodynamic quality, which is known as <strong>exergy</strong>. Electricity has 100% quality, because it can be used to do any work, but low-temperature heat has a quality of ~20% because it can only be used to perform some work (you can't make steel with low-temperature heat). This gives clean energy sources an additional advantage. Wind, and solar deliver high-quality electricity (exergy 1.0) while using natural gas for heating delivers low-quality heat (exergy 0.2-0.5).
            </p>
            <p>
              This is why electrification is so powerful. When we replace a fossil fuel service with clean electricity (solar/wind/nuclear), we need 2.0-2.5× less primary energy to accomplish the same amount of thermodynamic work. This is one of the most underappreciated aspects of the energy transition, and it means that we don't need to replace 100% of fossil fuel primary energy consumption, we only need to replace ~40-45% to provide the same energy services.
            </p>
          </section>

          {/* How We Calculate Everything */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              How We Perform Our Calculations:
            </h2>
            <p className="mb-4">
              We start with primary energy data from <strong>Our World in Data</strong> (which sources from the Energy Institute Statistical Review). This gives us raw energy consumption by source for every year from 1965 to 2024.
            </p>
            <p className="mb-4">
              We then apply a <strong>three-tier calculation</strong> framework validated against IEA World Energy Outlook 2024, Brockway et al. 2019, and RMI 2024:
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4">
              <p className="font-semibold text-gray-800 mb-2">Validation ✓</p>
              <p className="text-sm text-gray-700">
                The results are then fine-tuned to align with academic benchmarks: Brockway et al. 2019 (~100 EJ services for 2015, ~120 EJ expected for 2024), IEA WEO 2024 (82.9% fossil services, 24.8% exergy efficiency), and RMI 2024 (2.0-2.5× clean advantage).
              </p>
            </div>
          </section>

          {/* Tracking Displacement */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Tracking Displacement
            </h2>
            <p className="mb-4">
              We calculate four key metrics for each year:
            </p>
            <div className="space-y-3">
              <div className="border-l-4 border-red-600 pl-4">
                <strong>Energy Services Demand:</strong> The net change in demand for new energy services (positive or negative).
              </div>
              <div className="border-l-4 border-green-600 pl-4">
                <strong>Clean Energy Displacement (D):</strong> The amount of fossil fuel consumption replaced by clean energy growth in a given year.
              </div>
              <div className="border-l-4 border-blue-600 pl-4">
                <strong>Efficiency Savings:</strong> The reduction in energy consumption achieved through improvements in energy efficiency, measured by changes in global exergy efficiency over time.
              </div>
              <div className="border-l-4 border-purple-600 pl-4">
                <strong>Net Change:</strong> The difference in the amount of fossil fuel consumption after accounting for displacement and efficiency savings in a given year.
              </div>
            </div>
            <p className="mb-4">
              The displacement tracker answers a critical question: <strong>Is clean energy growing more than fossil fuels?</strong> This is the metric that matters for reducing emissions.
            </p>
            <div className="bg-gray-100 border border-gray-300 p-4 my-4 text-center">
              <p className="text-lg font-bold text-blue-600 mb-2">
                Δ Fossil Fuel Consumption = Energy Services Demand - Clean Displacement - Efficiency Savings
              </p>
              <p className="text-sm text-gray-600">
                When this number is positive, it means that fossil fuel consumption is increasing. 
              </p>
              <p className="text-sm text-gray-600">
                When this number is negative, it means that fossil fuel consumption is decreasing.
              </p>
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
                <p className="text-gray-700 mt-1">Clean energy is growing, but fossil fuel consumption is growing by a larger amount. In this scenario, fossil consumption continues to increase. This is where we currently are.</p>
              </div>
              <div className="bg-yellow-50 border-l-4 border-yellow-600 p-3">
                <strong className="text-yellow-800">Consumption Plateauing:</strong>
                <p className="text-gray-700 mt-1">Clean energy displacement roughly matches the net change in fossil fuel consumption. In this scenario, fossil consumption remains relatively flat. This is a sign that we've reached a potential tipping point or that we are simply in a period of slow growth.</p>
              </div>
              <div className="bg-green-50 border-l-4 border-green-600 p-3">
                <strong className="text-green-800">Consumption Declining:</strong>
                <p className="text-gray-700 mt-1">Clean energy and energy efficiency measures are displacing a larger amount of energy services than fossil fuels are meeting. In this scenario, fossil consumption will continue declining.</p>
              </div>
            </div>
          </section>

          {/* Data Sources */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Data Sources & Validation (v2.0)
            </h2>
            <div className="space-y-4">
              <div>
                <strong className="text-gray-800">Our World in Data (OWID)</strong>
                <p className="mt-1">
                  Primary energy consumption data by source from 1965-2024. OWID aggregates data from the Energy Institute Statistical Review of World Energy (formerly BP Statistical Review).
                </p>
              </div>
              <div>
                <strong className="text-gray-800">IEA World Energy Outlook (WEO) 2024</strong>
                <p className="mt-1">
                  Exergy efficiency benchmarks (~25% global), fossil/clean service shares (80-82% / 18-20%), and efficiency factor validation. Our 2024 results: 24.8% exergy efficiency, 82.9% fossil services ✓
                </p>
              </div>
              <div>
                <strong className="text-gray-800">Brockway et al. 2019</strong>
                <p className="mt-1">
                  Academic foundation for energy services framework. Estimated ~100 EJ global services (2015). Our 2024 result: 150 EJ services ✓ (aligned with ~120 EJ expected for 2024)
                </p>
              </div>
              <div>
                <strong className="text-gray-800">IEA Energy Efficiency Indicators (EEI) 2024</strong>
                <p className="mt-1">
                  Source-specific efficiency factors, regional variations (China coal 40%, US gas 48%), and exergy methodology for sectoral allocation.
                </p>
              </div>
              <div>
                <strong className="text-gray-800">RMI 2024 & Cullen & Allwood 2010</strong>
                <p className="mt-1">
                  Final energy proxy methodology, traditional biomass efficiency (8-15%), and theoretical minimum energy demand for end-use services. Validates our 2.0-2.5× clean efficiency advantage.
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
              By measuring energy services instead of primary energy, we can finally get an accurate sense of what energy sources are providing our energy. This will allow us to gain useful insights into how the energy transition is progressing, and it will allow us to track the true impact of whether clean energy sources are displacing fossil fuel consumption, or not. It also helps us understand the power of electrification, and identify exactly how close we are to peak fossil fuel consumption.
            </p>
            <p className="mb-4">
              This isn't just about better metrics - it's about better decision-making. When policymakers, businesses, and citizens understand that electric vehicles displace 3x their weight in fossil fuels, or that heat pumps cut energy use by 70%, it changes the entire conversation about climate action.
            </p>
            <p>
              The energy transition is happening. This dashboard measures it properly, so that you can actually see it. The real value doesn't come from being able to see the energy transition though, it comes from understanding exactly what's needed to accelerate it.
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

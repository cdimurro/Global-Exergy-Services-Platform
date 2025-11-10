import { useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import AIChatbot from '../components/AIChatbot';

export default function RealityCheck() {
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
          The Truth of the Energy Transition
        </h1>
      </div>

      <div className="metric-card bg-white mb-8">
        <div className="space-y-10 text-gray-700 leading-relaxed text-base">
          {/* Fossil Fuels Rule the Real World */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Fossil Fuels Rule the Real World
            </h2>
            <p className="mb-4">
              Despite the hype surrounding the energy transition, <strong>81.4% of useful energy services</strong> (mobility, heat, manufacturing) still come from oil, gas and coal. Fossil fuels have several inherent advantages, which is why they are so deeply integrated into our energy systems. These advantages include:
            </p>
            <ul className="list-disc ml-6 space-y-2 mb-4">
              <li>High energy density</li>
              <li>Incredible versatility</li>
              <li>Ease of transportation and storage</li>
              <li>Dispatchability at any time</li>
              <li>Established infrastructure</li>
              <li>Deep embedding in everyday modern products</li>
            </ul>
            <p>
              In addition to these advantages, fossil fuels are also extremely reliable and generally considered an affordable source of energy. This is why they have historically dominated our energy systems, and why they still do.
            </p>
          </section>

          {/* Growth Mismatch, Not Magic */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Growth Mismatch, Not Magic
            </h2>
            <p className="mb-4">
              The reason fossil fuel consumption has continued to increase year after year is actually very simple. The amount of demand from new energy services that fossil fuels meet has been consistently larger than the amount of fossil fuel consumption that has been offset by non-fossil fuel sources. However, this phenomenon is actually quite complex to calculate with a high degree of precision. Luckily the general principle used measure the net change in fossil fuel consumption is pretty straightforward, and it can be expressed by this simplified formula:
            </p>
            <div className="bg-gray-100 border border-gray-300 p-4 my-4 text-center">
              <p className="text-lg font-bold text-blue-600">
                Δ Fossil Fuel Consumption = New Services (Fossil) − New Services (Clean)
              </p>
            </div>
            <p className="mb-4">
              Measuring the net change in fossil fuel consumption is actually much more valuable than measuring primary energy consumption because it can provide useful insights into how fast fossil fuel demand is actually growing, and when it might peak. For example, if the total amount of energy services grew by 100 EJ in 2023, and fossil fuels met 60 EJ of that new demand, while clean sources met 40 EJ of that new demand, it would seem like fossil fuels grew by 60 EJ that year. But that may not be the case. If all the clean energy sources from previous years and fossil fuel equipment retirements that year added up to 30 EJ of energy services being replaced by clean energy, the net change in fossil fuel consumption for 2023 would actually only have been 30 EJ.
            </p>
            <p>
              This is why measuring the net change in fossil fuel consumption is so important. If the Δ Fossil Fuel consumption value is positive, it means that fossil fuel consumption is increasing, and if the value is negative, it means that fossil fuel consumption is declining.
            </p>
          </section>

          {/* Politics, Not Physics, Blocks It */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Politics, Not Physics, Blocks It
            </h2>
            <p className="mb-4">
              One of the key takeaways from creating this platform is that it has identified that <strong>politics is actually what's slowing down the energy transition, not physics or technology</strong>. This analysis highlights that without strong policies in place to accelerate the displacement rate, the idea of an energy transition may continue to remain elusive. This is primarily because the amount of new energy services being met by fossil fuels is still so high that it's no longer sufficient to wait until clean energy sources scale to replace those energy services.
            </p>
            <p className="mb-4">
              To accelerate the Energy Transition we need a three-pronged approach to reducing fossil fuel consumption. One of the reasons progress has been so slow is because we are measuring energy consumption the wrong way, and we are heavily subsidizing fossil fuels. Unless we fix policy first and correct the subsided, waiting for clean energy technologies to displace fossil fuel will prove to be a losing strategy. Here are the three steps that are needed to reduce fossil fuel consumption:
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
              <ol className="list-decimal ml-6 space-y-2 font-semibold">
                <li>Electrify at scale</li>
                <li>Displace fossil energy services</li>
                <li>Use energy more efficiently</li>
              </ol>
            </div>
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4">
              <p className="font-semibold text-gray-800 mb-2">Why it works:</p>
              <ul className="space-y-2 ml-4">
                <li>• Electrification moves the useful work to high-efficiency consumption.</li>
                <li>• Displacement directly replaces fossil fuel consumption with clean energy.</li>
                <li>• Energy efficiency reduces the total amount of energy demand to meet.</li>
              </ul>
            </div>
            <div className="text-center my-6">
              <p className="text-base text-blue-600">
                <span className="italic">
                  The energy transition isn't failing. It's just getting started.<br/>
                  Clean energy is growing 3x faster than fossil fuels.<br/>
                  Every electrified home, factory, and vehicle displaces 3x its weight in fossil fuels.<br/>
                  This dashboard shows the proof and the way forward.
                </span>
                <br/>
                <span className="font-bold">
                  Electrify. Optimize. Displace. Repeat.
                </span>
              </p>
            </div>
          </section>

          {/* The Unsung Heroes */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Electrification is the engine. Energy efficiency is the turbocharger.
            </h2>
            <p className="mb-4">
              <strong>Primary energy consumption, which is how most energy consumption is measured globally, is fundamentally inaccurate</strong> because it mostly measures energy that was wasted as heat and provided absolutely no value to society. Primary energy consumption metrics also make up numbers out of thin air by inflating the numbers for both nuclear and renewables when using the substitution method.
            </p>
            <p className="mb-4">
              The fact that the most common way we measure energy consumption has so many flaws means we've essentially been flying blind, and it's one of the main reasons why the energy transition hasn't made more progress. This platform was created to help solve the many shortcomings of tracking the energy system by using primary energy consumption. To solve this, we aimed to create the most comprehensive and accurate picture of the entire global energy system at a high level.
            </p>
            <p className="mb-4">
              By measuring the amount of energy services provided instead of primary energy consumption, we can cut through the noise and waste, and get a clearer sense of where energy is being, what it's being used for, and how much value it's providing to society.
            </p>
          </section>

          {/* Conclusion */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              A New Path Forward
            </h2>
            <p className="mb-4">
              Thanks to a vast arrangement of data and new technologies, it's now possible to create a much more accurate picture of the global energy system. The insights gained by changing how we measure energy could have massive implications across the world, and could also play a pivotal role in how we manage the energy transition.
            </p>
            <div className="bg-gray-100 border border-gray-300 p-4 text-center">
              <p className="font-semibold mb-2">The Key Difference:</p>
              <p className="text-gray-700">
                <strong>Primary energy</strong> measures how much oil, coal, and gas gets wasted.<br/>
                <strong>Energy services</strong> measure how much energy a car uses to drive somewhere.
              </p>
            </div>
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

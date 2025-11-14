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
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-3">
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
              Despite the hype surrounding the energy transition, <strong>81.97% of useful energy services</strong> (mobility, heat, manufacturing) still come from fossil fuels. Hydrocarbons like oil, gas, and coal have several inherent advantages, which is why they are so deeply integrated into our energy systems. These advantages include:
            </p>
            <ul className="list-disc ml-6 space-y-2 mb-4">
              <li>High energy density</li>
              <li>Incredible versatility</li>
              <li>Ease of transportation and storage</li>
              <li>Dispatchability at any time</li>
              <li>Established infrastructure</li>
              <li>Deep integration in everyday modern products</li>
            </ul>
            <p>
              In addition to these advantages, fossil fuels are also extremely reliable and generally considered to be an affordable source of energy. This is why fossil fuels have historically dominated our energy systems, and why they still do. 
            </p>
          </section>

          {/* Growth Mismatch, Not Magic */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Growth Mismatch, Not Magic
            </h2>
            <p className="mb-4">
              The reason fossil fuel consumption has continued to increase year after year is actually very simple when looking at it through the lens of energy services. The amount of demand for new energy services that fossil fuels have met has been consistently larger than the amount of fossil fuel consumption that has been offset by the amount of energy services that clean energy have been able to meet. However, calculating this phenomenon with a high degree of precision is actually quite complex. Luckily, the general principles used to measure the net change in fossil fuel consumption are well understood, and they can be expressed by this simplified formula:
            </p>
            <div className="bg-gray-100 border border-gray-300 p-4 my-4 text-center">
              <p className="text-lg font-bold text-blue-600">
                <strong>Δ Fossil Fuel Consumption = Energy Services Demand - Clean Displacement - Efficiency Savings</strong>
              </p>
            </div>
            <p className="mb-4">
              Measuring the net change in fossil fuel consumption is valuable because it can provide insights into how fast fossil fuel consumption is actually growing, and when it might peak. This is why accurately measuring the net change in fossil fuel consumption is so important. If the Δ Fossil Fuel consumption value is positive, it means that fossil fuel consumption is increasing, and if the value is negative, it means that fossil fuel consumption is declining. 
            </p>
          </section>

          {/* Politics, Not Physics, Blocks It */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Politics, Not Physics, Blocks It
            </h2>
            <p className="mb-4">
              One of the key takeaways from creating this platform was that it has identified that <strong>politics is actually what's slowing the energy transition down, not physics or technology</strong>. <strong>Without strong policies in place to accelerate the displacement rate and efficiency savings, the idea of an energy transition may continue to remain elusive.</strong> This is primarily because the demand for new energy services is so high that it's unrealistic to expect clean energy sources fast enough to provide all of those energy services and also offset fossil fuel consumption. 
            </p>
            <p className="mb-4">
              In order to accelerate the Energy Transition we need a multi-faceted approach to reducing fossil fuel consumption. Part of the reason why progress has been so slow is because we have been measuring energy consumption the wrong way, but it's also because fossil fuels are still heavily subsidized globally. Unless we fix the policies first and remove the subsidies, waiting for clean energy technologies to displace fossil fuel consumption on their own will prove to be a losing strategy. Here are the 5 steps that are needed to reduce fossil fuel consumption:
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
              <ol className="list-decimal ml-6 space-y-2 font-semibold">
                <li>Electrify as much as possible</li>
                <li>Build more renewable energy and nuclear generation</li>
                <li>Prioritize the displacement of fossil fuel energy services</li>
                <li>Use energy more efficiently</li>
                <li>Remove fossil fuel subsidies and correct for unpriced externalities</li>
              </ol>
            </div>
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4">
              <p className="font-semibold text-gray-800 mb-2">Why it works:</p>
              <ul className="space-y-2 ml-4">
                <li>• Electrification moves the useful work to high-efficiency consumption.</li>
                <li>• Building more renewable energy and nuclear capacity gets more clean high quality energy into the system.</li>
                <li>• Displacement directly reduces fossil fuel consumption by replacing it with clean energy.</li>
                <li>• Energy efficiency reduces the total amount of energy services that need to be met.</li>
                <li>• Removing subsidies for fossil fuels allows that money to be invested elsewhere and lets the market work better.</li>
              </ul>
            </div>
          </section>

          {/* The Unsung Heroes */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Electrification is the engine. Energy efficiency is the turbocharger. Renewables and nuclear are the workhorses.
            </h2>
            <p className="mb-4">
              <strong>Electrifying as much as possible is always the first step to making our energy systems cleaner and more efficient.</strong> There is no other single action that has a larger impact on improving the overall efficiency of the energy system than electrification. In past years the focus has been to electrify, building more clean energy, and then use less energy through efficiency. While this simple blueprint still holds true, it ignores the growth of energy demand, and the entrenched nature of fossil fuels across our energy systems. In order to further refine this approach, and get faster results, we should prioritize displacing the energy services that are currently being met by fossil fuels first, while also removing fossil fuel subsidies and pricing in any unpriced externalities. 

              The reason we want as much electrification as possible is because electric technologies are much more efficient at converting energy into work than fossil fuels are. Electric vehicles are typically around 3 times more efficient than internal combustion engine vehicles, and heat pumps can be up to 4 times more efficient than traditional gas furnaces. By electrifying as much as possible, we can provide the same energy services with clean energy, and by using 2-2.5x less primary energy. The amount of energy that we waste would drop significantly if we electrified everything.
            </p>
          </section>

          {/* Conclusion */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              A New Path Forward
            </h2>
            <p className="mb-4">
              The fact that the most common way we measure energy consumption is so fundamentally flawed means that we've essentially been flying blind, and it's one of the main reasons why the energy transition hasn't made more progress, and often receives criticism. This platform was designed to create the most accurate picture of the entire global energy system, by addressing the shortcomings of traditional primary energy measurements, and focusing on energy services instead.
            </p>
            <p className="mb-4">
              Measuring energy services allows us to cut through the noise and get a clearer sense of where energy is being used, what it's being used for, and how much value it's providing to society. It also shows us how much energy is being wasted, where it's being wasted, and how to eliminate that waste. This is crucial information for policymakers, businesses, and individuals who are trying to make informed decisions about energy use and sustainability.
            </p>
            <p className="mb-4">
              Thanks to a vast arrangement of data and new technologies, it's now possible to create a much more accurate picture of the global energy system. The insights gained by changing how we measure energy could have massive implications across the world, and could play a pivotal role in how we manage the energy transition.
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

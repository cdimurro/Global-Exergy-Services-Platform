export default function About() {
  return (
    <div className="py-16 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="metric-card bg-white">
          <div className="space-y-8">
            {/* What are Energy Services */}
            <div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">What are "Energy Services"?</h3>
              <p className="text-gray-700 mb-4">
                Most energy statistics report <strong>primary energy</strong> - the total energy content of raw fuels before conversion. This dashboard shows <strong>energy services</strong> - the actual work delivered to power our lives.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 mb-4">
                <div className="font-semibold mb-2 text-gray-800">The Energy Chain:</div>
                <ul className="space-y-1 text-gray-700">
                  <li><strong>Primary Energy:</strong> ~620 EJ (raw fuels)</li>
                  <li><strong>Conversion Losses:</strong> ~380 EJ lost as heat</li>
                  <li><strong>Energy Services:</strong> ~240 EJ (work delivered)</li>
                </ul>
              </div>
              <p className="text-gray-600">
                This represents an overall system efficiency of ~38%, with fossil fuels averaging 30-35% efficiency and clean electricity averaging 85-90%.
              </p>
            </div>

            {/* Why This Matters */}
            <div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Why This Matters</h3>
              <p className="text-gray-700 mb-4">
                Tracking useful energy reveals the true picture of the energy transition:
              </p>
              <ul className="space-y-3 text-gray-700">
                <li>
                  <strong>Clean energy is more efficient:</strong> 1 EJ of renewable electricity delivers 2-3x more useful energy than 1 EJ of coal
                </li>
                <li>
                  <strong>Electrification multiplies impact:</strong> Replacing fossil heat/transport with electric alternatives requires less primary energy
                </li>
                <li>
                  <strong>Real displacement tracking:</strong> Shows how much fossil fuel work is actually being replaced
                </li>
              </ul>
            </div>

            {/* Data Sources and Methodology */}
            <div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Data Sources & Methodology</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-lg mb-3 text-gray-800">Primary Data Sources</h4>
                  <ul className="space-y-3 text-gray-700">
                    <li>
                      <strong>Our World in Data:</strong> Primary and final energy consumption by source (1965-2024)
                    </li>
                    <li>
                      <strong>IEA Energy Efficiency Indicators:</strong> Sector-specific efficiency factors
                    </li>
                    <li>
                      <strong>RMI (Rocky Mountain Institute):</strong> Validation benchmarks for 2023 data
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-3 text-gray-800">Efficiency Factors Applied</h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-red-50 p-3 rounded border-l-2 border-red-600">
                      <div className="font-semibold text-red-700 mb-2">Fossil Fuels</div>
                      <div className="text-gray-700 text-sm">Oil: 30%</div>
                      <div className="text-gray-700 text-sm">Gas: 50%</div>
                      <div className="text-gray-700 text-sm">Coal: 32%</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded border-l-2 border-green-600">
                      <div className="font-semibold text-green-700 mb-2">Clean Energy</div>
                      <div className="text-gray-700 text-sm">Electricity: 90%</div>
                      <div className="text-gray-700 text-sm">Biomass: 28%</div>
                    </div>
                  </div>
                  <p className="text-gray-600">
                    Factors calibrated to match RMI 2023 benchmark of ~240 EJ total useful energy
                  </p>
                </div>
              </div>
            </div>

            {/* Key Insights */}
            <div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Key Insights</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-lg mb-2 text-gray-800">Current State (2024)</h4>
                  <p className="text-gray-700">
                    Fossil fuels still provide 78% of useful energy services despite decades of renewable growth. The challenge is larger than most realize.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-lg mb-2 text-gray-800">Annual Growth Patterns</h4>
                  <p className="text-gray-700">
                    Clean energy is growing rapidly in percentage terms, but fossil fuels still met 51% of new energy demand in 2024.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-lg mb-2 text-gray-800">Efficiency Advantage</h4>
                  <p className="text-gray-700">
                    Electrification's 2-3x efficiency gain means we need less renewable capacity than fossil fuel replacement suggests.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

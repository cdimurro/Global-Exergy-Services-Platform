import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import DisplacementAnalysis from './pages/DisplacementAnalysis';
import EnergySupply from './pages/EnergySupply';
import DemandGrowth from './pages/DemandGrowth';
import Regions from './pages/Regions';
import ParameterStatus from './pages/ParameterStatus';
import RealityCheck from './pages/RealityCheck';
import Methodology from './pages/Methodology';

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/displacement" element={<DisplacementAnalysis />} />
          <Route path="/energy-supply" element={<EnergySupply />} />
          <Route path="/demand-growth" element={<DemandGrowth />} />
          <Route path="/regions" element={<Regions />} />
          <Route path="/parameter-status" element={<ParameterStatus />} />
          <Route path="/reality-check" element={<RealityCheck />} />
          <Route path="/methodology" element={<Methodology />} />
        </Routes>

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-12 mt-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="text-2xl font-bold mb-4">Global Energy Services Tracker</div>
            <div className="text-gray-400 mb-4">
              Showing the true picture of the world's energy system
            </div>
            <div className="text-sm text-gray-500">
              Data sources: Our World in Data, IEA, RMI, EEI | Validated with expert analysis
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

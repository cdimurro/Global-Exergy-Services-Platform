import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import DisplacementAnalysis from './pages/DisplacementAnalysis';
import EnergySupply from './pages/EnergySupply';
import DemandGrowth from './pages/DemandGrowth';
import Regions from './pages/Regions';
import Imports from './pages/Imports';
import RealityCheck from './pages/RealityCheck';
import Methodology from './pages/Methodology';

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" style={{ overflowAnchor: 'none' }}>
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/displacement" element={<DisplacementAnalysis />} />
          <Route path="/energy-supply" element={<EnergySupply />} />
          <Route path="/demand-growth" element={<DemandGrowth />} />
          <Route path="/regions" element={<Regions />} />
          <Route path="/imports" element={<Imports />} />
          <Route path="/reality-check" element={<RealityCheck />} />
          <Route path="/methodology" element={<Methodology />} />
        </Routes>
      </div>
    </Router>
  );
}

import { Link, useLocation } from 'react-router-dom';

export default function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/displacement', label: 'Displacement' },
    { path: '/energy-supply', label: 'Energy Supply' },
    { path: '/demand-growth', label: 'Demand Growth' },
    { path: '/regions', label: 'Regions' },
    { path: '/parameter-status', label: 'Parameter Status' },
    { path: '/reality-check', label: 'Reality Check' },
    { path: '/methodology', label: 'Methodology' }
  ];

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50 border-b-2 border-blue-600">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-center items-center h-20">
          <div className="flex space-x-2">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-5 py-3 rounded-lg font-semibold text-base transition-all ${
                  location.pathname === item.path
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-600 ring-offset-2'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

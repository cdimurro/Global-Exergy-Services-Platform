import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navigation() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16 md:h-20">

          {/* Logo/Title - Visible on mobile */}
          <div className="font-bold text-lg md:text-xl text-gray-800 md:hidden">
            Energy Tracker
          </div>

          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden md:flex md:space-x-2 md:mx-auto">
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

          {/* Mobile Hamburger Button - Hidden on desktop */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              // X icon when menu is open
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              // Hamburger icon when menu is closed
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu - Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-200">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-3 px-4 font-semibold transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

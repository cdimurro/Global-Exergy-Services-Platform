/**
 * Fullscreen Button Component
 * A button that triggers fullscreen mode for charts
 */
const FullscreenButton = ({ onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-xs sm:text-sm whitespace-nowrap ${className}`}
      aria-label="Open fullscreen"
      title="View in fullscreen"
    >
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"></path>
        </svg>
        <span className="hidden sm:inline">Fullscreen</span>
      </div>
    </button>
  );
};

export default FullscreenButton;

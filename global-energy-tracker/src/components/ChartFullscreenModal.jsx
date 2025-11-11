import { useEffect } from 'react';

/**
 * Fullscreen Modal Component for Charts
 * Displays chart content in a fullscreen overlay with all interactive controls
 */
const ChartFullscreenModal = ({ isOpen, onClose, title, description, children }) => {
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-2xl w-full h-full max-w-[98vw] max-h-[98vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[1010] p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors border border-gray-300"
          aria-label="Close fullscreen"
          title="Close fullscreen (Esc)"
        >
          <svg
            className="w-6 h-6 text-gray-700"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* Title and Description */}
          {(title || description) && (
            <div className="mb-6">
              {title && (
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm sm:text-base text-gray-600">
                  {description}
                </p>
              )}
            </div>
          )}

          {/* Chart Content */}
          <div className="w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartFullscreenModal;

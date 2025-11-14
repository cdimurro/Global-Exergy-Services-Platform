import { useState } from 'react';
import FeedbackModal from './FeedbackModal';

export default function Footer() {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <>
      <footer className="bg-[#1F2937] text-white mt-12 py-8 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center">
            <h3 className="text-xl sm:text-2xl font-bold mb-3">
              Global Exergy Services Platform
            </h3>
            <p className="text-sm sm:text-base text-white-100 mb-2">
              Measuring the true state of the energy transition through exergy-weighted energy services
            </p>
            <p className="text-xs sm:text-sm text-white-200 mt-4">
              Data sources: Our World in Data, IEA, EEI, RMI, BP Statistical Review
            </p>
          </div>

          {/* Feedback Button - Bottom Right */}
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="absolute bottom-6 right-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            aria-label="Submit Feedback"
          >
            Submit Feedback
          </button>
        </div>
      </footer>

      {/* Feedback Modal */}
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </>
  );
}

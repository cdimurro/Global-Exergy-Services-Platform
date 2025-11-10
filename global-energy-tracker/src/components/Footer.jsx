export default function Footer() {
  return (
    <footer className="bg-[#1e3a8a] text-white mt-12 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center">
          <h3 className="text-xl sm:text-2xl font-bold mb-3">
            Global Energy Services Tracker
          </h3>
          <p className="text-sm sm:text-base text-blue-100 mb-2">
            Measuring the true state of the energy transition through useful energy services
          </p>
          <p className="text-xs sm:text-sm text-blue-200 mt-4">
            Data sources: Our World in Data, IEA, BP Statistical Review
          </p>
        </div>
      </div>
    </footer>
  );
}

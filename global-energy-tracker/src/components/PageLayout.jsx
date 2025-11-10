export default function PageLayout({ children }) {
  return (
    <div className="py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}

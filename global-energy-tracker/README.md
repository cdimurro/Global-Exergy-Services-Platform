# Global Energy Services Tracker v1.2

**Live Site:** https://energy-services.vercel.app/

An interactive dashboard showing the **true picture of the global energy system** by tracking **useful energy services** rather than primary energy consumption.

## 🎯 Key Features

- **Accurate Data**: Validated against RMI, IEA, and expert analysis (v1.2 with corrected thermal accounting)
- **Real Numbers**: 229.56 EJ of useful energy services globally (2024)
- **Individual Sources**: All 10 energy sources tracked separately
- **Fossil Share**: Currently 81.4% fossil, 18.6% clean
- **Historical Trends**: Data from 1965-2024
- **Interactive Visualizations**: Explore energy flows and trends

## 📊 What is "Useful Energy"?

Most energy statistics show **primary energy** (raw resources). This dashboard shows **useful energy services** - the actual work that powers our lives:

- **Primary Energy**: ~600 EJ (all energy in raw form)
- **Losses**: ~370 EJ lost in conversion
- **Useful Energy**: ~230 EJ (actual services delivered)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run the data pipeline
cd data-pipeline
python fetch_data.py
python calculate_useful_energy.py
cd ..

# Start development server
npm run dev
```

## 📈 Key Metrics (2024)

- **Total**: 229.56 EJ
- **Fossil**: 186.84 EJ (81.4%)
  - Gas: 74.30 EJ | Oil: 59.72 EJ | Coal: 52.82 EJ
- **Clean**: 42.72 EJ (18.6%)
  - Biomass: 13.98 EJ | Hydro: 13.52 EJ | Wind: 6.74 EJ
  - Solar: 5.75 EJ | Nuclear: 2.49 EJ | Geothermal: 0.24 EJ

---

**Built with React + Vite | Data validated ✓ | Accuracy prioritized 🎯**

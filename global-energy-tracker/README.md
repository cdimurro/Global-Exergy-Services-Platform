# Global Energy Services Tracker

An interactive dashboard showing the **true picture of the global energy system** by tracking **useful energy services** rather than primary energy consumption.

## 🎯 Key Features

- **Accurate Data**: Validated against RMI, IEA, and expert analysis
- **Real Numbers**: 239 EJ of useful energy services globally (2024)
- **Individual Sources**: All 10 energy sources tracked separately
- **Fossil Share**: Currently 78% fossil, 22% clean
- **Historical Trends**: Data from 1965-2024
- **Interactive Visualizations**: Explore energy flows and trends

## 📊 What is "Useful Energy"?

Most energy statistics show **primary energy** (raw resources). This dashboard shows **useful energy services** - the actual work that powers our lives:

- **Primary Energy**: 620 EJ (all energy in raw form)
- **Losses**: ~380 EJ lost in conversion
- **Useful Energy**: 240 EJ (actual services delivered)

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

- **Total**: 239.37 EJ
- **Fossil**: 186.84 EJ (78.1%)
  - Gas: 74.30 EJ | Oil: 59.72 EJ | Coal: 52.82 EJ
- **Clean**: 52.53 EJ (21.9%)
  - Hydro: 14.32 EJ | Biomass: 13.98 EJ | Nuclear: 8.96 EJ
  - Wind: 8.09 EJ | Solar: 6.90 EJ | Geothermal: 0.29 EJ

---

**Built with React + Vite | Data validated ✓ | Accuracy prioritized 🎯**

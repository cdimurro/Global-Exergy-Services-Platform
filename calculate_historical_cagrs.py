"""
Calculate CAGRs from Historical Data (2015-2024)
Uses more recent period to capture policy-informed trends
"""

import json
import numpy as np

# Load historical data
with open('global-energy-tracker/public/data/useful_energy_timeseries.json', 'r') as f:
    historical = json.load(f)

# Extract 2015-2024 data (more recent period)
data_recent = [d for d in historical['data'] if 2015 <= d['year'] <= 2024]

print("=" * 80)
print("HISTORICAL CAGR CALCULATION (2015-2024)")
print("=" * 80)
print("Using 2015-2024 window for recency (captures recent policy trends)")
print()

# Calculate total useful energy CAGR
years = np.array([d['year'] for d in data_recent])
total_energy = np.array([d['total_useful_ej'] for d in data_recent])

# CAGR formula: (End/Start)^(1/years) - 1
total_cagr = (total_energy[-1] / total_energy[0]) ** (1 / (years[-1] - years[0])) - 1

print(f"Total Useful Energy CAGR: {total_cagr*100:+.3f}%/year")
print(f"  2010: {total_energy[0]:.2f} EJ")
print(f"  2024: {total_energy[-1]:.2f} EJ")
print(f"  Total growth: {((total_energy[-1]/total_energy[0])-1)*100:.1f}% over {years[-1]-years[0]} years")
print()

# Calculate fossil vs clean CAGRs
fossil_energy = np.array([d['fossil_useful_ej'] for d in data_recent])
clean_energy = np.array([d['clean_useful_ej'] for d in data_recent])

fossil_cagr = (fossil_energy[-1] / fossil_energy[0]) ** (1 / (years[-1] - years[0])) - 1
clean_cagr = (clean_energy[-1] / clean_energy[0]) ** (1 / (years[-1] - years[0])) - 1

print(f"Fossil Energy CAGR: {fossil_cagr*100:+.3f}%/year")
print(f"  2010: {fossil_energy[0]:.2f} EJ -> 2024: {fossil_energy[-1]:.2f} EJ")
print()

print(f"Clean Energy CAGR: {clean_cagr*100:+.3f}%/year")
print(f"  2010: {clean_energy[0]:.2f} EJ -> 2024: {clean_energy[-1]:.2f} EJ")
print()

# Calculate by source
print("By Energy Source:")
print("-" * 80)

sources = ['coal', 'oil', 'gas', 'nuclear', 'hydro', 'wind', 'solar', 'biomass', 'geothermal']
source_cagrs = {}

for source in sources:
    try:
        source_data = np.array([d['sources_useful_ej'].get(source, 0) for d in data_recent])

        if source_data[0] > 0.1:  # Only calculate if meaningful base
            cagr = (source_data[-1] / source_data[0]) ** (1 / (years[-1] - years[0])) - 1
            source_cagrs[source] = cagr
            print(f"  {source:12s}: {cagr*100:+7.3f}%/year  ({source_data[0]:6.2f} EJ -> {source_data[-1]:6.2f} EJ)")
        else:
            # For very small bases (like early solar), use linear growth
            avg_growth = (source_data[-1] - source_data[0]) / (years[-1] - years[0])
            source_cagrs[source] = avg_growth / max(source_data[0], 0.1)  # Estimate
            print(f"  {source:12s}: {source_cagrs[source]*100:+7.3f}%/year  ({source_data[0]:6.2f} EJ -> {source_data[-1]:6.2f} EJ) [linear]")
    except Exception as e:
        print(f"  {source:12s}: Error - {e}")
        source_cagrs[source] = 0.0

print()
print("=" * 80)
print("SIMPLE EXTRAPOLATION FORECAST (2025-2050)")
print("=" * 80)
print()

# Project forward using calculated CAGRs
print("Using CAGR extrapolation:")
print(f"  Total: {total_cagr*100:.3f}%/year")
print(f"  Fossil: {fossil_cagr*100:.3f}%/year")
print(f"  Clean: {clean_cagr*100:.3f}%/year")
print()

# Project key years
for year in [2025, 2030, 2040, 2050]:
    years_ahead = year - 2024

    total_proj = total_energy[-1] * ((1 + total_cagr) ** years_ahead)
    fossil_proj = fossil_energy[-1] * ((1 + fossil_cagr) ** years_ahead)
    clean_proj = clean_energy[-1] * ((1 + clean_cagr) ** years_ahead)

    print(f"{year}: {total_proj:6.2f} EJ total ({fossil_proj:6.2f} fossil, {clean_proj:6.2f} clean)")
    print(f"       Fossil share: {fossil_proj/total_proj*100:.1f}%")

print()
print("Note: These are simple CAGR extrapolations. Will be smoothed with")
print("      aggregate constraints in demand_growth_model.py")
print()

# Save CAGRs for model
cagrs_output = {
    'total': total_cagr,
    'fossil': fossil_cagr,
    'clean': clean_cagr,
    'sources': source_cagrs,
    'calculation_period': '2015-2024',
    'method': 'Compound Annual Growth Rate from recent historical data (captures policy trends)'
}

with open('calculated_cagrs.json', 'w') as f:
    json.dump(cagrs_output, f, indent=2)

print("Saved CAGRs to: calculated_cagrs.json")

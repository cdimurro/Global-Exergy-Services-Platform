import json

with open('public/data/useful_energy_timeseries.json', 'r') as f:
    data = json.load(f)

years = [2020, 2021, 2022, 2023, 2024]
values = []

for year in years:
    d = next(d for d in data['data'] if d['year'] == year)
    values.append(d['total_useful_ej'])

print("Historical growth 2020-2024:")
for i in range(1, len(years)):
    growth = values[i] - values[i-1]
    pct = growth / values[i-1] * 100
    print(f"{years[i-1]}-{years[i]}: {values[i-1]:.2f} -> {values[i]:.2f} (+{growth:.2f} EJ, +{pct:.1f}%)")

# Calculate average growth
avg_growth = sum([values[i] - values[i-1] for i in range(1, len(values))]) / (len(values) - 1)
avg_pct = avg_growth / values[0] * 100

print(f"\nAverage annual growth: +{avg_growth:.2f} EJ ({avg_pct:.1f}%)")

# What should 2025 be?
projected_2025 = values[-1] + avg_growth
print(f"Projected 2025 (continuing trend): {projected_2025:.2f} EJ")

# What is current projection?
with open('public/data/demand_growth_projections.json', 'r') as f:
    proj_data = json.load(f)

baseline = next(s for s in proj_data['scenarios'] if s['name'] == 'Baseline (STEPS)')
d2025 = next(d for d in baseline['data'] if d['year'] == 2025)

print(f"Current model 2025: {d2025['total_useful_ej']:.2f} EJ")
print(f"Difference: {d2025['total_useful_ej'] - projected_2025:.2f} EJ")

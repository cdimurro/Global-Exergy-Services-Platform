import json

with open('public/data/demand_growth_projections.json', 'r') as f:
    data = json.load(f)

baseline = next(s for s in data['scenarios'] if s['name'] == 'Baseline (STEPS)')

print("Baseline Scenario - 2024-2030 Transition:")
print("=" * 70)
print("2024 (historical): 229.56 EJ (fossil: 186.84, clean: 42.72)")
print()

prev_total = 229.56
for year in [2025, 2026, 2027, 2028, 2029, 2030]:
    d = next(d for d in baseline['data'] if d['year'] == year)
    total = d['total_useful_ej']
    fossil = d['fossil_useful_ej']
    clean = d['clean_useful_ej']
    growth = total - prev_total
    print(f"{year}: {total:.2f} EJ (fossil: {fossil:.2f}, clean: {clean:.2f}) | Growth: +{growth:.2f} EJ")
    prev_total = total

"""
Validate smoothness of v3.1 projections
"""
import json

# Load projections
with open('global-energy-tracker/public/data/demand_growth_projections.json', 'r') as f:
    data = json.load(f)

projections = data['scenarios'][0]['data']

print("=" * 80)
print("SMOOTHNESS VALIDATION - v3.1 Projections")
print("=" * 80)
print()

print("Year-over-Year Changes (2025-2050):")
print("-" * 80)
print(f"{'Year':<6} {'Total (EJ)':<12} {'Fossil (EJ)':<12} {'Clean (EJ)':<12} {'YoY Delta':<12} {'YoY %'}")
print("-" * 80)

prev = None
max_jump = 0
max_jump_year = None

for p in projections:
    year = p['year']
    total = p['total_useful_ej']
    fossil = p['fossil_useful_ej']
    clean = p['clean_useful_ej']

    if prev:
        delta = total - prev['total_useful_ej']
        pct = ((total / prev['total_useful_ej']) - 1) * 100

        # Track max jump
        if abs(pct) > max_jump:
            max_jump = abs(pct)
            max_jump_year = f"{prev['year']}->{year}"

        print(f"{year:<6} {total:<12.2f} {fossil:<12.2f} {clean:<12.2f} {delta:<12.2f} {pct:+.2f}%")
    else:
        print(f"{year:<6} {total:<12.2f} {fossil:<12.2f} {clean:<12.2f} {'(baseline)':<12} {'-'}")

    prev = p

print()
print("=" * 80)
print(f"Maximum year-over-year change: {max_jump:.2f}% ({max_jump_year})")
print()

# Check for any discontinuities (>2% jumps)
discontinuities = []
prev = None
for p in projections:
    if prev:
        pct_change = abs(((p['total_useful_ej'] / prev['total_useful_ej']) - 1) * 100)
        if pct_change > 2.0:
            discontinuities.append((prev['year'], p['year'], pct_change))
    prev = p

if discontinuities:
    print("WARNING: Discontinuities detected (>2% YoY jumps):")
    for y1, y2, pct in discontinuities:
        print(f"  {y1}->{y2}: {pct:.2f}%")
else:
    print("VALIDATION PASSED: No discontinuities detected (all changes <2%)")

print()
print("=" * 80)
print("Fossil Decline Smoothness Check:")
print("-" * 80)

prev = None
for p in projections[:15]:  # First 15 years
    year = p['year']
    fossil = p['fossil_useful_ej']

    if prev:
        delta = fossil - prev
        pct = ((fossil / prev) - 1) * 100
        print(f"{year}: {fossil:.2f} EJ | Change: {delta:+.2f} EJ ({pct:+.2f}%)")
    else:
        print(f"{year}: {fossil:.2f} EJ (baseline)")

    prev = fossil

print()
print("=" * 80)

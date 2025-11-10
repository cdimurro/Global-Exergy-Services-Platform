"""
Test script to validate projection calibration against IEA targets
"""

# Starting point 2024
fossil_2024 = 186.84
clean_2024 = 52.53
total_2024 = fossil_2024 + clean_2024
clean_growth_2024 = 2.99

print("=" * 80)
print("PROJECTION CALIBRATION TEST")
print("=" * 80)
print(f"\nStarting Point (2024):")
print(f"  Fossil: {fossil_2024:.2f} EJ")
print(f"  Clean: {clean_2024:.2f} EJ")
print(f"  Total: {total_2024:.2f} EJ")
print(f"  Clean Growth Rate: {clean_growth_2024:.2f} EJ/yr")

scenarios = {
    'conservative': {
        'name': 'Slow Transition (IEA STEPS)',
        'cleanGrowthAcceleration': 0.006,  # 0.6%/year after 3-year ramp-up - very slow growth
        'fossilBaselineGrowth': 0.022,     # Fossil would grow 2.2%/year without clean competition (IEA GER 2025 actuals)
        'fossilDeclineRate': 0.00003,      # Fossil baseline growth declines by 0.003%/year (very gradual Asia lock-in)
        'displacementMultiplier': 0.43,    # 43% displacement multiplier (supply constraints, infrastructure inertia)
        'energyIntensityImprovement': 0.019,  # 1.9%/year energy intensity reduction (higher to cap total, trade-off with peak)
        'target_2040_fossil': 180,
        'useConservativeBaseCurve': True   # Use 40%-80% base efficiency instead of 70%-95%
    },
    'moderate': {
        'name': 'Moderate Acceleration',
        'cleanGrowthAcceleration': 0.055,  # 5.5%/year after 3-year ramp-up
        'fossilBaselineGrowth': 0.020,     # Fossil would grow 2.0%/year without clean competition
        'fossilDeclineRate': 0.0009,       # Fossil baseline growth declines by 0.09%/year
        'displacementMultiplier': 1.15,    # 15% more effective displacement
        'energyIntensityImprovement': 0.012,  # 1.2%/year uniform energy intensity reduction
        'target_2040_fossil': 117
    },
    'aggressive': {
        'name': 'Rapid Transition (IEA NZE)',
        'cleanGrowthAcceleration': 0.082,  # 8.2%/year after 3-year ramp-up (ambitious deployment)
        'fossilBaselineGrowth': 0.018,     # Fossil would grow 1.8%/year without clean competition
        'fossilDeclineRate': 0.0022,       # Fossil baseline growth declines by 0.22%/year (strong policy pressure)
        'displacementMultiplier': 1.85,    # 85% more effective displacement (policy + tech breakthroughs)
        'energyIntensityImprovement': 0.015,  # 1.5%/year energy intensity reduction (capped per Grok)
        'fossilFloor': 20,                 # 20 EJ minimum residual (CCS/biofuels/hard-to-abate sectors per IEA NZE)
        'target_2040_fossil': 20
    }
}

for scenario_key, scenario in scenarios.items():
    print("\n" + "=" * 80)
    print(f"{scenario['name']}")
    print("=" * 80)

    fossil = fossil_2024
    clean = clean_2024
    total = total_2024
    clean_growth_rate = clean_growth_2024
    fossil_baseline_growth = scenario['fossilBaselineGrowth']

    # Track for peak detection
    yearly_data = []
    peak_year = None

    # Calculate for 16 years (2024-2040)
    for year in range(1, 17):
        current_year = 2024 + year

        # Apply ramp-up: acceleration increases gradually over first 3 years
        ramp_up_years = 3
        ramp_up_factor = min(year / ramp_up_years, 1.0)  # 0.33, 0.67, 1.0, 1.0...
        effective_acceleration = scenario['cleanGrowthAcceleration'] * ramp_up_factor

        # Clean energy growth accelerates
        clean_growth_rate *= (1 + effective_acceleration)

        # ENERGY EFFICIENCY LAYER
        # Energy intensity improvements reduce the amount of energy services needed
        # This affects baseline demand growth for BOTH fossil and clean

        # NEW MODEL: Fossil has baseline growth that declines over time and gets displaced by clean
        # 1. Fossil baseline growth declines gradually (reflecting market forces, policy pressure)
        fossil_baseline_growth -= scenario['fossilDeclineRate']
        fossil_baseline_growth = max(fossil_baseline_growth, -0.05)  # Floor at -5%/year

        # 2. Apply efficiency improvements to reduce fossil baseline growth
        # Efficiency makes economy need less energy for same output
        efficiency_adjusted_fossil_growth = fossil_baseline_growth - scenario['energyIntensityImprovement']
        fossil_baseline = fossil * (1 + efficiency_adjusted_fossil_growth)

        # 3. Clean growth displaces fossil from its baseline
        # Displacement efficiency increases over time as clean becomes more competitive
        # Conservative scenario uses delayed ramp-up to allow fossil to grow longer
        if scenario.get('useConservativeBaseCurve', False):
            # Conservative: Start at 40%, ramp slowly to 80% (delayed peak ~2032)
            base_displacement_efficiency = 0.40 + (year / 16) * 0.40
        else:
            # Other scenarios: Start at 70%, ramp to 95% (earlier peaks)
            base_displacement_efficiency = 0.70 + (year / 16) * 0.25
        displacement_efficiency = base_displacement_efficiency * scenario.get('displacementMultiplier', 1.0)
        displacement = clean_growth_rate * displacement_efficiency

        # 4. Actual fossil = baseline - displacement
        fossil_prev = fossil
        fossil = fossil_baseline - displacement
        # Apply fossil floor for scenarios with residual fossil (CCS/biofuels/hard-to-abate)
        fossil_floor = scenario.get('fossilFloor', 0)
        fossil = max(fossil, fossil_floor)

        # 5. Update clean (also affected by efficiency on demand side)
        # Efficiency reduces total demand, which caps how much clean can grow
        clean_growth_with_efficiency = clean_growth_rate * (1 - scenario['energyIntensityImprovement'] * 0.3)
        clean += clean_growth_with_efficiency

        # 6. Total is the sum
        total = fossil + clean

        # Track yearly data
        yearly_data.append({
            'year': current_year,
            'fossil': fossil,
            'clean': clean,
            'total': total,
            'fossil_change': fossil - fossil_prev if year > 1 else None
        })

        # Print key years
        if current_year in [2025, 2030, 2035, 2040]:
            fossil_share = (fossil / total) * 100
            clean_share = (clean / total) * 100
            fossil_change = fossil - fossil_prev if year > 1 else fossil - fossil_2024
            print(f"\n{current_year}:")
            print(f"  Fossil: {fossil:.1f} EJ ({fossil_share:.1f}%) [{fossil_change:+.2f} EJ/yr]")
            print(f"  Clean: {clean:.1f} EJ ({clean_share:.1f}%)")
            print(f"  Total: {total:.1f} EJ")
            print(f"  Clean Growth Rate: {clean_growth_rate:.2f} EJ/yr")

    # Detect peak year (first year of 3-consecutive-year decline)
    # Peak occurs when fossil consumption starts declining for 3+ consecutive years
    for i in range(len(yearly_data) - 2):
        # Check if current year and next 2 years all show decline
        year1_decline = i > 0 and yearly_data[i]['fossil'] < yearly_data[i-1]['fossil']
        year2_decline = yearly_data[i+1]['fossil'] < yearly_data[i]['fossil']
        year3_decline = yearly_data[i+2]['fossil'] < yearly_data[i+1]['fossil']

        if year1_decline and year2_decline and year3_decline:
            peak_year = yearly_data[i]['year']
            break

    if peak_year:
        print(f"\nPEAK DETECTED: {peak_year}")
        print(f"  Fossil consumption begins sustained decline after {peak_year}")
    else:
        print(f"\nNO PEAK: Fossil still growing or not yet 3 consecutive declining years")

    # Check against target
    print(f"\n2040 TARGET CHECK:")
    print(f"  Target: {scenario['target_2040_fossil']} EJ fossil")
    print(f"  Actual: {fossil:.1f} EJ fossil")
    diff = fossil - scenario['target_2040_fossil']
    diff_pct = (diff / scenario['target_2040_fossil']) * 100
    print(f"  Difference: {diff:+.1f} EJ ({diff_pct:+.1f}%)")

    # Calculate total primary energy equivalent for validation
    total_primary_2040 = total / 0.37
    print(f"\n  Total Primary Energy Equivalent: {total_primary_2040:.0f} EJ")
    if scenario_key == 'conservative':
        print(f"  IEA STEPS 2040 Primary: ~691 EJ")

print("\n" + "=" * 80)

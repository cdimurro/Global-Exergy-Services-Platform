"""
Validation Script for Useful Energy Calculations
Cross-checks our calculations against known benchmarks and analyzes the conversion chain
"""

import json
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def load_our_results():
    """Load our calculated results"""
    filepath = os.path.join('../public/data', 'useful_energy_timeseries.json')
    if not os.path.exists(filepath):
        print("✗ Results file not found")
        return None

    with open(filepath, 'r') as f:
        return json.load(f)

def analyze_2023_data():
    """
    Analyze 2023 data (latest complete year) against benchmarks

    Benchmarks:
    - IEA 2023: Primary energy ~600 EJ
    - RMI analysis: Useful energy ~227 EJ (2019), scaled to ~235 EJ (2024)
    - Overall system efficiency: ~33-38%
    - Fossil share of useful: ~82% (Grok) or ~65% (ChatGPT/RMI)
    """

    results = load_our_results()
    if not results:
        return

    # Find 2023 data
    data_2023 = None
    for record in results['data']:
        if record['year'] == 2023:
            data_2023 = record
            break

    if not data_2023:
        print("✗ 2023 data not found")
        return

    print("="*70)
    print("VALIDATION ANALYSIS - 2023 DATA")
    print("="*70)

    # Our calculations
    our_useful = data_2023['total_useful_ej']
    our_final = data_2023['total_final_ej']
    our_efficiency = data_2023['overall_efficiency']
    our_fossil_share = data_2023['fossil_share_percent']

    print(f"\n📊 OUR CALCULATIONS:")
    print(f"   Total Final Energy:  {our_final:.1f} EJ")
    print(f"   Total Useful Energy: {our_useful:.1f} EJ")
    print(f"   Overall Efficiency:  {our_efficiency:.1f}%")
    print(f"   Fossil Share:        {our_fossil_share:.1f}%")

    # Expected benchmarks
    print(f"\n📚 KNOWN BENCHMARKS:")
    print(f"   IEA Primary Energy (2023):     ~600 EJ")
    print(f"   RMI Useful Energy (est 2023):  ~230-240 EJ")
    print(f"   Expected System Efficiency:    33-38%")
    print(f"   Fossil Share (Grok):           ~82%")
    print(f"   Fossil Share (ChatGPT/RMI):    ~65%")

    # Analysis
    print(f"\n🔍 DISCREPANCY ANALYSIS:")

    # Check 1: Useful energy too high?
    expected_useful = 235  # RMI estimate for ~2023
    useful_diff = our_useful - expected_useful
    useful_diff_pct = (useful_diff / expected_useful) * 100

    print(f"\n   1. Useful Energy:")
    print(f"      Our value:     {our_useful:.1f} EJ")
    print(f"      Expected:      ~{expected_useful} EJ")
    print(f"      Difference:    {useful_diff:+.1f} EJ ({useful_diff_pct:+.1f}%)")

    if abs(useful_diff_pct) > 15:
        print(f"      ⚠️  SIGNIFICANT DEVIATION")

    # Check 2: What should primary energy be?
    # If system efficiency is ~35%, primary = useful / 0.35
    implied_primary_35 = our_useful / 0.35
    implied_primary_33 = our_useful / 0.33

    print(f"\n   2. Implied Primary Energy:")
    print(f"      At 35% efficiency: {implied_primary_35:.1f} EJ")
    print(f"      At 33% efficiency: {implied_primary_33:.1f} EJ")
    print(f"      IEA reported:      ~600 EJ")

    if implied_primary_35 < 550 or implied_primary_35 > 650:
        print(f"      ⚠️  Outside expected range (550-650 EJ)")

    # Check 3: Fossil share
    print(f"\n   3. Fossil Share:")
    print(f"      Our value:     {our_fossil_share:.1f}%")
    print(f"      Expected:      65-82%")

    if our_fossil_share < 65 or our_fossil_share > 82:
        print(f"      ⚠️  Outside expected range")

    # Check 4: Examine efficiency factors
    print(f"\n   4. Source-by-Source Check:")
    print(f"      {'Source':<12} {'Final (EJ)':<12} {'Useful (EJ)':<12} {'Implied Eff':<12}")
    print(f"      {'-'*50}")

    sources = data_2023['sources_useful_ej']
    # Need to recalculate final energy by source
    # Load efficiency factors
    with open('efficiency_factors.json', 'r') as f:
        eff_factors = json.load(f)

    weighted_avg = eff_factors['weighted_averages']

    for source, useful_ej in sorted(sources.items(), key=lambda x: x[1], reverse=True):
        if useful_ej > 0:
            factor = weighted_avg.get(source, 0.5)
            implied_final = useful_ej / factor if factor > 0 else 0
            print(f"      {source:<12} {implied_final:>10.1f}   {useful_ej:>10.1f}   {factor*100:>10.1f}%")

    print("\n" + "="*70)

    # Diagnosis
    print(f"\n💡 DIAGNOSIS:")

    if useful_diff_pct > 20:
        print(f"\n   Our useful energy is {useful_diff_pct:.0f}% TOO HIGH.")
        print(f"   Possible causes:")
        print(f"   • Efficiency factors are too optimistic")
        print(f"   • OWID 'consumption' data may not equal primary energy")
        print(f"   • We may be missing major conversion losses")
        print(f"   • Need to account for T&D losses in electricity")

    if our_fossil_share < 70:
        print(f"\n   Fossil share is TOO LOW ({our_fossil_share:.1f}%).")
        print(f"   Possible causes:")
        print(f"   • Renewable efficiency factors may be too high")
        print(f"   • Not accounting for fossil-fueled electricity properly")

    print("\n" + "="*70)

def check_owid_vs_iea():
    """
    Check if OWID primary energy matches IEA
    """
    print("\n" + "="*70)
    print("OWID vs IEA PRIMARY ENERGY CHECK")
    print("="*70)

    # Load OWID data
    filepath = os.path.join('downloads', 'owid_energy_latest.json')
    with open(filepath, 'r') as f:
        data = json.load(f)

    if 'World' not in data:
        print("✗ World data not found")
        return

    # Find 2023
    for record in data['World']['data']:
        if record.get('year') == '2023':
            primary = float(record.get('primary_energy_consumption', 0) or 0)
            print(f"\n   OWID Primary Energy (2023): {primary * 0.0036:.1f} EJ")
            print(f"   IEA Primary Energy (2023):  ~600 EJ")
            print(f"   Difference: {(primary * 0.0036 - 600):+.1f} EJ")
            break

    print("="*70)

def main():
    print("="*70)
    print("USEFUL ENERGY CALCULATION VALIDATOR")
    print("="*70)

    analyze_2023_data()
    check_owid_vs_iea()

    print("\n✓ Validation complete")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Calculate FF_growth and related metrics

FF_growth = (ΔFossil_useful) / (ΔTotal_useful) × 100%

This shows what percentage of NEW energy services are coming from fossil fuels.
"""

import json
import sys
import os

# Windows encoding fix
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def calculate_ff_growth(data_path):
    """
    Calculate FF_growth for each year
    """
    print("=" * 60)
    print("FF_GROWTH CALCULATOR")
    print("=" * 60)
    print()

    # Load the useful energy data
    print("Loading useful energy data...")
    with open(data_path, 'r', encoding='utf-8') as f:
        energy_data = json.load(f)

    timeseries = energy_data['data']
    print(f"✓ Loaded {len(timeseries)} years of data")
    print()

    # Calculate year-over-year changes
    results = []
    for i in range(1, len(timeseries)):
        prev_year = timeseries[i - 1]
        curr_year = timeseries[i]

        # Calculate changes
        delta_fossil = curr_year['fossil_useful_ej'] - prev_year['fossil_useful_ej']
        delta_clean = curr_year['clean_useful_ej'] - prev_year['clean_useful_ej']
        delta_total = curr_year['total_useful_ej'] - prev_year['total_useful_ej']

        # Calculate FF_growth
        # If total is growing, what % is coming from fossil?
        if delta_total > 0:
            ff_growth_pct = (delta_fossil / delta_total) * 100
        elif delta_total < 0:
            # If total is shrinking, we still calculate the ratio
            ff_growth_pct = (delta_fossil / delta_total) * 100
        else:
            # No change
            ff_growth_pct = 0

        # Calculate net change (simplified version without displacement data)
        # For now, we'll just track FF_growth
        # Later we'll add displacement rate: net_change = ff_growth + displacement_rate

        results.append({
            'year': curr_year['year'],
            'delta_total_ej': round(delta_total, 2),
            'delta_fossil_ej': round(delta_fossil, 2),
            'delta_clean_ej': round(delta_clean, 2),
            'ff_growth_pct': round(ff_growth_pct, 1),
            'clean_growth_pct': round(100 - ff_growth_pct, 1) if delta_total > 0 else 0,
        })

    # Calculate rolling averages (5-year)
    for i in range(len(results)):
        start_idx = max(0, i - 4)
        window = results[start_idx:i + 1]

        avg_ff_growth = sum(r['ff_growth_pct'] for r in window) / len(window)
        results[i]['ff_growth_5yr_avg'] = round(avg_ff_growth, 1)

    # Save results
    output_path = os.path.join(os.path.dirname(data_path), 'ff_growth_timeseries.json')

    output_data = {
        'metadata': {
            'description': 'FF_growth and related metrics over time',
            'formula': 'FF_growth = (ΔFossil_useful) / (ΔTotal_useful) × 100%',
            'generated_at': energy_data['metadata']['generated_at'],
        },
        'data': results
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"✓ Saved results to: {output_path}")
    print()

    # Print summary
    print("=" * 60)
    print("FF_GROWTH SUMMARY")
    print("=" * 60)
    print()

    # Recent years (last 10)
    recent = results[-10:]
    print("Recent FF_growth (last 10 years):")
    print(f"{'Year':<8} {'ΔTotal':>10} {'ΔFossil':>10} {'ΔClean':>10} {'FF_growth':>12}")
    print("-" * 60)
    for r in recent:
        print(f"{r['year']:<8} {r['delta_total_ej']:>9.1f} EJ {r['delta_fossil_ej']:>9.1f} EJ {r['delta_clean_ej']:>9.1f} EJ {r['ff_growth_pct']:>10.1f}%")

    print()
    print(f"Latest year ({results[-1]['year']}):")
    print(f"  Total energy growth: {results[-1]['delta_total_ej']:+.2f} EJ")
    print(f"  Fossil contribution: {results[-1]['delta_fossil_ej']:+.2f} EJ ({results[-1]['ff_growth_pct']:.1f}%)")
    print(f"  Clean contribution: {results[-1]['delta_clean_ej']:+.2f} EJ ({results[-1]['clean_growth_pct']:.1f}%)")
    print()

    # 5-year average
    avg_5yr = results[-1]['ff_growth_5yr_avg']
    print(f"5-year average FF_growth: {avg_5yr:.1f}%")
    print()

    # Historical average
    avg_all = sum(r['ff_growth_pct'] for r in results) / len(results)
    print(f"Historical average FF_growth (1966-2024): {avg_all:.1f}%")
    print()

    print("=" * 60)
    print("✓ FF_growth calculation complete!")
    print("=" * 60)

    return output_data

if __name__ == '__main__':
    # Path to the useful energy data
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(script_dir, '..', 'public', 'data', 'useful_energy_timeseries.json')

    calculate_ff_growth(data_path)

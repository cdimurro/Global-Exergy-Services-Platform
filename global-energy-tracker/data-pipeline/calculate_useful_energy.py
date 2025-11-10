"""
Useful Energy Calculator
Converts final energy consumption to useful energy by applying efficiency factors
"""

import json
import os
import sys
from datetime import datetime

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def load_efficiency_factors():
    """Load efficiency factors from JSON file"""
    # Use corrected efficiency factors that account for full system losses
    with open('efficiency_factors_corrected.json', 'r') as f:
        return json.load(f)

def load_owid_data():
    """Load Our World in Data energy dataset"""
    filepath = os.path.join('downloads', 'owid_energy_latest.json')
    if not os.path.exists(filepath):
        print(f"✗ Data file not found: {filepath}")
        print("  Run fetch_data.py first to download the data.")
        return None

    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def calculate_useful_energy_for_source(final_energy_ej, source, efficiency_factors):
    """
    Calculate useful energy for a specific source
    Uses system-wide efficiency factor from primary to useful
    """
    system_eff = efficiency_factors['system_wide_efficiency']

    # Map sources to efficiency factors
    factor = system_eff.get(source, 0.35)  # Default to 35% if unknown

    useful_energy = final_energy_ej * factor
    return useful_energy

def safe_float(value):
    """Safely convert string to float"""
    if value is None or value == '':
        return 0.0
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0

def process_global_data(data, efficiency_factors):
    """
    Process global ('World') data to calculate useful energy by source
    """
    if 'World' not in data:
        print("✗ Global data not found in dataset")
        return None

    world_data = data['World']['data']

    # Process each year
    results = []

    for record in world_data:
        year_str = record.get('year')
        if not year_str:
            continue

        try:
            year = int(year_str)
        except (ValueError, TypeError):
            continue

        if year < 1965:  # Start from 1965 for consistency
            continue

        # Extract energy consumption by source (in TWh, need to convert to EJ)
        # 1 TWh = 0.0036 EJ

        TWH_TO_EJ = 0.0036

        # Get final energy by source from OWID data
        # For fossil fuels: use consumption (= primary energy)
        oil_twh = safe_float(record.get('oil_consumption'))
        gas_twh = safe_float(record.get('gas_consumption'))
        coal_twh = safe_float(record.get('coal_consumption'))

        # For renewables that generate electricity: use ELECTRICITY output, not inflated 'consumption'
        # OWID inflates renewable 'consumption' using substitution method - we want actual electricity
        nuclear_twh = safe_float(record.get('nuclear_electricity'))  # Changed from consumption
        hydro_twh = safe_float(record.get('hydro_electricity'))      # Changed from consumption
        wind_twh = safe_float(record.get('wind_electricity'))        # Changed from consumption
        solar_twh = safe_float(record.get('solar_electricity'))      # Changed from consumption
        geothermal_twh = safe_float(record.get('other_renewable_exc_biofuel_electricity'))

        # For biomass: need to estimate total (traditional + modern)
        # OWID only shows modern biofuels, traditional biomass is missing
        biofuel_modern_twh = safe_float(record.get('biofuel_consumption'))
        # Estimate traditional biomass at ~45 EJ based on IEA data
        traditional_biomass_ej = 45.0
        biomass_twh = biofuel_modern_twh + (traditional_biomass_ej / TWH_TO_EJ)

        # Convert to EJ
        sources_final_ej = {
            'oil': oil_twh * TWH_TO_EJ,
            'gas': gas_twh * TWH_TO_EJ,
            'coal': coal_twh * TWH_TO_EJ,
            'nuclear': nuclear_twh * TWH_TO_EJ,
            'hydro': hydro_twh * TWH_TO_EJ,
            'wind': wind_twh * TWH_TO_EJ,
            'solar': solar_twh * TWH_TO_EJ,
            'biomass': biomass_twh * TWH_TO_EJ,
            'geothermal': geothermal_twh * TWH_TO_EJ,
            'other': 0,  # Geothermal now tracked separately
        }

        # Calculate useful energy for each source
        sources_useful_ej = {}
        for source, final_ej in sources_final_ej.items():
            if final_ej > 0:
                useful_ej = calculate_useful_energy_for_source(
                    final_ej, source, efficiency_factors
                )
                sources_useful_ej[source] = round(useful_ej, 3)
            else:
                sources_useful_ej[source] = 0

        # Calculate totals
        total_final_ej = sum(sources_final_ej.values())
        total_useful_ej = sum(sources_useful_ej.values())

        # Calculate fossil vs clean
        fossil_useful_ej = sum(sources_useful_ej[s] for s in ['oil', 'gas', 'coal'])
        clean_useful_ej = total_useful_ej - fossil_useful_ej

        # Calculate shares
        fossil_share = (fossil_useful_ej / total_useful_ej * 100) if total_useful_ej > 0 else 0
        clean_share = 100 - fossil_share

        results.append({
            'year': year,
            'total_final_ej': round(total_final_ej, 2),
            'total_useful_ej': round(total_useful_ej, 2),
            'overall_efficiency': round((total_useful_ej / total_final_ej * 100) if total_final_ej > 0 else 0, 1),
            'sources_useful_ej': sources_useful_ej,
            'fossil_useful_ej': round(fossil_useful_ej, 2),
            'clean_useful_ej': round(clean_useful_ej, 2),
            'fossil_share_percent': round(fossil_share, 1),
            'clean_share_percent': round(clean_share, 1),
        })

    return results

def save_results(results, output_filename='useful_energy_timeseries.json'):
    """Save processed results to JSON file"""
    output_dir = '../public/data'
    os.makedirs(output_dir, exist_ok=True)

    output_path = os.path.join(output_dir, output_filename)

    output_data = {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'description': 'Global useful energy services by source (Exajoules)',
            'sources': [
                'Our World in Data Energy Dataset',
                'IEA Energy Efficiency Indicators (efficiency factors)'
            ],
            'unit': 'Exajoules (EJ)'
        },
        'data': results
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2)

    print(f"✓ Saved results to: {output_path}")
    return output_path

def print_summary(results):
    """Print summary of calculated useful energy"""
    if not results:
        return

    latest = results[-1]
    earliest = results[0]

    print("\n" + "="*60)
    print("USEFUL ENERGY CALCULATION SUMMARY")
    print("="*60)
    print(f"\nLatest Year: {latest['year']}")
    print(f"Total Useful Energy: {latest['total_useful_ej']} EJ")
    print(f"  Fossil: {latest['fossil_useful_ej']} EJ ({latest['fossil_share_percent']}%)")
    print(f"  Clean: {latest['clean_useful_ej']} EJ ({latest['clean_share_percent']}%)")
    print(f"\nBreakdown by Source ({latest['year']}):")
    for source, value in sorted(latest['sources_useful_ej'].items(), key=lambda x: x[1], reverse=True):
        share = (value / latest['total_useful_ej'] * 100) if latest['total_useful_ej'] > 0 else 0
        if value > 0:
            print(f"  {source.capitalize():15} {value:8.2f} EJ ({share:5.2f}%)")

    print(f"\nGrowth since {earliest['year']}:")
    total_growth = ((latest['total_useful_ej'] / earliest['total_useful_ej']) - 1) * 100 if earliest['total_useful_ej'] > 0 else 0
    print(f"  Total: +{total_growth:.1f}%")

    print("="*60 + "\n")

def main():
    """Main execution function"""
    print("="*60)
    print("USEFUL ENERGY CALCULATOR")
    print("="*60 + "\n")

    # Load data
    print("Loading efficiency factors...")
    efficiency_factors = load_efficiency_factors()
    print("✓ Efficiency factors loaded")

    print("\nLoading OWID energy data...")
    owid_data = load_owid_data()
    if not owid_data:
        return

    print("✓ OWID data loaded")

    # Calculate useful energy
    print("\nCalculating useful energy...")
    results = process_global_data(owid_data, efficiency_factors)

    if not results:
        print("✗ Calculation failed")
        return

    print(f"✓ Processed {len(results)} years of data")

    # Save results
    save_results(results)

    # Print summary
    print_summary(results)

    print("✓ Useful energy calculation complete!")

if __name__ == "__main__":
    main()

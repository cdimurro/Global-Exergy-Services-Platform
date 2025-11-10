"""
CORRECTED Useful Energy Calculator
Properly handles renewable energy accounting and biomass
"""

import json
import os
import sys
from datetime import datetime

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def safe_float(value):
    """Safely convert string to float"""
    if value is None or value == '':
        return 0.0
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0

def load_owid_data():
    """Load Our World in Data energy dataset"""
    filepath = os.path.join('downloads', 'owid_energy_latest.json')
    if not os.path.exists(filepath):
        print(f"✗ Data file not found: {filepath}")
        return None
    with open(filepath, 'r') as f:
        return json.load(f)

def calculate_useful_energy_2023():
    """
    Calculate useful energy with proper accounting
    Based on Grok feedback and renewable accounting fix
    """

    data = load_owid_data()
    if not data or 'World' not in data:
        return None

    TWH_TO_EJ = 0.0036

    for record in data['World']['data']:
        if record.get('year') != '2023':
            continue

        print("="*70)
        print("CORRECTED USEFUL ENERGY CALCULATION - 2023")
        print("="*70)

        # --- FOSSIL FUELS ---
        # Use consumption data, apply system efficiency
        oil_primary_ej = safe_float(record.get('oil_consumption')) * TWH_TO_EJ
        gas_primary_ej = safe_float(record.get('gas_consumption')) * TWH_TO_EJ
        coal_primary_ej = safe_float(record.get('coal_consumption')) * TWH_TO_EJ

        # Efficiencies from corrected model
        oil_useful = oil_primary_ej * 0.25   # Transport ~20-25%
        gas_useful = gas_primary_ej * 0.35   # Mixed power + heating
        coal_useful = coal_primary_ej * 0.30  # Mostly power generation

        print(f"\n--- FOSSIL FUELS ---")
        print(f"Oil:  {oil_primary_ej:.1f} EJ primary → {oil_useful:.1f} EJ useful (25%)")
        print(f"Gas:  {gas_primary_ej:.1f} EJ primary → {gas_useful:.1f} EJ useful (35%)")
        print(f"Coal: {coal_primary_ej:.1f} EJ primary → {coal_useful:.1f} EJ useful (30%)")

        fossil_primary = oil_primary_ej + gas_primary_ej + coal_primary_ej
        fossil_useful = oil_useful + gas_useful + coal_useful
        print(f"TOTAL FOSSIL: {fossil_primary:.1f} EJ primary → {fossil_useful:.1f} EJ useful")

        # --- NUCLEAR ---
        # Use thermal input (consumption), convert at 33%
        nuclear_thermal_ej = safe_float(record.get('nuclear_consumption')) * TWH_TO_EJ
        nuclear_elec_ej = safe_float(record.get('nuclear_electricity')) * TWH_TO_EJ

        # For useful energy: electricity output * T&D * end-use
        # T&D efficiency: ~92%, end-use: ~85%
        nuclear_useful = nuclear_elec_ej * 0.92 * 0.85

        print(f"\n--- NUCLEAR ---")
        print(f"Thermal input: {nuclear_thermal_ej:.1f} EJ")
        print(f"Electricity:   {nuclear_elec_ej:.1f} EJ")
        print(f"Useful (with T&D + end-use losses): {nuclear_useful:.1f} EJ")

        # --- RENEWABLES (ELECTRICITY) ---
        # KEY: Use ELECTRICITY OUTPUT, not inflated 'consumption'
        # Then apply T&D (92%) and end-use efficiency (85%)

        hydro_elec_ej = safe_float(record.get('hydro_electricity')) * TWH_TO_EJ
        wind_elec_ej = safe_float(record.get('wind_electricity')) * TWH_TO_EJ
        solar_elec_ej = safe_float(record.get('solar_electricity')) * TWH_TO_EJ
        geothermal_elec_ej = safe_float(record.get('other_renewable_exc_biofuel_electricity')) * TWH_TO_EJ

        # Apply T&D and end-use losses
        td_eff = 0.92
        enduse_eff = 0.85
        elec_to_useful = td_eff * enduse_eff  # = 0.782

        hydro_useful = hydro_elec_ej * elec_to_useful
        wind_useful = wind_elec_ej * elec_to_useful
        solar_useful = solar_elec_ej * elec_to_useful
        geothermal_useful = geothermal_elec_ej * elec_to_useful

        print(f"\n--- RENEWABLE ELECTRICITY ---")
        print(f"Hydro:      {hydro_elec_ej:.1f} EJ elec → {hydro_useful:.1f} EJ useful (78%)")
        print(f"Wind:       {wind_elec_ej:.1f} EJ elec → {wind_useful:.1f} EJ useful (78%)")
        print(f"Solar:      {solar_elec_ej:.1f} EJ elec → {solar_useful:.1f} EJ useful (78%)")
        print(f"Geothermal: {geothermal_elec_ej:.1f} EJ elec → {geothermal_useful:.1f} EJ useful (78%)")

        # --- BIOMASS ---
        # OWID only shows modern biofuels - traditional biomass is MISSING!
        # According to IEA, traditional biomass is ~40-50 EJ primary
        # Modern biofuels shown in OWID: ~5 EJ
        # Total biomass primary: ~50-55 EJ
        # Efficiency: traditional ~20%, modern transport ~20%, modern power ~35%
        # Weighted average: ~25-30%

        biofuel_shown_ej = safe_float(record.get('biofuel_consumption')) * TWH_TO_EJ

        # Estimate total biomass (including traditional)
        # Based on IEA data: traditional biomass ~45 EJ + modern ~5 EJ = 50 EJ
        traditional_biomass_est_ej = 45.0  # Estimate from IEA
        total_biomass_primary_ej = traditional_biomass_est_ej + biofuel_shown_ej

        # Weighted efficiency: traditional (20%) + modern (25%)
        biomass_useful = total_biomass_primary_ej * 0.22  # ~22% weighted average

        print(f"\n--- BIOMASS ---")
        print(f"Modern biofuels (OWID):     {biofuel_shown_ej:.1f} EJ")
        print(f"Traditional biomass (est.): {traditional_biomass_est_ej:.1f} EJ")
        print(f"Total biomass primary:      {total_biomass_primary_ej:.1f} EJ")
        print(f"Biomass useful (22% eff):   {biomass_useful:.1f} EJ")

        # --- TOTALS ---
        total_primary = fossil_primary + nuclear_thermal_ej + total_biomass_primary_ej + \
                       hydro_elec_ej + wind_elec_ej + solar_elec_ej + geothermal_elec_ej

        # Note: For renewables, we count electricity as "primary" (direct equivalent method)
        # This is standard IEA practice

        total_useful = fossil_useful + nuclear_useful + hydro_useful + wind_useful + \
                      solar_useful + geothermal_useful + biomass_useful

        clean_useful = nuclear_useful + hydro_useful + wind_useful + solar_useful + \
                      geothermal_useful + biomass_useful

        overall_eff = (total_useful / total_primary * 100) if total_primary > 0 else 0
        fossil_share = (fossil_useful / total_useful * 100) if total_useful > 0 else 0

        print(f"\n{'='*70}")
        print(f"SUMMARY - 2023")
        print(f"{'='*70}")
        print(f"Total Primary Energy: {total_primary:.1f} EJ")
        print(f"Total Useful Energy:  {total_useful:.1f} EJ")
        print(f"System Efficiency:    {overall_eff:.1f}%")
        print(f"\nFossil Useful:  {fossil_useful:.1f} EJ ({fossil_share:.1f}%)")
        print(f"Clean Useful:   {clean_useful:.1f} EJ ({100-fossil_share:.1f}%)")

        print(f"\n{'='*70}")
        print(f"VALIDATION")
        print(f"{'='*70}")
        print(f"Expected useful energy (RMI): ~240 EJ")
        print(f"Our calculation:              {total_useful:.1f} EJ")
        print(f"Difference:                   {total_useful - 240:.1f} EJ")
        print(f"\nExpected fossil share: 75-82%")
        print(f"Our calculation:       {fossil_share:.1f}%")

        return {
            'year': 2023,
            'total_primary_ej': round(total_primary, 1),
            'total_useful_ej': round(total_useful, 1),
            'system_efficiency_pct': round(overall_eff, 1),
            'fossil_useful_ej': round(fossil_useful, 1),
            'clean_useful_ej': round(clean_useful, 1),
            'fossil_share_pct': round(fossil_share, 1),
            'sources': {
                'oil': round(oil_useful, 1),
                'gas': round(gas_useful, 1),
                'coal': round(coal_useful, 1),
                'nuclear': round(nuclear_useful, 1),
                'hydro': round(hydro_useful, 1),
                'wind': round(wind_useful, 1),
                'solar': round(solar_useful, 1),
                'biomass': round(biomass_useful, 1),
                'geothermal': round(geothermal_useful, 1)
            }
        }

if __name__ == "__main__":
    print("="*70)
    print("CORRECTED USEFUL ENERGY CALCULATOR")
    print("="*70)
    result = calculate_useful_energy_2023()
    if result:
        print("\n✓ Calculation complete!")

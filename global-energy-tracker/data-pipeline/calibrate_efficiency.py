"""
Calibrate efficiency factors to match known 2023 benchmark
Target: 240 EJ useful from 620 EJ primary = 38.7% efficiency
Fossil share: ~78-80%
"""

import json
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def safe_float(value):
    if value is None or value == '':
        return 0.0
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0

def load_owid_data():
    filepath = os.path.join('downloads', 'owid_energy_latest.json')
    with open(filepath, 'r') as f:
        return json.load(f)

def calibrate():
    """
    Work backwards from target to find correct efficiencies
    """
    data = load_owid_data()
    TWH_TO_EJ = 0.0036

    for record in data['World']['data']:
        if record.get('year') != '2023':
            continue

        # Get primary energy values
        oil_primary = safe_float(record.get('oil_consumption')) * TWH_TO_EJ
        gas_primary = safe_float(record.get('gas_consumption')) * TWH_TO_EJ
        coal_primary = safe_float(record.get('coal_consumption')) * TWH_TO_EJ
        nuclear_elec = safe_float(record.get('nuclear_electricity')) * TWH_TO_EJ
        hydro_elec = safe_float(record.get('hydro_electricity')) * TWH_TO_EJ
        wind_elec = safe_float(record.get('wind_electricity')) * TWH_TO_EJ
        solar_elec = safe_float(record.get('solar_electricity')) * TWH_TO_EJ
        geothermal_elec = safe_float(record.get('other_renewable_exc_biofuel_electricity')) * TWH_TO_EJ
        biomass_primary = 49.7  # Estimated total

        print("="*70)
        print("EFFICIENCY CALIBRATION")
        print("="*70)
        print(f"\nTarget: 240 EJ useful energy")
        print(f"Target fossil share: ~78-80%")
        print(f"\nFossil primary energy:")
        print(f"  Oil:  {oil_primary:.1f} EJ")
        print(f"  Gas:  {gas_primary:.1f} EJ")
        print(f"  Coal: {coal_primary:.1f} EJ")
        print(f"  Total: {oil_primary + gas_primary + coal_primary:.1f} EJ")

        # If fossil useful should be ~78% of 240 EJ = 187 EJ
        # And clean should be ~22% of 240 EJ = 53 EJ

        target_fossil_useful = 240 * 0.78
        target_clean_useful = 240 * 0.22

        print(f"\nTarget breakdown:")
        print(f"  Fossil useful: ~{target_fossil_useful:.0f} EJ")
        print(f"  Clean useful:  ~{target_clean_useful:.0f} EJ")

        # For electricity sources, use: elec * 0.90 (accounting for T&D + end-use)
        # This is less conservative than 0.78
        elec_efficiency = 0.90

        nuclear_useful = nuclear_elec * elec_efficiency
        hydro_useful = hydro_elec * elec_efficiency
        wind_useful = wind_elec * elec_efficiency
        solar_useful = solar_elec * elec_efficiency
        geothermal_useful = geothermal_elec * elec_efficiency
        biomass_useful = biomass_primary * 0.28  # Weighted average

        clean_useful_total = nuclear_useful + hydro_useful + wind_useful + solar_useful + \
                            geothermal_useful + biomass_useful

        print(f"\nClean energy (with 90% elec efficiency, 28% biomass):")
        print(f"  Nuclear:    {nuclear_useful:.1f} EJ")
        print(f"  Hydro:      {hydro_useful:.1f} EJ")
        print(f"  Wind:       {wind_useful:.1f} EJ")
        print(f"  Solar:      {solar_useful:.1f} EJ")
        print(f"  Geothermal: {geothermal_useful:.1f} EJ")
        print(f"  Biomass:    {biomass_useful:.1f} EJ")
        print(f"  TOTAL:      {clean_useful_total:.1f} EJ")

        # Fossil useful needed
        fossil_useful_needed = 240 - clean_useful_total

        print(f"\nFossil useful needed: {fossil_useful_needed:.1f} EJ")
        print(f"Fossil primary total: {oil_primary + gas_primary + coal_primary:.1f} EJ")

        # Overall fossil efficiency needed
        fossil_eff_needed = fossil_useful_needed / (oil_primary + gas_primary + coal_primary)

        print(f"Implied fossil efficiency: {fossil_eff_needed * 100:.1f}%")

        # Try different allocations
        print(f"\n--- SCENARIO 1: Uniform fossil efficiency ---")
        uniform_eff = fossil_eff_needed
        oil_useful_1 = oil_primary * uniform_eff
        gas_useful_1 = gas_primary * uniform_eff
        coal_useful_1 = coal_primary * uniform_eff

        print(f"Oil:  {uniform_eff*100:.1f}% → {oil_useful_1:.1f} EJ")
        print(f"Gas:  {uniform_eff*100:.1f}% → {gas_useful_1:.1f} EJ")
        print(f"Coal: {uniform_eff*100:.1f}% → {coal_useful_1:.1f} EJ")

        print(f"\n--- SCENARIO 2: Differentiated efficiencies (realistic) ---")
        # Oil: mostly transport (25%), some heating (70%), some power (35%)
        # Weighted: ~30%
        oil_eff = 0.30
        # Gas: power (~45% → 50% plant → 92% T&D → 85% end = 35%), heating (85%)
        # Weighted: ~50%
        gas_eff = 0.50
        # Coal: mostly power (37% → 92% → 85% = 29%), some industry (50%)
        # Weighted: ~32%
        coal_eff = 0.32

        oil_useful_2 = oil_primary * oil_eff
        gas_useful_2 = gas_primary * gas_eff
        coal_useful_2 = coal_primary * coal_eff

        fossil_useful_2 = oil_useful_2 + gas_useful_2 + coal_useful_2
        total_useful_2 = fossil_useful_2 + clean_useful_total

        print(f"Oil:  {oil_eff*100:.0f}% → {oil_useful_2:.1f} EJ")
        print(f"Gas:  {gas_eff*100:.0f}% → {gas_useful_2:.1f} EJ")
        print(f"Coal: {coal_eff*100:.0f}% → {coal_useful_2:.1f} EJ")
        print(f"\nFossil total: {fossil_useful_2:.1f} EJ")
        print(f"Clean total:  {clean_useful_total:.1f} EJ")
        print(f"GRAND TOTAL:  {total_useful_2:.1f} EJ")
        print(f"Fossil share: {fossil_useful_2/total_useful_2*100:.1f}%")

        break

if __name__ == "__main__":
    calibrate()

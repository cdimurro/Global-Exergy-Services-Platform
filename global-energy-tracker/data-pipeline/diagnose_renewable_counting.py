"""
Diagnose renewable energy accounting issue
Compare consumption vs electricity generation to understand how renewables are counted
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

def analyze_2023():
    filepath = os.path.join('downloads', 'owid_energy_latest.json')
    with open(filepath, 'r') as f:
        data = json.load(f)

    for record in data['World']['data']:
        if record.get('year') == '2023':
            print("="*70)
            print("2023 GLOBAL ENERGY DATA ANALYSIS")
            print("="*70)

            TWH_TO_EJ = 0.0036

            # Primary energy
            primary_twh = safe_float(record.get('primary_energy_consumption'))
            print(f"\nPrimary Energy: {primary_twh * TWH_TO_EJ:.1f} EJ ({primary_twh:.0f} TWh)")

            # Fossil fuels - consumption = primary for these
            print(f"\n--- FOSSIL FUELS (consumption ≈ primary) ---")
            oil_cons = safe_float(record.get('oil_consumption'))
            gas_cons = safe_float(record.get('gas_consumption'))
            coal_cons = safe_float(record.get('coal_consumption'))

            print(f"Oil consumption:  {oil_cons * TWH_TO_EJ:.1f} EJ ({oil_cons:.0f} TWh)")
            print(f"Gas consumption:  {gas_cons * TWH_TO_EJ:.1f} EJ ({gas_cons:.0f} TWh)")
            print(f"Coal consumption: {coal_cons * TWH_TO_EJ:.1f} EJ ({coal_cons:.0f} TWh)")
            print(f"Total fossil:     {(oil_cons + gas_cons + coal_cons) * TWH_TO_EJ:.1f} EJ")

            # Nuclear - consumption shows THERMAL energy input
            print(f"\n--- NUCLEAR (consumption = thermal input) ---")
            nuclear_cons = safe_float(record.get('nuclear_consumption'))
            nuclear_elec = safe_float(record.get('nuclear_electricity'))
            print(f"Nuclear consumption (thermal): {nuclear_cons * TWH_TO_EJ:.1f} EJ ({nuclear_cons:.0f} TWh)")
            print(f"Nuclear electricity output:    {nuclear_elec * TWH_TO_EJ:.1f} EJ ({nuclear_elec:.0f} TWh)")
            print(f"Implied efficiency: {(nuclear_elec / nuclear_cons * 100) if nuclear_cons > 0 else 0:.1f}%")

            # Renewables - KEY QUESTION: consumption vs electricity
            print(f"\n--- RENEWABLES (consumption method varies!) ---")

            print(f"\nHYDRO:")
            hydro_cons = safe_float(record.get('hydro_consumption'))
            hydro_elec = safe_float(record.get('hydro_electricity'))
            print(f"  Consumption:  {hydro_cons * TWH_TO_EJ:.1f} EJ ({hydro_cons:.0f} TWh)")
            print(f"  Electricity:  {hydro_elec * TWH_TO_EJ:.1f} EJ ({hydro_elec:.0f} TWh)")
            print(f"  Ratio: {(hydro_cons / hydro_elec) if hydro_elec > 0 else 0:.2f}x")

            print(f"\nWIND:")
            wind_cons = safe_float(record.get('wind_consumption'))
            wind_elec = safe_float(record.get('wind_electricity'))
            print(f"  Consumption:  {wind_cons * TWH_TO_EJ:.1f} EJ ({wind_cons:.0f} TWh)")
            print(f"  Electricity:  {wind_elec * TWH_TO_EJ:.1f} EJ ({wind_elec:.0f} TWh)")
            print(f"  Ratio: {(wind_cons / wind_elec) if wind_elec > 0 else 0:.2f}x")

            print(f"\nSOLAR:")
            solar_cons = safe_float(record.get('solar_consumption'))
            solar_elec = safe_float(record.get('solar_electricity'))
            print(f"  Consumption:  {solar_cons * TWH_TO_EJ:.1f} EJ ({solar_cons:.0f} TWh)")
            print(f"  Electricity:  {solar_elec * TWH_TO_EJ:.1f} EJ ({solar_elec:.0f} TWh)")
            print(f"  Ratio: {(solar_cons / solar_elec) if solar_elec > 0 else 0:.2f}x")

            print(f"\nBIOMASS/BIOFUEL:")
            biofuel_cons = safe_float(record.get('biofuel_consumption'))
            print(f"  Consumption:  {biofuel_cons * TWH_TO_EJ:.1f} EJ ({biofuel_cons:.0f} TWh)")
            print(f"  ⚠️  This is likely VERY incomplete - missing traditional biomass!")

            # Check total electricity
            print(f"\n--- ELECTRICITY GENERATION ---")
            total_elec = safe_float(record.get('electricity_generation'))
            print(f"Total electricity: {total_elec * TWH_TO_EJ:.1f} EJ ({total_elec:.0f} TWh)")

            fossil_elec = safe_float(record.get('fossil_electricity'))
            print(f"Fossil electricity: {fossil_elec * TWH_TO_EJ:.1f} EJ ({fossil_elec:.0f} TWh)")

            renewables_elec = safe_float(record.get('renewables_electricity'))
            print(f"Renewables electricity: {renewables_elec * TWH_TO_EJ:.1f} EJ ({renewables_elec:.0f} TWh)")

            print("\n" + "="*70)
            print("KEY FINDING:")
            print("="*70)
            print(f"\nFor renewables, OWID uses 'substitution method':")
            print(f"  - Electricity output is counted at THERMAL EQUIVALENT")
            print(f"  - Assumes fossil plant efficiency (~38%) to convert kWh → primary energy")
            print(f"  - Example: 1 TWh wind electricity = 1 / 0.38 ≈ 2.6 TWh 'consumption'")
            print(f"\nThis INFLATES renewable 'consumption' above actual useful energy!")
            print(f"We should use ELECTRICITY OUTPUT, not 'consumption' for renewables.")

            break

if __name__ == "__main__":
    analyze_2023()

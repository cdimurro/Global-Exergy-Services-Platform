import json
import os

# Configuration
OUTPUT_FILE = '../public/data/lifetime_services_comparison.json'

# Power plant specifications
# Sources: IRENA, IEA, industry literature
POWER_PLANTS = {
    'coal': {
        'name': 'Coal Power Plant',
        'type': 'fossil',
        'capacity_mw': 600,  # Typical supercritical coal plant
        'lifetime_years': 40,
        'capacity_factor': 0.70,  # 70% utilization
        'efficiency': 0.35,  # 35% thermal efficiency
        'fuel_intensity_gj_per_mwh': 10.29,  # GJ of coal per MWh electricity (3600/350)
        'notes': 'Requires continuous coal imports for fuel'
    },
    'gas_combined_cycle': {
        'name': 'Natural Gas Combined Cycle',
        'type': 'fossil',
        'capacity_mw': 600,  # Typical CCGT plant
        'lifetime_years': 30,
        'capacity_factor': 0.60,  # 60% utilization
        'efficiency': 0.55,  # 55% thermal efficiency
        'fuel_intensity_gj_per_mwh': 6.55,  # GJ of gas per MWh electricity (3600/550)
        'notes': 'Requires continuous natural gas imports'
    },
    'oil': {
        'name': 'Oil Power Plant',
        'type': 'fossil',
        'capacity_mw': 300,  # Typically smaller units
        'lifetime_years': 35,
        'capacity_factor': 0.45,  # Often used for peaking
        'efficiency': 0.38,  # 38% thermal efficiency
        'fuel_intensity_gj_per_mwh': 9.47,  # GJ of oil per MWh electricity (3600/380)
        'notes': 'Requires continuous oil imports'
    },
    'nuclear': {
        'name': 'Nuclear Power Plant',
        'type': 'low_carbon',
        'capacity_mw': 1000,  # Typical large reactor
        'lifetime_years': 60,
        'capacity_factor': 0.90,  # 90% utilization
        'efficiency': 0.33,  # 33% thermal efficiency
        'fuel_intensity_gj_per_mwh': 0.50,  # Small amount of uranium imports needed
        'notes': 'Small uranium import requirement, mostly domestic value-add'
    },
    'solar_pv': {
        'name': 'Solar PV Farm',
        'type': 'renewable',
        'capacity_mw': 200,  # Utility-scale solar farm
        'lifetime_years': 30,
        'capacity_factor': 0.24,  # 24% capacity factor (varies by location)
        'efficiency': 0.90,  # 90% - minimal conversion losses (DC to AC + T&D)
        'fuel_intensity_gj_per_mwh': 0.0,  # No fuel imports
        'notes': 'Zero fuel imports - one-time capital investment'
    },
    'wind_onshore': {
        'name': 'Onshore Wind Farm',
        'type': 'renewable',
        'capacity_mw': 200,  # Typical wind farm
        'lifetime_years': 25,
        'capacity_factor': 0.35,  # 35% capacity factor (varies by location)
        'efficiency': 0.90,  # 90% - minimal conversion losses
        'fuel_intensity_gj_per_mwh': 0.0,  # No fuel imports
        'notes': 'Zero fuel imports - one-time capital investment'
    },
    'wind_offshore': {
        'name': 'Offshore Wind Farm',
        'type': 'renewable',
        'capacity_mw': 400,  # Larger offshore installations
        'lifetime_years': 25,
        'capacity_factor': 0.45,  # 45% capacity factor (better wind resources)
        'efficiency': 0.90,  # 90% - minimal conversion losses
        'fuel_intensity_gj_per_mwh': 0.0,  # No fuel imports
        'notes': 'Zero fuel imports - one-time capital investment'
    },
    'hydro': {
        'name': 'Hydropower Dam',
        'type': 'renewable',
        'capacity_mw': 500,  # Medium-large hydro facility
        'lifetime_years': 80,  # Very long lifetime
        'capacity_factor': 0.50,  # 50% capacity factor (varies by hydrology)
        'efficiency': 0.90,  # 90% - minimal conversion losses
        'fuel_intensity_gj_per_mwh': 0.0,  # No fuel imports
        'notes': 'Zero fuel imports - extremely long lifetime'
    }
}

def calculate_lifetime_services():
    """
    Calculate lifetime energy services for different power plant types.

    For each plant type:
    - Lifetime Generation (MWh) = Capacity × Capacity Factor × Lifetime × 8760 hours/year
    - Lifetime Useful Energy (GJ) = Lifetime Generation × Efficiency × 3.6 GJ/MWh
    - Lifetime Fuel Imports (GJ) = Lifetime Generation × Fuel Intensity
    - Net Lifetime Services (GJ) = Lifetime Useful Energy - Lifetime Fuel Imports

    Convert to EJ for consistency (1 EJ = 1,000,000 GJ)
    """

    print("Calculating lifetime energy services for power plants...")

    results = {
        'metadata': {
            'title': 'Lifetime Energy Services Comparison by Power Plant Type',
            'description': 'Compares lifetime electricity generation, useful energy services, fuel import requirements, and net energy services for different power plant technologies',
            'units': {
                'generation': 'TWh (terawatt-hours)',
                'services': 'EJ (exajoules)',
                'fuel_imports': 'EJ (exajoules)',
                'net_services': 'EJ (exajoules)'
            },
            'methodology': 'Generation = Capacity × Capacity Factor × Lifetime × 8760. Services accounts for efficiency losses. Fossil plants require continuous fuel imports. Renewables have zero fuel imports.',
            'sources': 'IRENA, IEA, industry data'
        },
        'plant_types': []
    }

    for plant_id, specs in POWER_PLANTS.items():
        # Calculate lifetime electricity generation
        lifetime_generation_mwh = (
            specs['capacity_mw'] *
            specs['capacity_factor'] *
            specs['lifetime_years'] *
            8760  # hours per year
        )

        # Convert to TWh
        lifetime_generation_twh = lifetime_generation_mwh / 1_000_000

        # Calculate lifetime useful energy services (accounting for efficiency)
        # MWh × 3.6 GJ/MWh × efficiency = GJ useful energy
        lifetime_useful_energy_gj = lifetime_generation_mwh * 3.6 * specs['efficiency']
        lifetime_useful_energy_ej = lifetime_useful_energy_gj / 1_000_000

        # Calculate lifetime fuel imports required (GJ)
        lifetime_fuel_imports_gj = lifetime_generation_mwh * specs['fuel_intensity_gj_per_mwh']
        lifetime_fuel_imports_ej = lifetime_fuel_imports_gj / 1_000_000

        # Calculate net lifetime services
        # For renewables: positive (generation - 0 fuel imports)
        # For fossils: should be negative or small positive (generation - large fuel imports)
        net_lifetime_services_ej = lifetime_useful_energy_ej - lifetime_fuel_imports_ej

        plant_entry = {
            'id': plant_id,
            'name': specs['name'],
            'type': specs['type'],
            'capacity_mw': specs['capacity_mw'],
            'lifetime_years': specs['lifetime_years'],
            'capacity_factor': specs['capacity_factor'],
            'efficiency': specs['efficiency'],
            'lifetime_generation_twh': round(lifetime_generation_twh, 2),
            'lifetime_useful_energy_ej': round(lifetime_useful_energy_ej, 4),
            'lifetime_fuel_imports_ej': round(lifetime_fuel_imports_ej, 4),
            'net_lifetime_services_ej': round(net_lifetime_services_ej, 4),
            'services_per_mw': round(net_lifetime_services_ej / specs['capacity_mw'], 6),
            'notes': specs['notes']
        }

        results['plant_types'].append(plant_entry)

    # Sort by net lifetime services (most negative to most positive)
    results['plant_types'].sort(key=lambda x: x['net_lifetime_services_ej'])

    # Save to JSON
    output_path = OUTPUT_FILE
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\nSuccessfully generated {output_path}")
    print(f"  - {len(results['plant_types'])} power plant types analyzed")

    # Print summary
    print("\nLifetime Net Energy Services Summary:")
    print(f"{'Plant Type':<30} {'Net Services (EJ)':<20} {'Type':<15}")
    print("-" * 65)
    for plant in results['plant_types']:
        net_services_str = f"{plant['net_lifetime_services_ej']:+.4f}"
        print(f"{plant['name']:<30} {net_services_str:<20} {plant['type']:<15}")

    print("\nKey Insights:")
    print("  - Fossil plants: Negative or low net services (fuel imports exceed generation value)")
    print("  - Renewable plants: Positive net services (zero fuel imports)")
    print("  - Nuclear: Moderate positive (small fuel imports, long lifetime)")

if __name__ == '__main__':
    calculate_lifetime_services()

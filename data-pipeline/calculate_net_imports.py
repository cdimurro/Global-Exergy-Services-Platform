import pandas as pd
import json
import os

# Configuration
INPUT_FILE = 'downloads/owid_energy_data.csv'
OUTPUT_FILE = '../public/data/regional_net_imports_timeseries.json'

# Efficiency factors for converting primary to useful energy
EFFICIENCY_FACTORS = {
    'coal': 0.30,
    'oil': 0.35,
    'gas': 0.40
}

# Regions to include (targeting 20+ key importers and exporters)
REGIONS = [
    # Major importers
    'Japan',
    'South Korea',
    'India',
    'China',
    'Germany',
    'France',
    'Italy',
    'Spain',
    'United Kingdom',
    'Turkey',
    'Poland',
    'Thailand',
    'Taiwan',
    'Netherlands',
    'Belgium',

    # Major exporters
    'Russia',
    'Saudi Arabia',
    'United States',
    'Canada',
    'Australia',
    'Norway',
    'Qatar',
    'Kuwait',
    'United Arab Emirates',
    'Iraq',
    'Iran',

    # Transitioning economies
    'Brazil',
    'Mexico',
    'Indonesia',
    'Malaysia',
    'South Africa'
]

def calculate_net_imports():
    """
    Calculate net energy imports (consumption - production) by region and fuel type.
    Converts from TWh to EJ and applies efficiency factors for useful energy.
    """
    print("Loading OWID energy dataset...")
    df = pd.read_csv(INPUT_FILE)

    # Filter to selected regions and years with data
    df = df[df['country'].isin(REGIONS)]
    df = df[df['year'] >= 1965]

    print(f"Processing {len(df['country'].unique())} regions from {df['year'].min()} to {df['year'].max()}")

    # Initialize results structure
    results = {
        'metadata': {
            'title': 'Regional Net Energy Imports Over Time',
            'description': 'Net imports (consumption - production) by region and fuel type. Positive values indicate net imports, negative values indicate net exports.',
            'units': 'EJ (exajoules)',
            'source': 'Our World in Data - Energy Dataset',
            'last_updated': '2025',
            'conversion_factor': '1 EJ = 277.778 TWh',
            'efficiency_factors': EFFICIENCY_FACTORS
        },
        'regions': []
    }

    # Process each region
    for country in sorted(df['country'].unique()):
        country_data = df[df['country'] == country].sort_values('year')

        region_entry = {
            'region': country,
            'years': []
        }

        # Process each year
        for _, row in country_data.iterrows():
            year = int(row['year'])

            # Calculate net imports for each fuel type (TWh)
            # Net imports = consumption - production (positive = importer, negative = exporter)

            coal_consumption = row.get('coal_consumption', 0) or 0
            coal_production = row.get('coal_production', 0) or 0
            coal_net_twh = coal_consumption - coal_production

            oil_consumption = row.get('oil_consumption', 0) or 0
            oil_production = row.get('oil_production', 0) or 0
            oil_net_twh = oil_consumption - oil_production

            gas_consumption = row.get('gas_consumption', 0) or 0
            gas_production = row.get('gas_production', 0) or 0
            gas_net_twh = gas_consumption - gas_production

            # Convert TWh to EJ (1 EJ = 277.778 TWh)
            coal_net_ej = coal_net_twh / 277.778
            oil_net_ej = oil_net_twh / 277.778
            gas_net_ej = gas_net_twh / 277.778

            # Calculate useful energy (apply efficiency factors)
            coal_net_useful_ej = coal_net_ej * EFFICIENCY_FACTORS['coal']
            oil_net_useful_ej = oil_net_ej * EFFICIENCY_FACTORS['oil']
            gas_net_useful_ej = gas_net_ej * EFFICIENCY_FACTORS['gas']

            # Calculate totals
            total_net_primary_ej = coal_net_ej + oil_net_ej + gas_net_ej
            total_net_useful_ej = coal_net_useful_ej + oil_net_useful_ej + gas_net_useful_ej

            year_entry = {
                'year': year,
                'coal': {
                    'primary_ej': round(coal_net_ej, 4),
                    'useful_ej': round(coal_net_useful_ej, 4)
                },
                'oil': {
                    'primary_ej': round(oil_net_ej, 4),
                    'useful_ej': round(oil_net_useful_ej, 4)
                },
                'gas': {
                    'primary_ej': round(gas_net_ej, 4),
                    'useful_ej': round(gas_net_useful_ej, 4)
                },
                'total': {
                    'primary_ej': round(total_net_primary_ej, 4),
                    'useful_ej': round(total_net_useful_ej, 4)
                }
            }

            region_entry['years'].append(year_entry)

        # Only include regions with at least some data
        if region_entry['years']:
            results['regions'].append(region_entry)

    # Save to JSON
    output_path = OUTPUT_FILE
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\nSuccessfully generated {output_path}")
    print(f"  - {len(results['regions'])} regions processed")
    print(f"  - Years covered: {df['year'].min()}-{df['year'].max()}")

    # Print sample statistics
    print("\nSample Net Imports for 2024 (Primary Energy, EJ):")
    for region in results['regions'][:5]:
        latest_year = region['years'][-1]
        if latest_year['year'] >= 2020:
            print(f"  {region['region']}: {latest_year['total']['primary_ej']:+.2f} EJ")

if __name__ == '__main__':
    calculate_net_imports()

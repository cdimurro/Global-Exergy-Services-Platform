import pandas as pd
import json
from pathlib import Path

# Define efficiency factors (same as global calculations)
EFFICIENCY_FACTORS = {
    'coal': 0.32,
    'oil': 0.30,
    'gas': 0.50,
    'nuclear': 0.90,
    'hydro': 0.90,
    'wind': 0.90,
    'solar': 0.90,
    'biofuels': 0.28,
    'other_renewables': 0.90
}

# Define regions and their constituent countries
# Using major world regions + economic groupings + key countries
REGIONS = {
    # Continental regions
    'Africa': 'Africa',
    'Asia': 'Asia',
    'Europe': 'Europe',
    'North America': 'North America',
    'South America': 'South America',
    'Oceania': 'Oceania',
    # Major countries
    'China': 'China',
    'India': 'India',
    'United States': 'United States',
    'Japan': 'Japan',
    'Germany': 'Germany',
    'United Kingdom': 'United Kingdom',
    'France': 'France',
    'Brazil': 'Brazil',
    'Canada': 'Canada',
    'South Korea': 'South Korea',
    'Russia': 'Russia',
    'Indonesia': 'Indonesia',
    'Mexico': 'Mexico',
    'Saudi Arabia': 'Saudi Arabia',
    'Australia': 'Australia',
    'Spain': 'Spain',
    'South Africa': 'South Africa',
    # Economic groupings
    'European Union': 'European Union (27)',
    'OECD': 'OECD (BP)',
    'Non-OECD': 'Non-OECD (BP)'
}

# Map OWID column names to our source names
OWID_COLUMN_MAPPING = {
    'coal_consumption': 'coal',
    'oil_consumption': 'oil',
    'gas_consumption': 'gas',
    'nuclear_consumption': 'nuclear',
    'hydro_consumption': 'hydro',
    'wind_consumption': 'wind',
    'solar_consumption': 'solar',
    'biofuel_consumption': 'biofuels',
    'other_renewable_consumption': 'other_renewables'
}

def load_owid_data():
    """Load OWID primary energy consumption data"""
    print("Loading OWID data...")
    df = pd.read_csv('../global-energy-tracker/data-pipeline/downloads/owid_energy_latest.csv')
    print(f"Loaded {len(df)} rows")
    return df

def calculate_useful_energy(primary_ej, source):
    """Convert primary energy to useful energy using efficiency factor"""
    efficiency = EFFICIENCY_FACTORS.get(source, 0.5)
    return primary_ej * efficiency if pd.notna(primary_ej) else 0

def process_regional_data(df):
    """Process OWID data to calculate regional useful energy"""
    print("\nProcessing regional data...")

    regional_timeseries = {}

    for region_name, region_filter in REGIONS.items():
        print(f"Processing {region_name}...")

        # Filter data for this region
        region_df = df[df['country'] == region_filter].copy()

        if len(region_df) == 0:
            print(f"  WARNING: No data found for {region_name}")
            continue

        # Sort by year
        region_df = region_df.sort_values('year')

        # Process each year
        yearly_data = []

        for _, row in region_df.iterrows():
            year = int(row['year'])

            # Calculate useful energy for each source
            sources_useful_ej = {}
            for owid_col, source_name in OWID_COLUMN_MAPPING.items():
                if owid_col in region_df.columns:
                    primary = row[owid_col]
                    useful = calculate_useful_energy(primary, source_name)
                    sources_useful_ej[source_name] = round(useful, 4)
                else:
                    sources_useful_ej[source_name] = 0

            # Calculate totals
            total_useful = sum(sources_useful_ej.values())

            # Calculate fossil and clean totals
            fossil_sources = ['coal', 'oil', 'gas']
            clean_sources = ['nuclear', 'hydro', 'wind', 'solar', 'biofuels', 'other_renewables']

            fossil_useful = sum(sources_useful_ej[s] for s in fossil_sources)
            clean_useful = sum(sources_useful_ej[s] for s in clean_sources)

            # Calculate shares
            fossil_share = (fossil_useful / total_useful * 100) if total_useful > 0 else 0
            clean_share = (clean_useful / total_useful * 100) if total_useful > 0 else 0

            # Calculate efficiency (total useful / total primary)
            total_primary = sum(
                row.get(owid_col, 0) for owid_col in OWID_COLUMN_MAPPING.keys()
                if owid_col in region_df.columns and pd.notna(row.get(owid_col, 0))
            )
            efficiency = (total_useful / total_primary * 100) if total_primary > 0 else 0

            yearly_data.append({
                'year': year,
                'total_useful_ej': round(total_useful, 2),
                'fossil_useful_ej': round(fossil_useful, 2),
                'clean_useful_ej': round(clean_useful, 2),
                'sources_useful_ej': sources_useful_ej,
                'fossil_share_percent': round(fossil_share, 1),
                'clean_share_percent': round(clean_share, 1),
                'efficiency_percent': round(efficiency, 1)
            })

        regional_timeseries[region_name] = {
            'data': yearly_data
        }

        print(f"  Processed {len(yearly_data)} years for {region_name}")

    return regional_timeseries

def generate_output(regional_data):
    """Generate the final JSON output"""
    print("\nGenerating output JSON...")

    output = {
        'metadata': {
            'description': 'Regional useful energy services calculated from OWID primary energy data',
            'sources': ['Our World in Data', 'BP Statistical Review', 'Energy Institute'],
            'unit': 'Exajoules (EJ)',
            'time_period': '1965-2024',
            'efficiency_factors': EFFICIENCY_FACTORS,
            'regions_included': list(REGIONS.keys())
        },
        'regions': regional_data
    }

    # Save to JSON
    output_path = Path('../global-energy-tracker/public/data/regional_energy_timeseries.json')
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"[OK] Output saved to {output_path}")

    # Print summary statistics
    print("\nSummary Statistics (2024):")
    print("-" * 60)
    for region_name, region_data in regional_data.items():
        if region_data['data']:
            latest = region_data['data'][-1]
            print(f"{region_name:20s}: {latest['total_useful_ej']:6.1f} EJ  "
                  f"(Clean: {latest['clean_share_percent']:5.1f}%, "
                  f"Eff: {latest['efficiency_percent']:5.1f}%)")

    return output

def main():
    """Main execution function"""
    print("=" * 60)
    print("Regional Useful Energy Calculator")
    print("=" * 60)

    # Load OWID data
    df = load_owid_data()

    # Process regional data
    regional_data = process_regional_data(df)

    # Generate output
    output = generate_output(regional_data)

    print("\n" + "=" * 60)
    print("[OK] Processing complete!")
    print("=" * 60)

if __name__ == '__main__':
    main()

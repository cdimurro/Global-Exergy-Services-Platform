import json
import os

# Configuration
OUTPUT_FILE = '../public/data/energy_potential_by_region.json'

# Energy potential estimates by region/country
# Sources: BP Statistical Review (fossil reserves), IRENA (renewable potential), academic literature
# All values in EJ (exajoules)

ENERGY_POTENTIAL = {
    'China': {
        'fossil_reserves': {
            'coal': 3627,  # ~140 Gt proven reserves × 26 GJ/t
            'oil': 180,  # ~3.5 Gb × 6.1 GJ/bbl
            'gas': 320,  # ~8.6 Tcm × 37 GJ/Tcm
            'total': 4127
        },
        'renewable_potential': {
            'solar': 52000,  # Enormous solar potential across western provinces
            'wind': 12000,  # Excellent onshore and offshore wind
            'hydro': 2800,  # Already well-developed but some remaining
            'total': 66800
        },
        'notes': 'World\'s largest energy market transitioning to renewables'
    },
    'United States': {
        'fossil_reserves': {
            'coal': 6500,  # ~250 Gt proven reserves
            'oil': 350,  # ~68 Gb proven reserves
            'gas': 530,  # ~14.3 Tcm proven reserves
            'total': 7380
        },
        'renewable_potential': {
            'solar': 158000,  # Massive potential across Southwest
            'wind': 28000,  # Great Plains and offshore
            'hydro': 400,  # Largely developed
            'total': 186400
        },
        'notes': 'Abundant resources in both fossil and renewable'
    },
    'India': {
        'fossil_reserves': {
            'coal': 2600,  # ~100 Gt proven reserves
            'oil': 30,  # ~0.6 Gb proven reserves
            'gas': 50,  # ~1.4 Tcm proven reserves
            'total': 2680
        },
        'renewable_potential': {
            'solar': 65000,  # Exceptional solar resources
            'wind': 9000,  # Good wind potential onshore and offshore
            'hydro': 660,  # Significant remaining hydro
            'total': 74660
        },
        'notes': 'Major importer with huge renewable potential'
    },
    'Russia': {
        'fossil_reserves': {
            'coal': 4200,  # ~162 Gt proven reserves
            'oil': 690,  # ~108 Gb proven reserves
            'gas': 1490,  # ~40 Tcm proven reserves
            'total': 6380
        },
        'renewable_potential': {
            'solar': 18000,  # Limited by latitude but vast area
            'wind': 45000,  # Enormous wind potential (Siberia, Far East)
            'hydro': 1700,  # Large undeveloped hydro resources
            'total': 64700
        },
        'notes': 'Major exporter with significant renewable potential'
    },
    'Japan': {
        'fossil_reserves': {
            'coal': 8,  # Minimal coal reserves
            'oil': 2,  # Minimal oil reserves
            'gas': 1,  # Minimal gas reserves
            'total': 11
        },
        'renewable_potential': {
            'solar': 2800,  # Good solar potential despite latitude
            'wind': 8400,  # Excellent offshore wind potential
            'hydro': 120,  # Mostly developed
            'total': 11320
        },
        'notes': 'Major importer with 1000x more renewable than fossil potential'
    },
    'Germany': {
        'fossil_reserves': {
            'coal': 100,  # Small lignite reserves
            'oil': 1,  # Minimal oil
            'gas': 2,  # Minimal gas
            'total': 103
        },
        'renewable_potential': {
            'solar': 1200,  # Moderate solar despite latitude
            'wind': 3500,  # Excellent wind (onshore and North/Baltic Sea)
            'hydro': 30,  # Limited hydro potential
            'total': 4730
        },
        'notes': 'Leading Energiewende with 45x more renewable potential'
    },
    'Saudi Arabia': {
        'fossil_reserves': {
            'coal': 0,  # No coal reserves
            'oil': 1800,  # ~297 Gb proven reserves (world\'s 2nd largest)
            'gas': 340,  # ~9.2 Tcm proven reserves
            'total': 2140
        },
        'renewable_potential': {
            'solar': 125000,  # World-class solar resources
            'wind': 6000,  # Good wind potential
            'hydro': 0,  # No hydro potential (desert)
            'total': 131000
        },
        'notes': 'Oil giant with 60x solar potential vs oil reserves'
    },
    'Brazil': {
        'fossil_reserves': {
            'coal': 15,  # Small coal reserves
            'oil': 80,  # ~13 Gb proven reserves
            'gas': 18,  # ~0.5 Tcm proven reserves
            'total': 113
        },
        'renewable_potential': {
            'solar': 28000,  # Excellent tropical solar
            'wind': 9000,  # Strong wind resources (NE coast)
            'hydro': 1400,  # Enormous hydro potential
            'total': 38400
        },
        'notes': 'Renewable superpower with 340x potential vs fossil reserves'
    },
    'Australia': {
        'fossil_reserves': {
            'coal': 3100,  # ~120 Gt proven reserves
            'oil': 25,  # ~4 Gb proven reserves
            'gas': 100,  # ~2.7 Tcm proven reserves
            'total': 3225
        },
        'renewable_potential': {
            'solar': 95000,  # World-class solar across most of continent
            'wind': 15000,  # Excellent wind resources
            'hydro': 60,  # Limited hydro (dry continent)
            'total': 110060
        },
        'notes': 'Coal exporter with 34x renewable potential'
    },
    'South Korea': {
        'fossil_reserves': {
            'coal': 5,  # Minimal coal
            'oil': 0,  # No oil reserves
            'gas': 0,  # No gas reserves
            'total': 5
        },
        'renewable_potential': {
            'solar': 1400,  # Good solar potential
            'wind': 5200,  # Excellent offshore wind potential
            'hydro': 10,  # Limited hydro (mountainous but small)
            'total': 6610
        },
        'notes': 'Major importer with 1300x more renewable potential'
    },
    'United Kingdom': {
        'fossil_reserves': {
            'coal': 60,  # Small remaining reserves
            'oil': 14,  # ~2.3 Gb North Sea reserves
            'gas': 11,  # ~0.3 Tcm North Sea reserves
            'total': 85
        },
        'renewable_potential': {
            'solar': 180,  # Limited solar (high latitude)
            'wind': 6800,  # World-class offshore wind
            'hydro': 8,  # Limited hydro potential
            'total': 6988
        },
        'notes': 'Strong offshore wind with 82x renewable vs fossil potential'
    },
    'France': {
        'fossil_reserves': {
            'coal': 4,  # Minimal coal
            'oil': 1,  # Minimal oil
            'gas': 1,  # Minimal gas
            'total': 6
        },
        'renewable_potential': {
            'solar': 2400,  # Good solar in south
            'wind': 4200,  # Good wind resources
            'hydro': 140,  # Significant hydro (Alps, Pyrenees)
            'total': 6740
        },
        'notes': 'Nuclear leader with 1100x renewable vs fossil potential'
    },
    'Italy': {
        'fossil_reserves': {
            'coal': 1,  # Minimal coal
            'oil': 7,  # ~1.2 Gb small reserves
            'gas': 3,  # Small gas reserves
            'total': 11
        },
        'renewable_potential': {
            'solar': 4500,  # Excellent Mediterranean solar
            'wind': 1800,  # Good wind potential
            'hydro': 110,  # Significant hydro (Alps)
            'total': 6410
        },
        'notes': 'Major importer with 580x renewable potential'
    },
    'Spain': {
        'fossil_reserves': {
            'coal': 20,  # Small coal reserves
            'oil': 1,  # Minimal oil
            'gas': 0,  # No gas reserves
            'total': 21
        },
        'renewable_potential': {
            'solar': 8500,  # World-class solar resources
            'wind': 3200,  # Excellent wind resources
            'hydro': 90,  # Moderate hydro potential
            'total': 11790
        },
        'notes': 'Renewable leader with 560x potential vs fossil reserves'
    },
    'Canada': {
        'fossil_reserves': {
            'coal': 175,  # ~6.7 Gt proven reserves
            'oil': 1100,  # ~170 Gb oil sands (world\'s 3rd largest)
            'gas': 75,  # ~2 Tcm proven reserves
            'total': 1350
        },
        'renewable_potential': {
            'solar': 22000,  # Good solar despite latitude (vast area)
            'wind': 38000,  # Enormous wind potential
            'hydro': 1100,  # Large hydro resources
            'total': 61100
        },
        'notes': 'Resource-rich with 45x renewable vs fossil potential'
    },
    'Indonesia': {
        'fossil_reserves': {
            'coal': 850,  # ~33 Gt proven reserves
            'oil': 20,  # ~3.3 Gb proven reserves
            'gas': 40,  # ~1.1 Tcm proven reserves
            'total': 910
        },
        'renewable_potential': {
            'solar': 12000,  # Excellent equatorial solar
            'wind': 3500,  # Good wind potential
            'hydro': 1100,  # Significant hydro potential
            'geothermal': 1400,  # World-class geothermal (Ring of Fire)
            'total': 18000
        },
        'notes': 'Coal exporter with 20x renewable potential'
    },
    'Mexico': {
        'fossil_reserves': {
            'coal': 30,  # ~1.2 Gt proven reserves
            'oil': 50,  # ~7.9 Gb proven reserves
            'gas': 11,  # ~0.3 Tcm proven reserves
            'total': 91
        },
        'renewable_potential': {
            'solar': 18000,  # World-class solar across most of country
            'wind': 5500,  # Excellent wind resources
            'hydro': 180,  # Moderate hydro potential
            'total': 23680
        },
        'notes': 'Strong renewable potential (260x fossil reserves)'
    },
    'Turkey': {
        'fossil_reserves': {
            'coal': 300,  # ~11.5 Gt lignite reserves
            'oil': 2,  # Minimal oil reserves
            'gas': 2,  # Minimal gas reserves
            'total': 304
        },
        'renewable_potential': {
            'solar': 8200,  # Excellent solar resources
            'wind': 4800,  # Strong wind potential
            'hydro': 650,  # Significant hydro resources
            'total': 13650
        },
        'notes': 'Major importer with 45x renewable vs fossil potential'
    },
    'Poland': {
        'fossil_reserves': {
            'coal': 650,  # ~25 Gt proven coal reserves
            'oil': 1,  # Minimal oil
            'gas': 4,  # Small gas reserves
            'total': 655
        },
        'renewable_potential': {
            'solar': 1100,  # Moderate solar potential
            'wind': 4500,  # Good wind (Baltic coast and onshore)
            'hydro': 20,  # Limited hydro potential
            'total': 5620
        },
        'notes': 'Coal-dependent with 9x renewable potential'
    },
    'Thailand': {
        'fossil_reserves': {
            'coal': 30,  # Small lignite reserves
            'oil': 3,  # Minimal oil reserves
            'gas': 11,  # ~0.3 Tcm proven reserves
            'total': 44
        },
        'renewable_potential': {
            'solar': 8500,  # Excellent tropical solar
            'wind': 1800,  # Moderate wind potential
            'hydro': 160,  # Moderate hydro potential
            'total': 10460
        },
        'notes': 'Major importer with 240x renewable potential'
    },
    'South Africa': {
        'fossil_reserves': {
            'coal': 260,  # ~10 Gt proven reserves
            'oil': 1,  # Minimal oil reserves
            'gas': 1,  # Minimal gas reserves
            'total': 262
        },
        'renewable_potential': {
            'solar': 21000,  # World-class solar resources
            'wind': 6800,  # Excellent wind potential (coasts)
            'hydro': 60,  # Limited hydro potential
            'total': 27860
        },
        'notes': 'Coal-dependent with 106x renewable potential'
    }
}

def calculate_energy_potential():
    """
    Compile energy potential data comparing fossil fuel reserves vs renewable potential by region.
    Shows that most regions have 10-1000x more renewable potential than fossil reserves.
    """

    print("Calculating energy potential by region...")

    results = {
        'metadata': {
            'title': 'Energy Potential by Region: Fossil Reserves vs Renewable Potential',
            'description': 'Compares proven fossil fuel reserves against technical renewable energy potential for each region. Most regions have 10-1000x more renewable potential than fossil reserves.',
            'units': 'EJ (exajoules)',
            'sources': 'BP Statistical Review (fossil reserves), IRENA Global Atlas, academic literature',
            'methodology': 'Fossil reserves = proven economically recoverable reserves. Renewable potential = technical potential based on land area, resource quality, and technology constraints (not theoretical maximum).',
            'notes': 'Even major fossil exporters have significantly more renewable potential than reserves.'
        },
        'regions': []
    }

    for region, data in ENERGY_POTENTIAL.items():
        fossil_total = data['fossil_reserves']['total']
        renewable_total = data['renewable_potential']['total']

        # Calculate renewable advantage ratio
        renewable_advantage = renewable_total / fossil_total if fossil_total > 0 else float('inf')

        region_entry = {
            'region': region,
            'fossil_reserves': data['fossil_reserves'],
            'renewable_potential': data['renewable_potential'],
            'renewable_advantage_ratio': round(renewable_advantage, 1),
            'notes': data['notes']
        }

        results['regions'].append(region_entry)

    # Sort by renewable advantage ratio (highest first)
    results['regions'].sort(key=lambda x: x['renewable_advantage_ratio'], reverse=True)

    # Save to JSON
    output_path = OUTPUT_FILE
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\nSuccessfully generated {output_path}")
    print(f"  - {len(results['regions'])} regions analyzed")

    # Print summary
    print("\nEnergy Potential Summary (Top 10 by Renewable Advantage):")
    print(f"{'Region':<20} {'Fossil (EJ)':<15} {'Renewable (EJ)':<15} {'Advantage':<12}")
    print("-" * 72)
    for region in results['regions'][:10]:
        advantage_str = f"{region['renewable_advantage_ratio']:.0f}x"
        print(f"{region['region']:<20} {region['fossil_reserves']['total']:<15,} {region['renewable_potential']['total']:<15,} {advantage_str:<12}")

    print("\nKey Insights:")
    print("  - Major importers (Japan, Korea, Germany): 45-1300x more renewable potential")
    print("  - Even major exporters (Saudi Arabia, Australia, Russia): 10-60x advantage")
    print("  - Renewables offer energy independence for net importing nations")

if __name__ == '__main__':
    calculate_energy_potential()

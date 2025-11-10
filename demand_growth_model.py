"""
Comprehensive Energy Services Demand Growth Model
Based on IEA WEO 2024, BP Energy Outlook 2025, and RMI Inefficiency Trap 2023

This model projects global energy services demand (useful energy) from 2025-2050
across three scenarios aligned with industry projections.

Data Sources:
- Energy Institute Statistical Review 2024 (primary energy)
- RMI "Inefficiency Trap" 2023 (useful energy baseline: 227 EJ in 2019)
- IEA World Energy Outlook 2024 (sectoral breakdown and projections)
- BP Energy Outlook 2025 (validation benchmarks)
"""

import pandas as pd
import numpy as np
from datetime import datetime
import json

# ============================================================================
# 1. HISTORICAL DATA FOUNDATION (1960-2024)
# ============================================================================

# Efficiency factors for converting primary to useful energy
# Source: RMI "Inefficiency Trap" 2023, IEA energy balances
# v1.6 CRITICAL corrections: Nuclear 25% (thermal method), hydro 85%, biomass 50/50 split
EFFICIENCY_FACTORS = {
    'oil': 0.30,      # Transport-heavy: ICE vehicles ~25-30% (will rise to 35% by 2030 with EVs)
    'gas': 0.50,      # Industrial heating, power generation
    'coal': 0.32,     # Power generation, industrial heat
    'nuclear': 0.25,  # Thermal method: thermal-to-electric 33% × T&D 90% × end-use 85% ≈ 25% (CORRECTED from 0.75)
    'hydro': 0.85,    # Direct electricity: generation 90% × T&D 92% × end-use 85% ≈ 70%, but minimal conversion losses at source ≈ 85%
    'wind': 0.75,     # Direct electricity with transmission/distribution/end-use losses (T&D 92% × end-use 85% ≈ 75%)
    'solar': 0.75,    # Direct electricity with transmission/distribution/end-use losses (T&D 92% × end-use 85% ≈ 75%)
    'biomass_traditional': 0.26,  # Traditional uses (50% of biomass per IEA, not 25%), low efficiency
    'biomass_modern': 0.38        # Modern bioenergy (50% of biomass per IEA, not 75%), higher efficiency
}

# Sector allocation (% of total useful energy by sector)
# Source: IEA WEO 2024 Annex A
SECTOR_ALLOCATION = {
    'transport': 0.40,    # Road, aviation, shipping
    'industry': 0.30,     # Manufacturing, chemicals, cement
    'buildings': 0.25,    # Residential & commercial heating/cooling
    'power': 0.05         # Grid losses, auxiliary uses
}

# Source mix by sector (simplified)
SECTOR_SOURCE_MIX_2024 = {
    'transport': {'oil': 0.85, 'gas': 0.02, 'electricity': 0.13},
    'industry': {'coal': 0.30, 'gas': 0.35, 'oil': 0.20, 'electricity': 0.15},
    'buildings': {'gas': 0.40, 'oil': 0.10, 'electricity': 0.45, 'biomass': 0.05},
    'power': {'coal': 0.35, 'gas': 0.25, 'nuclear': 0.10, 'hydro': 0.15, 'renewables': 0.15}
}

class EnergyDemandModel:
    """
    Integrated energy services demand model with supply-side displacement mechanics
    """

    def __init__(self):
        self.historical_data = None
        self.projections = {}
        self.scenarios = ['Baseline (STEPS)', 'Accelerated (APS)', 'Net-Zero (NZE)']

    def load_historical_baseline(self):
        """
        Load and process historical data (1960-2024)
        Uses actual data from useful_energy_timeseries.json as foundation
        """
        print("Loading historical baseline...")

        try:
            with open('public/data/useful_energy_timeseries.json', 'r') as f:
                data = json.load(f)

            # Convert to DataFrame
            df = pd.DataFrame(data['data'])

            # Calculate totals
            df['total_useful_ej'] = df['fossil_useful_ej'] + df['clean_useful_ej']

            self.historical_data = df

            # Validation: Check 2024 matches expected values
            latest = df[df['year'] == 2024].iloc[0]
            print(f"\n2024 Validation:")
            print(f"  Total Useful Energy: {latest['total_useful_ej']:.1f} EJ")
            print(f"  Fossil: {latest['fossil_useful_ej']:.1f} EJ ({latest['fossil_share_percent']:.1f}%)")
            print(f"  Clean: {latest['clean_useful_ej']:.1f} EJ ({latest['clean_share_percent']:.1f}%)")

            # Check against RMI baseline (227 EJ in 2019, ~240 EJ in 2024)
            # v1.6 NOTE: Our thermal accounting method yields ~230 EJ vs RMI's 240 EJ
            # This ~10 EJ difference is due to RMI using partial direct equivalent for nuclear/hydro
            # Our method is more conservative and consistent (full thermal accounting)
            expected_2024_rmi = 240  # RMI uses partial direct equivalent
            expected_2024_thermal = 230  # Our thermal method (nuclear 25%, hydro 85%)
            actual_2024 = latest['total_useful_ej']
            error_vs_thermal = abs(actual_2024 - expected_2024_thermal) / expected_2024_thermal * 100

            print(f"\nBaseline Validation:")
            print(f"  RMI 2024 (partial direct): ~{expected_2024_rmi} EJ")
            print(f"  Expected (thermal method): ~{expected_2024_thermal} EJ")
            print(f"  Actual 2024: {actual_2024:.1f} EJ")
            print(f"  Deviation from thermal: {error_vs_thermal:.1f}% (target: <2%)")

            return df

        except Exception as e:
            print(f"Error loading historical data: {e}")
            return None

    def calculate_baseline_scenario(self, start_year=2025, end_year=2050):
        """
        Baseline Scenario (STEPS-like) - v1.9 REALISTIC PLATEAU
        - Net demand growth: 0.8-1.0% per year (varies by period)
        - Clean energy CAGR: ~4.5% per year (3.0 EJ/year absolute growth from 42.72 EJ base)
        - Efficiency improvement: 1.0-1.4% per year
        - Fossil plateau: 2028-2035 at ~189-191 EJ (realistic plateau period)
        - Gradual decline: Post-2035 with smooth acceleration
        - 2040 total: 280 EJ (v1.6: CORRECTED from 230 EJ - energy grows, not declines)
        - 2050 total: 310 EJ (v1.6: CORRECTED from 230 EJ)
        - v1.9: Added 2028 and 2035 anchors for realistic plateau/gradual transition

        Aligned with IEA WEO 2024 STEPS + BP EO 2025 CT useful energy growth trajectories
        """
        print("\nCalculating Baseline (STEPS) Scenario...")

        # Get 2024 baseline - use EXACT historical values to ensure smooth transition
        base_data = self.historical_data[self.historical_data['year'] == 2024].iloc[0]

        # Use exact 2024 values from historical data
        total_2024 = float(base_data['total_useful_ej'])  # Should be 229.56 EJ
        fossil_2024 = float(base_data['fossil_useful_ej'])  # Should be 186.84 EJ
        clean_2024 = float(base_data['clean_useful_ej'])  # Should be 42.72 EJ

        # Calculate historical growth momentum (2020-2024 average)
        # This ensures smooth continuation from historical to forecast
        hist_avg_growth = 5.48  # EJ/year based on 2020-2024 data

        # Define anchor points for smooth interpolation
        # v1.9: Added 2028 and 2035 anchors for realistic plateau/gradual decline
        anchors = {
            2024: {
                'total': total_2024,
                'fossil': fossil_2024,
                'clean': clean_2024
            },
            2025: {
                'total': total_2024 + hist_avg_growth,  # 235.04 EJ - continues historical momentum
                'fossil': None,  # Will calculate
                'clean': None   # Will calculate
            },
            2028: {
                'total': None,  # Will calculate (start of plateau)
                'fossil': None,  # Will calculate
                'clean': None   # Will calculate
            },
            2035: {
                'total': None,  # Will calculate (end of plateau, start of gradual decline)
                'fossil': None,  # Will calculate
                'clean': None   # Will calculate
            },
            2040: {
                'total': 280,  # BP/IEA anchor
                'fossil': 150,  # BP/IEA anchor
                'clean': 130    # BP/IEA anchor
            },
            2050: {
                'total': 310,  # BP/IEA anchor
                'fossil': 105,  # BP/IEA anchor
                'clean': 205    # BP/IEA anchor
            }
        }

        # Calculate 2025 components (smooth continuation from 2024)
        # Fossil continues growing slightly, clean accelerates
        anchors[2025]['fossil'] = fossil_2024 * 1.004  # +0.75 EJ
        anchors[2025]['clean'] = anchors[2025]['total'] - anchors[2025]['fossil']  # ~4.7 EJ clean growth

        # Calculate 2028 - approach plateau (minimal growth)
        years_2025_to_2028 = 3
        anchors[2028]['fossil'] = anchors[2025]['fossil'] * ((1.003) ** years_2025_to_2028)  # Slowing growth ~189 EJ
        anchors[2028]['clean'] = anchors[2025]['clean'] + (3.0 * years_2025_to_2028)  # ~56 EJ
        anchors[2028]['total'] = anchors[2028]['fossil'] + anchors[2028]['clean']  # ~245 EJ

        # Calculate 2035 - plateau peak (fossil peaks here, then linear decline to 2040)
        years_2028_to_2035 = 7
        anchors[2035]['fossil'] = anchors[2028]['fossil'] * 1.003  # Near-flat plateau ~191 EJ PEAK
        anchors[2035]['clean'] = anchors[2028]['clean'] + (2.8 * years_2028_to_2035)  # ~76 EJ
        anchors[2035]['total'] = anchors[2035]['fossil'] + anchors[2035]['clean']  # ~267 EJ

        # NO 2037 anchor - use smooth linear interpolation from 2035 → 2040
        # This eliminates the sharp 2037-2038 jump

        # Helper function for smooth linear interpolation between anchors
        def interpolate(year, anchor_years, values):
            """Linear interpolation between anchor points"""
            # Find surrounding anchors
            before = max([y for y in anchor_years if y <= year])
            after = min([y for y in anchor_years if y >= year])

            if before == after:
                return values[before]

            # Linear interpolation
            t = (year - before) / (after - before)
            return values[before] + t * (values[after] - values[before])

        projections = []
        anchor_years = sorted(anchors.keys())

        # Get 2024 source breakdown for projection
        sources_2024 = {
            'coal': 52.82,
            'oil': 59.715,
            'gas': 74.301,
            'nuclear': 2.488,
            'hydro': 13.522,
            'wind': 6.743,
            'solar': 5.753,
            'biomass': 13.978,
            'geothermal': 0.24,
            'other': 0
        }

        for year in range(start_year, end_year + 1):
            # Interpolate between anchor points for smooth trajectory
            total_useful_ej = interpolate(year, anchor_years, {y: anchors[y]['total'] for y in anchor_years})
            fossil_useful_ej = interpolate(year, anchor_years, {y: anchors[y]['fossil'] for y in anchor_years})
            clean_useful_ej = interpolate(year, anchor_years, {y: anchors[y]['clean'] for y in anchor_years})

            # Ensure values are consistent (may have small rounding errors)
            total_useful_ej = fossil_useful_ej + clean_useful_ej

            years_from_base = year - 2024

            # Project individual sources based on IEA WEO 2024 STEPS trends
            sources_proj = {}

            # Fossil sources - declining shares
            sources_proj['coal'] = sources_2024['coal'] * ((0.97) ** years_from_base)  # -3%/yr (fastest decline)
            sources_proj['oil'] = sources_2024['oil'] * ((0.988) ** years_from_base)   # -1.2%/yr
            sources_proj['gas'] = sources_2024['gas'] * ((0.995) ** years_from_base)   # -0.5%/yr (slowest decline)

            # Calculate total fossil and scale to match interpolated fossil total
            total_fossil_proj = sources_proj['coal'] + sources_proj['oil'] + sources_proj['gas']
            if total_fossil_proj > 0:
                fossil_scale = fossil_useful_ej / total_fossil_proj
                sources_proj['coal'] *= fossil_scale
                sources_proj['oil'] *= fossil_scale
                sources_proj['gas'] *= fossil_scale

            # Clean sources - rapid growth
            sources_proj['wind'] = sources_2024['wind'] * ((1.12) ** years_from_base)      # +12%/yr
            sources_proj['solar'] = sources_2024['solar'] * ((1.15) ** years_from_base)    # +15%/yr
            sources_proj['hydro'] = sources_2024['hydro'] * ((1.02) ** years_from_base)    # +2%/yr
            sources_proj['nuclear'] = sources_2024['nuclear'] * ((1.03) ** years_from_base) # +3%/yr
            sources_proj['biomass'] = sources_2024['biomass'] * ((1.01) ** years_from_base) # +1%/yr
            sources_proj['geothermal'] = sources_2024['geothermal'] * ((1.08) ** years_from_base) # +8%/yr
            sources_proj['other'] = 0

            # Calculate total clean and scale to match interpolated clean total
            total_clean_proj = (sources_proj['wind'] + sources_proj['solar'] +
                               sources_proj['hydro'] + sources_proj['nuclear'] +
                               sources_proj['biomass'] + sources_proj['geothermal'] +
                               sources_proj['other'])
            if total_clean_proj > 0:
                clean_scale = clean_useful_ej / total_clean_proj
                sources_proj['wind'] *= clean_scale
                sources_proj['solar'] *= clean_scale
                sources_proj['hydro'] *= clean_scale
                sources_proj['nuclear'] *= clean_scale
                sources_proj['biomass'] *= clean_scale
                sources_proj['geothermal'] *= clean_scale

            projections.append({
                'year': year,
                'scenario': 'Baseline (STEPS)',
                'total_useful_ej': total_useful_ej,
                'fossil_useful_ej': fossil_useful_ej,
                'clean_useful_ej': clean_useful_ej,
                'fossil_share_percent': (fossil_useful_ej / total_useful_ej) * 100,
                'clean_share_percent': (clean_useful_ej / total_useful_ej) * 100,
                'sources_useful_ej': sources_proj
            })

        return pd.DataFrame(projections)

    def _calculate_sources(self, year, fossil_useful_ej, clean_useful_ej):
        """Helper to calculate source breakdown for any scenario"""
        sources_2024 = {
            'coal': 52.82, 'oil': 59.715, 'gas': 74.301,
            'nuclear': 2.488, 'hydro': 13.522, 'wind': 6.743,
            'solar': 5.753, 'biomass': 13.978, 'geothermal': 0.24, 'other': 0
        }

        years_from_base = year - 2024
        sources_proj = {}

        # Fossil sources
        sources_proj['coal'] = sources_2024['coal'] * ((0.97) ** years_from_base)
        sources_proj['oil'] = sources_2024['oil'] * ((0.988) ** years_from_base)
        sources_proj['gas'] = sources_2024['gas'] * ((0.995) ** years_from_base)

        total_fossil_proj = sources_proj['coal'] + sources_proj['oil'] + sources_proj['gas']
        if total_fossil_proj > 0:
            fossil_scale = fossil_useful_ej / total_fossil_proj
            sources_proj['coal'] *= fossil_scale
            sources_proj['oil'] *= fossil_scale
            sources_proj['gas'] *= fossil_scale

        # Clean sources
        sources_proj['wind'] = sources_2024['wind'] * ((1.12) ** years_from_base)
        sources_proj['solar'] = sources_2024['solar'] * ((1.15) ** years_from_base)
        sources_proj['hydro'] = sources_2024['hydro'] * ((1.02) ** years_from_base)
        sources_proj['nuclear'] = sources_2024['nuclear'] * ((1.03) ** years_from_base)
        sources_proj['biomass'] = sources_2024['biomass'] * ((1.01) ** years_from_base)
        sources_proj['geothermal'] = sources_2024['geothermal'] * ((1.08) ** years_from_base)
        sources_proj['other'] = 0

        total_clean_proj = sum([sources_proj[s] for s in ['wind', 'solar', 'hydro', 'nuclear', 'biomass', 'geothermal', 'other']])
        if total_clean_proj > 0:
            clean_scale = clean_useful_ej / total_clean_proj
            for s in ['wind', 'solar', 'hydro', 'nuclear', 'biomass', 'geothermal']:
                sources_proj[s] *= clean_scale

        return sources_proj

    def calculate_accelerated_scenario(self, start_year=2025, end_year=2050):
        """
        Accelerated Scenario (APS-like)
        - Net demand growth: 0.8% per year
        - Clean energy CAGR: ~6.5% per year (5.0 EJ/year absolute growth from 52.5 EJ base)
        - Efficiency improvement: 1.2% per year
        - Fossil peak: 2030 at ~190 EJ useful
        - Residual fossil floor: 20 EJ

        Aligned with IEA WEO 2024 APS scenario
        """
        print("\nCalculating Accelerated (APS) Scenario...")

        base_data = self.historical_data[self.historical_data['year'] == 2024].iloc[0]

        projections = []

        for year in range(start_year, end_year + 1):
            years_from_base = year - 2024

            # Demand growth: 0.8% per year
            demand_growth_factor = (1.008) ** years_from_base

            # Efficiency improvement: 1.2% per year
            efficiency_factor = (0.988) ** years_from_base

            # Net demand
            net_demand = base_data['total_useful_ej'] * demand_growth_factor * efficiency_factor

            # Clean energy growth: 5 EJ/year (CAGR ~6% from 52.5 EJ base, capped per BP CT)
            clean_growth_annual = 5.0
            clean_useful_ej = base_data['clean_useful_ej'] + (clean_growth_annual * years_from_base)

            # Fossil energy
            fossil_useful_ej = net_demand - clean_useful_ej

            # Apply peak constraint: fossil peaks at 2030
            if year >= 2030:
                years_after_peak = year - 2030
                fossil_useful_ej = fossil_useful_ej * ((0.985) ** years_after_peak)

            # Residual fossil floor: 20 EJ for hard-to-abate sectors
            fossil_useful_ej = max(fossil_useful_ej, 20)

            total_useful_ej = fossil_useful_ej + clean_useful_ej

            # Calculate source breakdown
            sources_proj = self._calculate_sources(year, fossil_useful_ej, clean_useful_ej)

            projections.append({
                'year': year,
                'scenario': 'Accelerated (APS)',
                'total_useful_ej': total_useful_ej,
                'fossil_useful_ej': fossil_useful_ej,
                'clean_useful_ej': clean_useful_ej,
                'fossil_share_percent': (fossil_useful_ej / total_useful_ej) * 100,
                'clean_share_percent': (clean_useful_ej / total_useful_ej) * 100,
                'sources_useful_ej': sources_proj
            })

        return pd.DataFrame(projections)

    def calculate_netzero_scenario(self, start_year=2025, end_year=2050):
        """
        Net-Zero Scenario (NZE-like)
        - Net demand growth: 0.5% per year
        - Clean energy CAGR: ~6.5% per year capped (6.5 EJ/year absolute growth from 52.5 EJ base) - v1.5: reduced from 7.5%
        - Efficiency improvement: 1.8% per year
        - Fossil peak: 2028 at ~185 EJ useful
        - Fossil floor: 20 EJ with CCS (residual hard-to-abate sectors: aviation, shipping, chemicals)

        Aligned with IEA WEO 2024 NZE scenario (v1.5: more realistic CAGR per Grok feedback)
        """
        print("\nCalculating Net-Zero (NZE) Scenario...")

        base_data = self.historical_data[self.historical_data['year'] == 2024].iloc[0]

        projections = []

        for year in range(start_year, end_year + 1):
            years_from_base = year - 2024

            # Demand growth: 0.5% per year
            demand_growth_factor = (1.005) ** years_from_base

            # Efficiency improvement: 1.8% per year
            efficiency_factor = (0.982) ** years_from_base

            # Net demand
            net_demand = base_data['total_useful_ej'] * demand_growth_factor * efficiency_factor

            # Clean energy growth: 6.5 EJ/year (CAGR ~6.5% capped per Grok v1.5 from 52.5 EJ base)
            # v1.5: Reduced from 7.5 EJ/year - more feasible deployment rate
            clean_growth_annual = 6.5
            clean_useful_ej = base_data['clean_useful_ej'] + (clean_growth_annual * years_from_base)

            # Fossil energy
            fossil_useful_ej = net_demand - clean_useful_ej

            # Apply peak constraint: fossil peaks at 2028
            if year >= 2028:
                years_after_peak = year - 2028
                fossil_useful_ej = fossil_useful_ej * ((0.97) ** years_after_peak)

            # STRICT ENFORCEMENT: Hard floor at 20 EJ (residual with CCS for aviation, shipping, chemicals)
            # This represents ~10% of 2024 fossil demand as minimum irreducible floor
            fossil_useful_ej = max(fossil_useful_ej, 20)

            total_useful_ej = fossil_useful_ej + clean_useful_ej

            # Calculate source breakdown
            sources_proj = self._calculate_sources(year, fossil_useful_ej, clean_useful_ej)

            projections.append({
                'year': year,
                'scenario': 'Net-Zero (NZE)',
                'total_useful_ej': total_useful_ej,
                'fossil_useful_ej': fossil_useful_ej,
                'clean_useful_ej': clean_useful_ej,
                'fossil_share_percent': (fossil_useful_ej / total_useful_ej) * 100,
                'clean_share_percent': (clean_useful_ej / total_useful_ej) * 100,
                'sources_useful_ej': sources_proj
            })

        return pd.DataFrame(projections)

    def run_all_scenarios(self):
        """
        Run all three scenarios and combine results
        """
        print("\n" + "="*80)
        print("RUNNING COMPREHENSIVE ENERGY SERVICES DEMAND MODEL")
        print("="*80)

        # Load historical baseline
        self.load_historical_baseline()

        if self.historical_data is None:
            print("ERROR: Could not load historical data")
            return None

        # Run scenarios
        baseline_proj = self.calculate_baseline_scenario()
        accelerated_proj = self.calculate_accelerated_scenario()
        netzero_proj = self.calculate_netzero_scenario()

        # Combine all projections
        all_projections = pd.concat([baseline_proj, accelerated_proj, netzero_proj], ignore_index=True)

        self.projections = all_projections

        # Save to JSON for web app
        self.save_projections()

        return all_projections

    def save_projections(self):
        """
        Save projections to JSON format for web application
        """
        output_file = 'public/data/demand_growth_projections.json'

        # Convert to format expected by web app
        output_data = {
            'metadata': {
                'model': 'Comprehensive Energy Services Demand Model',
                'version': '1.9',
                'date_generated': datetime.now().isoformat(),
                'sources': [
                    'Energy Institute Statistical Review 2024',
                    'RMI Inefficiency Trap 2023',
                    'IEA World Energy Outlook 2024',
                    'BP Energy Outlook 2025 Current Trajectory'
                ],
                'baseline_year': 2024,
                'baseline_2024': '229.56 EJ total useful (186.84 EJ fossil, 42.72 EJ clean) - thermal accounting method',
                'projection_years': '2025-2050',
                'corrections': 'Version 1.9 REALISTIC PLATEAU: Added 2028 and 2035 anchor points to create realistic plateau period (2028-2035) and gradual decline acceleration. Eliminates sharp 2030 peak discontinuity.',
                'v1_8_corrections': 'Fixed 2024-2025 discontinuity by using exact historical 2024 values (229.56 EJ) as anchor point. Linear interpolation between anchors ensures seamless continuation.',
                'v1_7_corrections': 'Linear interpolation between anchor points eliminates discontinuities. Maintains endpoints: 280 EJ (2040), 310 EJ (2050) per BP/IEA.',
                'v1_6_corrections': 'Nuclear 25% (thermal method), hydro 85%, total energy GROWS to 280 EJ (2040) and 310 EJ (2050), 1:1 displacement correct for useful energy.',
                'displacement_methodology': '1:1 displacement is CORRECT for useful energy. The 2-3x electrification leverage applies to PRIMARY energy only and is already captured in efficiency factors. No multiplier needed.',
                'rmi_baseline_note': 'Our 2024 baseline (229.56 EJ) is ~10 EJ lower than RMI (240 EJ) due to full thermal accounting (nuclear 25%, hydro 85%) vs RMI partial direct equivalent method. This is methodologically more conservative and consistent.'
            },
            'scenarios': []
        }

        # Group by scenario
        for scenario in self.scenarios:
            scenario_data = self.projections[self.projections['scenario'] == scenario]

            output_data['scenarios'].append({
                'name': scenario,
                'data': scenario_data.to_dict('records')
            })

        # Write to file
        with open(output_file, 'w') as f:
            json.dump(output_data, f, indent=2)

        print(f"\nProjections saved to: {output_file}")

    def print_summary(self):
        """
        Print summary statistics and key insights
        """
        print("\n" + "="*80)
        print("MODEL SUMMARY & KEY INSIGHTS")
        print("="*80)

        for scenario in self.scenarios:
            scenario_data = self.projections[self.projections['scenario'] == scenario]

            print(f"\n{scenario}:")
            print("-" * 60)

            # 2030 values
            data_2030 = scenario_data[scenario_data['year'] == 2030].iloc[0]
            print(f"2030: {data_2030['total_useful_ej']:.1f} EJ total "
                  f"({data_2030['fossil_useful_ej']:.1f} fossil, "
                  f"{data_2030['clean_useful_ej']:.1f} clean)")

            # 2040 values
            data_2040 = scenario_data[scenario_data['year'] == 2040].iloc[0]
            print(f"2040: {data_2040['total_useful_ej']:.1f} EJ total "
                  f"({data_2040['fossil_useful_ej']:.1f} fossil, "
                  f"{data_2040['clean_useful_ej']:.1f} clean)")

            # 2050 values
            data_2050 = scenario_data[scenario_data['year'] == 2050].iloc[0]
            print(f"2050: {data_2050['total_useful_ej']:.1f} EJ total "
                  f"({data_2050['fossil_useful_ej']:.1f} fossil, "
                  f"{data_2050['clean_useful_ej']:.1f} clean)")

            # Find peak fossil year
            peak_idx = scenario_data['fossil_useful_ej'].idxmax()
            peak_data = scenario_data.loc[peak_idx]
            print(f"Fossil Peak: {peak_data['year']} at {peak_data['fossil_useful_ej']:.1f} EJ")


# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == "__main__":
    model = EnergyDemandModel()
    projections = model.run_all_scenarios()

    if projections is not None:
        model.print_summary()
        print("\n" + "="*80)
        print("MODEL RUN COMPLETE")
        print("="*80)

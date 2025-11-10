"""
SIMPLE CAGR-BASED ENERGY DEMAND MODEL v3.0
====================================================

METHODOLOGY:
- Historical CAGRs from 2010-2024 data
- Pure exponential extrapolation (no complex anchors)
- Single policy adjustment: Fossil peak 2030, then -1.5%/year decline
- Clean energy continues historical 3.22%/year growth
- Smooth by construction (exponential functions)

NO arbitrary anchors, NO discontinuities, NO complex modeling
Just: Value(t) = Value(2024) × (1 + CAGR)^(t - 2024)
"""

import json
import pandas as pd
from datetime import datetime

class SimpleCagrModel:
    def __init__(self):
        self.base_year = 2024

        # Load calculated historical CAGRs
        with open('calculated_cagrs.json', 'r') as f:
            cagrs = json.load(f)

        self.total_cagr = cagrs['total']  # +1.564%/year
        self.fossil_cagr_historical = cagrs['fossil']  # +1.236%/year
        self.clean_cagr = cagrs['clean']  # +3.220%/year
        self.source_cagrs = cagrs['sources']

        # Load 2024 baseline
        with open('global-energy-tracker/public/data/useful_energy_timeseries.json', 'r') as f:
            historical = json.load(f)
            self.baseline_2024 = next(d for d in historical['data'] if d['year'] == 2024)

        print("Simple CAGR Model Initialized")
        print("=" * 80)
        print(f"Base Year: {self.base_year}")
        print(f"Total useful energy (2024): {self.baseline_2024['total_useful_ej']:.2f} EJ")
        print()
        print("Historical CAGRs (2010-2024):")
        print(f"  Total: {self.total_cagr*100:+.3f}%/year")
        print(f"  Fossil: {self.fossil_cagr_historical*100:+.3f}%/year")
        print(f"  Clean: {self.clean_cagr*100:+.3f}%/year")
        print()

    def calculate_baseline_scenario(self, start_year=2025, end_year=2050):
        """
        Baseline scenario with SINGLE policy adjustment:
        - Fossil energy: Grow at historical CAGR until 2030, then decline at -1.5%/year
        - Clean energy: Continue historical 3.22%/year growth
        - Total: Sum of fossil + clean (no separate total CAGR)

        This creates smooth exponential curves with ONE inflection point at 2030
        """
        print("\nCalculating Baseline (STEPS-like) Scenario...")
        print("-" * 80)

        # 2024 baseline values
        total_2024 = self.baseline_2024['total_useful_ej']
        fossil_2024 = self.baseline_2024['fossil_useful_ej']
        clean_2024 = self.baseline_2024['clean_useful_ej']
        sources_2024 = self.baseline_2024['sources_useful_ej']

        # Policy assumption: Fossil decline post-2030
        fossil_peak_year = 2030
        fossil_decline_rate = -0.015  # -1.5%/year post-peak (IEA STEPS-like)

        projections = []

        for year in range(start_year, end_year + 1):
            years_from_base = year - self.base_year

            # CLEAN ENERGY: Simple exponential growth
            clean_useful = clean_2024 * ((1 + self.clean_cagr) ** years_from_base)

            # FOSSIL ENERGY: Grow until 2030, then decline
            if year <= fossil_peak_year:
                # Pre-peak: historical growth rate
                years_to_peak = year - self.base_year
                fossil_useful = fossil_2024 * ((1 + self.fossil_cagr_historical) ** years_to_peak)
            else:
                # Post-peak: decline from peak value
                # Calculate peak value first
                years_to_peak = fossil_peak_year - self.base_year
                fossil_peak = fossil_2024 * ((1 + self.fossil_cagr_historical) ** years_to_peak)

                # Decline from peak
                years_past_peak = year - fossil_peak_year
                fossil_useful = fossil_peak * ((1 + fossil_decline_rate) ** years_past_peak)

            # TOTAL: Sum of components
            total_useful = fossil_useful + clean_useful

            # SOURCES: Allocate proportionally based on historical CAGRs
            sources_useful = {}
            for source, cagr in self.source_cagrs.items():
                base_value = sources_2024.get(source, 0)

                # Apply source-specific CAGR
                if base_value > 0:
                    sources_useful[source] = base_value * ((1 + cagr) ** years_from_base)
                else:
                    sources_useful[source] = 0.0

            # NORMALIZE: Scale sources to match fossil/clean totals
            # Calculate current fossil/clean from sources
            fossil_sources = ['coal', 'oil', 'gas']
            clean_sources = ['nuclear', 'hydro', 'wind', 'solar', 'geothermal']
            biomass_source = ['biomass']  # Count as clean

            current_fossil = sum(sources_useful.get(s, 0) for s in fossil_sources)
            current_clean = sum(sources_useful.get(s, 0) for s in clean_sources + biomass_source)

            # Scale to match targets
            if current_fossil > 0:
                fossil_scale = fossil_useful / current_fossil
                for s in fossil_sources:
                    sources_useful[s] *= fossil_scale

            if current_clean > 0:
                clean_scale = clean_useful / current_clean
                for s in clean_sources + biomass_source:
                    sources_useful[s] *= clean_scale

            # Store projection
            projections.append({
                'year': year,
                'scenario': 'Baseline (STEPS)',
                'total_useful_ej': total_useful,
                'fossil_useful_ej': fossil_useful,
                'clean_useful_ej': clean_useful,
                'fossil_share_percent': (fossil_useful / total_useful) * 100,
                'clean_share_percent': (clean_useful / total_useful) * 100,
                'sources_useful_ej': sources_useful
            })

        self.baseline_projections = projections

        # Print summary
        print()
        print("Baseline Scenario Summary:")
        for year in [2030, 2040, 2050]:
            proj = next(p for p in projections if p['year'] == year)
            print(f"  {year}: {proj['total_useful_ej']:.1f} EJ " +
                  f"({proj['fossil_useful_ej']:.1f} fossil, {proj['clean_useful_ej']:.1f} clean) " +
                  f"- {proj['fossil_share_percent']:.1f}% fossil")

        # Find fossil peak
        peak_proj = max(projections, key=lambda p: p['fossil_useful_ej'])
        print(f"\n  Fossil peak: {peak_proj['year']} at {peak_proj['fossil_useful_ej']:.1f} EJ")

        return pd.DataFrame(projections)

    def save_projections(self):
        """Save to JSON for web app"""
        output_file = 'global-energy-tracker/public/data/demand_growth_projections.json'

        output_data = {
            'metadata': {
                'model': 'Simple CAGR Extrapolation Model',
                'version': '3.0',
                'date_generated': datetime.now().isoformat(),
                'sources': [
                    'Historical data CAGR (2010-2024)',
                    'Fossil peak assumption (2030)',
                    'IEA STEPS decline rate (-1.5%/yr post-peak)'
                ],
                'baseline_year': 2024,
                'baseline_2024': f"{self.baseline_2024['total_useful_ej']:.2f} EJ total " +
                                f"({self.baseline_2024['fossil_useful_ej']:.2f} fossil, " +
                                f"{self.baseline_2024['clean_useful_ej']:.2f} clean)",
                'projection_years': '2025-2050',
                'method': 'Pure exponential CAGR extrapolation with single policy adjustment (fossil peak 2030)',
                'cagrs': {
                    'total_historical': f"{self.total_cagr*100:.3f}%/year",
                    'fossil_pre_peak': f"{self.fossil_cagr_historical*100:.3f}%/year",
                    'fossil_post_peak': '-1.500%/year',
                    'clean': f"{self.clean_cagr*100:.3f}%/year"
                }
            },
            'scenarios': []
        }

        # Add baseline scenario
        scenario_data = {
            'name': 'Baseline (STEPS)',
            'description': 'Simple CAGR extrapolation from 2010-2024 trends with fossil peak at 2030',
            'data': self.baseline_projections
        }
        output_data['scenarios'].append(scenario_data)

        # Save
        with open(output_file, 'w') as f:
            json.dump(output_data, f, indent=2)

        print(f"\nProjections saved to: {output_file}")

if __name__ == "__main__":
    print("=" * 80)
    print("SIMPLE CAGR-BASED ENERGY DEMAND FORECAST")
    print("=" * 80)
    print()

    model = SimpleCagrModel()
    projections_df = model.calculate_baseline_scenario()

    model.save_projections()

    print()
    print("=" * 80)
    print("MODEL COMPLETE - Smooth exponential curves guaranteed")
    print("=" * 80)

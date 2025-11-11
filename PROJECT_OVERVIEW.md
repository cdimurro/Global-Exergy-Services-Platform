# Global Energy Services Tracker - Project Overview

## Purpose of This Document

This document provides a comprehensive overview of the Global Energy Services Tracker project for review and validation. It explains:
1. **What the project does** and why it matters
2. **How the methodology works** and why it's different from conventional energy analysis
3. **How to interpret the companion DATA_AND_ASSUMPTIONS.md** document
4. **What to validate** before publishing

The companion document (DATA_AND_ASSUMPTIONS.md) contains all the specific numbers, efficiency factors, data sources, and calculations that power this analysis.

---

## Executive Summary

The Global Energy Services Tracker is a data visualization platform that reveals the **true state of the global energy transition** by measuring what actually matters: **useful energy services** delivered to end users, not just primary energy production.

### The Core Insight

Most energy analysis focuses on **primary energy** (total energy extracted from sources like coal, oil, wind, etc.). But this misses a critical fact: **fossil fuels waste 60-70% of their energy as heat**, while clean energy sources are 75-85% efficient.

When we measure **useful energy services** (the actual work/heat/light delivered after accounting for conversion losses), the energy transition looks dramatically different:
- **Fossil fuel dominance persists** - despite inherent inefficiency, fossils still provide 81.4% of global useful energy services (2024: 186.84 EJ of 229.56 EJ total)
- **Clean energy's efficiency advantage is masked** by primary energy accounting, which overstates fossil input (2024: clean sources provide 42.72 EJ, 18.6% of total)
- **Demand growth is accelerating**, requiring even more clean energy deployment to offset fossil use
- **Interactive visualizations with fullscreen mode** - maximize any of 12 charts for detailed analysis, with PNG/CSV export capabilities

**Understanding the Primary Energy Fallacy**: Primary energy accounting overstates fossil fuel input because it counts all the energy that gets wasted as heat. When measuring useful energy services delivered, clean energy's efficiency advantage becomes clear - a unit of clean electricity delivers far more useful work than a unit of fossil fuel. However, this doesn't mean fossils are less dominant in absolute terms; it means they require more primary input to deliver the same services.

This platform provides the first comprehensive, public-facing visualization of this reality.

---

## Project Architecture

### Technology Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Data Visualization**: Recharts library
- **Data Pipeline**: Python scripts processing OWID (Our World in Data) datasets
- **Data Format**: JSON files generated from OWID primary energy consumption data
- **Deployment**: Static site (ready for hosting on Vercel, Netlify, etc.)

### File Structure
```
global-energy-tracker/
├── src/
│   ├── pages/           # 8 main pages (Home, Displacement, Energy Supply, etc.)
│   ├── components/      # Reusable chart components
│   └── utils/           # Color schemes, export utilities
├── public/data/         # Generated JSON data files
├── data-pipeline/       # Python scripts to process OWID data
└── PROJECT_OVERVIEW.md + DATA_AND_ASSUMPTIONS.md
```

### Interactive Visualization Features (v1.3)

- **Fullscreen Mode**: All 12 Recharts visualizations support fullscreen viewing for enhanced data exploration
- **Export Capabilities**: PNG image export and CSV data download available for all charts
- **Responsive Design**: Charts adapt to mobile (400-500px), tablet (600-700px), desktop (750-850px) screen sizes
- **Keyboard Support**: Press Escape to exit fullscreen mode
- **User Controls**: All interactive filters and controls remain functional in fullscreen mode

---

## Core Methodology: Useful Energy Services

### The Problem with Primary Energy Accounting

**Primary energy** is the total energy extracted from sources before any conversion or use. This is what most energy statistics report.

**Example**: A coal power plant might burn 100 EJ of coal (primary energy), but only deliver 32 EJ of electricity to homes (useful energy), with 68 EJ lost as waste heat.

**Why this matters**:
- Fossil fuels average 30-35% efficiency (coal/oil) to 50% (natural gas)
- Clean electricity sources average 90% efficiency (wind, solar, nuclear, hydro)
- This creates a massive distortion in how we perceive the energy transition

### Our Approach: Useful Energy Calculation

We convert all primary energy to **useful energy services** using source-specific efficiency factors:

**Useful Energy = Primary Energy × Efficiency Factor**

### Regional Analysis (New Feature)

The platform now includes comprehensive regional analysis showing:
- **Regional energy consumption** in useful energy terms (measured in **petajoules - PJ**)
- **Clean energy adoption rates** by region
- **Efficiency differences** between developed and developing economies
- **Regional energy mix evolution** over time (1965-2024)

**Important Unit Note**: Regional data is stored in **petajoules (PJ)** rather than exajoules (EJ):
- 1 EJ = 1,000 PJ
- Example: United States = 12,538 PJ = 12.5 EJ
- This provides more granular precision for country-level analysis

---

## Key Metrics and Calculations

### 1. Displacement Rate

**Definition**: The percentage of new clean energy that actually displaces fossil fuel consumption (vs. just meeting new demand growth).

**Formula**:
```
Displacement Rate = (ΔFossil Useful Energy / ΔClean Useful Energy) × 100
```

Where:
- ΔFossil = Change in fossil fuel useful energy (negative if declining)
- ΔClean = Change in clean energy useful energy (positive if growing)

**Interpretation**:
- **100%**: Every unit of new clean energy displaces 1 unit of fossil fuels (perfect displacement)
- **50%**: Half goes to displacement, half meets new demand
- **0%**: All new clean energy just meets demand growth, no displacement
- **Negative**: Fossil fuels are still growing despite clean energy additions

**Historical Reality**: The 10-year average displacement rate (2014-2024) is approximately **28%**, meaning 72% of new clean energy just meets demand growth.

### 2. Clean Energy Share

**Definition**: The percentage of total useful energy services provided by clean sources.

**Formula**:
```
Clean Share = (Clean Useful Energy / Total Useful Energy) × 100
```

**Current Status (2024)**: **18.6%** (42.72 EJ clean / 229.56 EJ total) globally in useful energy terms.

### 3. Efficiency Factor

**Definition**: The percentage of primary energy that becomes useful energy after conversion losses.

**Example Factors** (see DATA_AND_ASSUMPTIONS.md for complete list):
- Coal: 32% (thermal power plants + conversion losses)
- Oil: 30% (internal combustion engines, refining losses)
- Natural Gas: 50% (combined cycle plants, heating)
- Nuclear: 90% (modern reactors, minimal transmission loss)
- Wind/Solar: 90% (direct electricity, minimal conversion)

### 4. Regional Metrics

**Clean Energy Share by Region**: Percentage of a region's total energy services from clean sources

**Overall Efficiency by Region**: Weighted average efficiency of a region's energy mix

**Total Energy Services**: Total useful energy delivered to end users in a region (in PJ)

### 5. 2024 Global Energy Services Breakdown (Exact Values)

**Total Useful Energy: 229.56 EJ**

**Fossil Fuels: 186.84 EJ (81.4%)**
- Gas: 74.30 EJ (32.4%)
- Oil: 59.72 EJ (26.0%)
- Coal: 52.82 EJ (23.0%)

**Clean Energy: 42.72 EJ (18.6%)**
- Biomass: 13.98 EJ (6.1%)
- Hydro: 13.52 EJ (5.9%)
- Wind: 6.74 EJ (2.9%)
- Solar: 5.75 EJ (2.5%)
- Nuclear: 2.49 EJ (1.1%)
- Geothermal: 0.24 EJ (0.1%)

---

## Data Sources

### Primary Data Source: Our World in Data (OWID)
- **Dataset**: Energy Data Explorer (owid-energy-data)
- **Coverage**: 1900-2024 (we focus on 1965-2024 for completeness)
- **Sources**: OWID compiles data from:
  - BP Statistical Review of World Energy
  - Energy Institute Statistical Review (2024)
  - International Energy Agency (IEA)
  - Ember Climate Data

### Why OWID?
- **Authoritative**: Combines multiple trusted energy sources
- **Open**: Publicly available, regularly updated
- **Comprehensive**: Global coverage, all energy sources
- **Validated**: Cross-checked against multiple international databases

### Supplementary Sources for Validation
- **IEA World Energy Outlook (WEO) 2024**: Demand growth projections and scenario modeling
- **IEA Energy Efficiency Indicators (EEI) 2024**: Efficiency factors and conversion rates
- **IEA World Energy Model (WEM)**: Regional energy data and efficiency variations

### Data Pipeline
1. **Download**: Python script fetches latest OWID energy dataset
2. **Process**: Apply efficiency factors to convert primary → useful energy
3. **Calculate**: Compute displacement rates, shares, growth rates
4. **Export**: Generate JSON files for web visualization
5. **Regional Processing**: Calculate country and regional aggregates in PJ
6. **Quality Assurance**: All charts display 1965-2024 data consistently
7. **Tooltip Accuracy**: Percentages calculated against actual region totals, not chart totals

---

## Page-by-Page Explanation

### 1. Home Page
- **Purpose**: High-level snapshot of global energy transition
- **Key Metrics**:
  - 2024 total useful energy (229.56 EJ)
  - Current clean share (18.6%, 42.72 EJ)
  - Fossil share (81.4%, 186.84 EJ)
- **Visualization**: Interactive energy services explorer showing historical trends
- **Fullscreen Features**:
  - Maximize chart for detailed analysis
  - Export to PNG or download data as CSV
  - Responsive chart height: 500px (mobile), 700px (tablet), 850px (desktop)

### 2. Displacement Analysis
- **Purpose**: Track how much clean energy actually displaces fossil fuels
- **Key Charts**:
  - Fossil Fuel Displacement Tracker (2024) - annual displacement rates
  - Historical Displacement & Net Change Timeline - fossil vs clean growth
  - Displacement by Source Analysis - which clean sources displace which fossil fuels
- **Fullscreen Features**: All 3 charts support fullscreen mode with PNG/CSV export
- **Responsive Heights**:
  - Displacement Tracker: 450px (mobile), 650px (tablet), 800px (desktop)
  - Timeline & Source Analysis: 400px (mobile), 600px (tablet), 750px (desktop)

### 3. Energy Supply
- **Purpose**: Compare total energy supply vs useful energy delivery
- **Key Insight**: Shows massive waste from fossil fuel inefficiency
- **Charts**:
  - Wasted Energy Over Time by Source (1965-2024)
  - Global Energy System Efficiency Over Time
  - Primary vs. Useful Energy by Source (2024 snapshot)
- **Fullscreen Features**: All 3 charts support fullscreen mode with PNG/CSV export
- **Responsive Heights**:
  - Simple charts (Efficiency Timeline, 2024 Snapshot): 500px (mobile), 700px (tablet), 850px (desktop)
  - Moderate controls (Wasted Energy): 450px (mobile), 650px (tablet), 800px (desktop)

### 4. Demand Growth
- **Purpose**: Show how rapid demand growth undermines displacement
- **Key Charts** (displayed in order):
  1. Sectoral Energy Growth (Transport, Industry, Buildings) - **at top of page**
  2. Total Useful Energy Demand Projections (Baseline, Accelerated, Net Zero)
  3. Fossil vs. Clean Energy Mix by Scenario (stacked area chart)
- **Key Insight**: Sectoral breakdown shows where energy demand is growing fastest
- **Fullscreen Features**: All 2 charts (Sectoral Growth & Demand Projections) support fullscreen mode with PNG/CSV export
- **Note**: The scenario mix chart is embedded in explanatory text, not a standalone fullscreen chart
- **Responsive Heights**: 450px (mobile), 650px (tablet), 800px (desktop) for interactive scenario charts

### 5. Regions
- **Purpose**: Analyze energy transition progress by geography
- **Key Features**:
  - **Dual View Modes**: Switch between "Compare Regions" and "Compare Energy Sources"
  - Compare multiple regions or energy sources
  - Regional energy mix evolution (1965-2024 only - filtered from full dataset)
  - Clean energy adoption and efficiency rankings
  - **Unit**: All values displayed in **petajoules (PJ)** for precision
  - **Accurate Tooltips**: Percentages show actual share of each country's total energy mix
- **Key Charts**:
  1. **Regional Energy Services Over Time** (line chart with dual modes)
     - "Compare Regions" mode: Multiple regions, single energy source
     - "Compare Energy Sources" mode: Single region, multiple sources
     - Quick filters: All Sources, Fossil Fuels, Clean Energy
     - Tooltips show correct percentage of each region's total energy
  2. **Regional Clean Energy & Efficiency Comparison 2024** (bar chart)
     - Shows clean share % and overall efficiency % for all regions
  3. **Regional Energy Mix Evolution** (stacked area chart, 1965-2024)
     - Shows how a selected region's energy mix evolved over time
     - All energy sources displayed as stacked areas
- **Fullscreen Features**: All 3 charts support fullscreen mode with PNG/CSV export
- **Responsive Heights**:
  - Regional Energy Services (dual modes): 400px (mobile), 600px (tablet), 750px (desktop) - complex controls
  - Clean Energy Comparison: 500px (mobile), 700px (tablet), 850px (desktop) - simple chart
  - Energy Mix Evolution: 450px (mobile), 650px (tablet), 800px (desktop) - moderate controls

### 6. Parameter Status
- **Purpose**: Year-by-year breakdown of all key metrics
- **Format**: Interactive table with annual data (1965-2024)
- **Metrics**: Total energy, clean share, fossil share, displacement rate, etc.

### 7. Reality Check
- **Purpose**: Confront uncomfortable truths about the energy transition
- **Content**: Analytical essay explaining why transition is slower than portrayed

### 8. Methodology
- **Purpose**: Explain the useful energy methodology in depth
- **Content**: Technical documentation of calculations and assumptions

---

## Interactive Features (v1.3)

### Fullscreen Visualization Mode

All 12 Recharts visualizations across the platform now support fullscreen viewing for detailed analysis:

**How to Use**:
- Click the fullscreen button (expand icon) in the top-right corner of any chart
- Press **Escape** key or click the **X** button to exit fullscreen
- All interactive controls remain functional in fullscreen mode
- Export buttons (PNG/CSV) available in fullscreen mode

**Chart List with Fullscreen**:
1. **Home Page**: Interactive Energy Services Explorer
2. **Displacement Page**:
   - Fossil Fuel Displacement Tracker (2024)
   - Historical Displacement & Net Change Timeline
   - Displacement by Source Analysis
3. **Energy Supply Page** (3 charts):
   - Wasted Energy Over Time by Source
   - Global Energy System Efficiency Over Time
   - Primary vs. Useful Energy by Source (2024)
4. **Demand Growth Page** (2 charts):
   - Sectoral Energy Growth (Transport, Industry, Buildings)
   - Total Useful Energy Demand Projections
5. **Regions Page** (3 charts):
   - Regional Energy Services Over Time (dual view modes)
   - Regional Clean Energy & Efficiency Comparison (2024)
   - Regional Energy Mix Evolution

### Responsive Chart Heights

Charts are optimized for different screen sizes and control complexity:

**Simple Charts** (no interactive controls):
- Mobile: 500px | Tablet: 700px | Desktop: 850px
- Examples: Global Efficiency Timeline, Regional Comparison Bar Chart

**Moderate Controls** (1-2 filters):
- Mobile: 450px | Tablet: 650px | Desktop: 800px
- Examples: Scenario-based projections, single dropdown filters

**Complex Controls** (multiple filters/toggles):
- Mobile: 400px | Tablet: 600px | Desktop: 750px
- Examples: Regional dual-view mode, source selection matrices

### Export Capabilities

**PNG Image Export**:
- Downloads chart as high-resolution PNG image
- Includes all visible data, labels, and legends
- Filename format: `chart-name-YYYY-MM-DD.png`

**CSV Data Export**:
- Downloads underlying chart data in CSV format
- Includes all data points, not just visible range
- Easy import into Excel, Python, R for further analysis
- Filename format: `chart-name-YYYY-MM-DD.csv`

---

## How to Interpret DATA_AND_ASSUMPTIONS.md

The companion document contains all the numerical values and assumptions used in this analysis. When reviewing it, validate:

### 1. Efficiency Factors
- **Question**: Are the conversion efficiency percentages reasonable?
- **Check**: Compare to academic literature, IEA reports, engineering handbooks
- **Key Concern**: These are the most critical assumptions driving the analysis

### 2. Data Sources
- **Question**: Is OWID a credible source? Are there better alternatives?
- **Check**: Cross-reference key values (2024 totals) with IEA, BP, EIA reports
- **Key Concern**: Data quality determines output quality

### 3. Calculation Methodology
- **Question**: Are the formulas mathematically sound?
- **Check**: Work through examples manually
- **Key Concern**: Errors in calculation logic would invalidate all results

### 4. Time Periods
- **Question**: Is 1965-2024 the right period? Should we use different windows?
- **Check**: Consider data availability and historical relevance
- **Key Concern**: Period selection affects displacement rate calculations

### 5. Regional Data Accuracy
- **Question**: Are regional aggregations and country assignments correct?
- **Check**: Verify that regions match OWID's standard definitions
- **Key Concern**:
  - Data is in **petajoules (PJ)**, not exajoules
  - 1 EJ = 1,000 PJ
  - U.S. showing ~12,538 PJ = ~12.5 EJ is correct
  - Global total ~229,600 PJ = ~229.6 EJ matches home page

---

## What to Validate Before Publishing

### Critical Validations

1. **Efficiency Factors**
   - [ ] Are the percentages within accepted ranges for each technology?
   - [ ] Do they reflect real-world performance (not theoretical maximums)?
   - [ ] Are they consistent with peer-reviewed literature?

2. **Key Results Cross-Check**
   - [ ] Does 2024 global useful energy (229.56 EJ) seem reasonable?
   - [ ] Does 18.6% clean share (42.72 EJ) match rough calculations from other sources?
   - [ ] Do displacement rates (~28% 10-year average) align with observable trends?
   - [ ] Do regional totals sum correctly to global totals? (229.56 EJ)
   - [ ] Are regional values in correct units (PJ, not EJ)?
   - [ ] Does fossil breakdown match: Gas (74.30 EJ), Oil (59.72 EJ), Coal (52.82 EJ)?

3. **Data Integrity**
   - [ ] Can we trace all numbers back to OWID source data?
   - [ ] Are there any obvious outliers or anomalies in the timeseries?
   - [ ] Do trends match known historical events (oil crises, renewables boom, etc.)?

4. **Methodology Soundness**
   - [ ] Is the useful energy concept correctly applied?
   - [ ] Are displacement calculations logically valid?
   - [ ] Are we comparing apples-to-apples (useful vs useful, not primary vs useful)?

5. **Communication Clarity**
   - [ ] Would an informed energy expert understand the methodology?
   - [ ] Are we making claims we can support with data?
   - [ ] Are we being intellectually honest about limitations and uncertainties?

### Secondary Validations

6. **User Interface**
   - [x] Are charts clearly labeled and easy to interpret?
   - [x] Do tooltips show correct units (EJ for global, PJ for regional)?
   - [x] Do tooltips show accurate percentages (share of region's total, not chart total)?
   - [x] Is the color scheme consistent and accessible?
   - [x] Are date ranges consistent across charts (1965-2024)?

7. **Data Accuracy**
   - [ ] Do export functions (CSV/PNG) work correctly?
   - [ ] Are all data points traceable to source files?

8. **Performance**
   - [ ] Does the site load quickly?
   - [ ] Do interactive charts respond smoothly?

---

## Known Limitations and Uncertainties

### 1. Efficiency Factor Precision
**Issue**: Efficiency factors are simplified averages that vary by:
- Geographic region (power plant quality, grid infrastructure)
- Time period (technology improvements)
- Specific use case (industrial vs residential)

**Impact**: Results are directionally correct but shouldn't be treated as precise to the decimal point.

**Mitigation**: We use conservative, peer-reviewed estimates and clearly document assumptions.

### 2. Data Lag
**Issue**: OWID data has a ~1 year lag. "2024" data is often preliminary.

**Impact**: Most recent year may be subject to revision.

**Mitigation**: We clearly indicate data sources and update regularly.

### 3. Regional Boundary Changes
**Issue**: Country borders and economic groupings change over time (e.g., EU expansion).

**Impact**: Long-term regional comparisons may not be perfectly consistent.

**Mitigation**: We use OWID's standardized definitions which handle this reasonably well.

### 4. "Useful Energy" Definition
**Issue**: What counts as "useful" is somewhat subjective. Different methodologies exist.

**Impact**: Our numbers won't exactly match other useful energy analyses.

**Mitigation**: We clearly explain our methodology and efficiency assumptions.

### 5. Energy Efficiency Rebound Effects
**Issue**: Efficiency improvements often lead to increased energy consumption (Jevons Paradox). IEA estimates rebound effects of 5-10% for most efficiency gains.

**Impact**: Energy demand growth may be slightly higher than projected due to behavioral responses to efficiency improvements.

**Mitigation**: Our demand growth projections implicitly include historical rebound effects. IEA WEO 2024 scenarios account for rebound in their modeling.

**Example**: More efficient vehicles may lead to more driving; better insulation may lead to higher thermostat settings.

### 6. Regional Efficiency Variations
**Issue**: Efficiency factors vary significantly by region due to technology quality, infrastructure age, and regulatory standards.

**Impact**: Using global average efficiency factors (coal: 32%, oil: 30%, gas: 50%) masks regional differences.

**Mitigation**: We document this limitation and note that regional comparisons should be interpreted with caution.

**Examples of Regional Variation**:
- **China coal plants**: ~40% efficient (newer fleet) vs. global average 32%
- **U.S. natural gas**: ~52% efficient (high CCGT penetration) vs. global 50%
- **Developed economies**: Overall efficiency ~48-50% vs. developing economies ~38-42%
- **Source**: IEA Energy Efficiency Indicators (EEI) 2024

### 7. Mobile Fullscreen Performance

**Issue**: On small screens (<640px), fullscreen charts may still require some scrolling for charts with many controls.

**Impact**: User experience on mobile devices is slightly constrained by screen size limitations.

**Mitigation**: Charts prioritize showing the visualization itself; controls are accessible via scrolling. Desktop/tablet experience is optimal.

---

## Success Criteria

This project succeeds if:

1. **Accuracy**: All data and calculations can be independently verified
2. **Clarity**: An informed reader can understand the methodology and reproduce results
3. **Impact**: The visualization changes how people understand the energy transition
4. **Honesty**: We present uncomfortable truths without exaggeration or cherry-picking
5. **Usability**: Charts are intuitive and insights are actionable
6. **Interactivity**: Visualizations are explorable, with fullscreen mode enhancing detailed analysis

---

## Questions for Grok to Answer

After reviewing both this document and DATA_AND_ASSUMPTIONS.md, please provide feedback on:

1. **Efficiency Factors**: Are the values reasonable and well-supported? Do they reflect real-world performance?
2. **Methodology**: Is the useful energy approach sound? Any obvious flaws in the calculations?
3. **Data Quality**: Is OWID sufficient, or should we incorporate additional sources?
4. **Calculations**: Any mathematical errors in formulas or implementations?
5. **Regional Analysis**: Are regional units (PJ) and conversions correct?
6. **Key Results**: Do the headline numbers (~230 EJ total, ~16-18% clean, ~28% displacement) pass the smell test?
7. **Presentation**: Are we being intellectually honest? Any claims that overreach the data?
8. **Missing Pieces**: What important factors or caveats are we overlooking?
9. **Publication Readiness**: What must be fixed before this goes public?
10. **Regional Data Validation**: Are regional totals in PJ correctly summing to global totals in EJ?
11. **Tooltip Accuracy**: Do the percentage calculations in regional charts correctly show share of each country's total energy (not share of chart total)?
12. **Time Period Consistency**: Is 1965-2024 consistently applied across all relevant charts?
13. **User Experience**: Are the dual view modes (Compare Regions vs Compare Sources) intuitive and clearly labeled?

---

## Contact and Contribution

This is an open, data-driven project. If you spot errors or have suggestions:
- All data sources are public (OWID)
- All calculations are documented
- All code is transparent
- Constructive criticism is welcomed

**Goal**: Create the most accurate, honest, and useful public resource for understanding the global energy transition in useful energy terms.

---

*Document created for final validation review before public launch.*

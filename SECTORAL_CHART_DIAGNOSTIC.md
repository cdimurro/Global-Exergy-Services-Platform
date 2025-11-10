# Sectoral Energy Growth Chart - Comprehensive Diagnostic Report

**Date:** November 8, 2025
**Issue:** Chart still showing visible discontinuities despite multiple fixes
**Component:** `SectoralEnergyGrowth.jsx`

---

## 1. EXECUTIVE SUMMARY

The Sectoral Energy Growth chart is intended to show smooth energy service growth by sector from 2015-2050, but exhibits visible discontinuities at the 2024/2025 boundary across all three filter modes (All Sources, Fossil Sources, Clean Sources).

**Root Causes Identified:**
1. Sector shares originally summed to 110% instead of 100% ✓ FIXED
2. Different calculation methods for historical vs projection periods ✓ FIXED
3. Fossil intensities were systematically 8.8pp too low ✓ FIXED
4. Sharp 2030 peak in projection data ✓ FIXED (added plateau)
5. **REMAINING ISSUE:** Unknown - requires data inspection

---

## 2. DATA SOURCES & FLOW

### 2.1 Input Data Files

| File | Purpose | Key Fields |
|------|---------|------------|
| `useful_energy_timeseries.json` | Historical data (2015-2024) | `total_useful_ej`, `fossil_useful_ej`, `clean_useful_ej`, `sources_useful_ej` |
| `demand_growth_projections.json` | Projection data (2025-2050) | Same as historical + scenario variants |
| `sectoral_energy_breakdown.json` | Sector definitions | `sector_shares`, `fossil_intensity`, `growth_rates` |

### 2.2 Data Processing Pipeline

```
1. Load all three JSON files
2. Normalize sector shares (110% → 100%)
3. For each year (2015-2050):
   a. Get total useful energy from historical (≤2024) or projection (>2024)
   b. Calculate sectoral values using unified growth model
   c. Apply source filter (fossil/clean/specific source)
   d. Store in chartData array
4. Render stacked area chart
```

---

## 3. CALCULATION METHODOLOGY

### 3.1 Sector Value Calculation (Unified Method)

For ALL years, the same formula is used:

```javascript
// Step 1: Calculate base value in 2024
baseValue2024 = totalUseful2024 × normalizedShare[sector]

// Step 2: Apply sector-specific growth rate
yearsFromBaseline = year - 2024
grownValue = baseValue2024 × (1 + growthRate)^yearsFromBaseline

// Step 3: Calculate total if all sectors grew at their rates
totalGrown = Σ(baseValue2024[s] × (1 + growthRate[s])^yearsFromBaseline)

// Step 4: Scale to match actual aggregate total
sectorValue = grownValue × (actualTotal / totalGrown)
```

### 3.2 Fossil Filter Application

```javascript
// Get base fossil intensity for sector (now calibrated to 81.4% weighted avg)
baseFossilIntensity = sectoralData.fossil_intensity[sector]

// Calculate global fossil share for this year
globalFossilShare = fossilUseful / totalUseful

// Scale intensity proportionally to global trajectory
shareRatio = globalFossilShare / fossilShare2024
dynamicFossilIntensity = baseFossilIntensity × shareRatio

// Apply to sector value
fossilSectorValue = sectorValue × dynamicFossilIntensity
```

**Key Insight:** This assumes sectors decarbonize at the SAME RATE as the global average, which may not be realistic for all sectors.

---

## 4. ACTUAL DATA AT 2024/2025 BOUNDARY

### 4.1 Aggregate Energy Data

| Year | Source | Total (EJ) | Fossil (EJ) | Clean (EJ) | Fossil % |
|------|--------|-----------|-------------|------------|----------|
| 2023 | Historical | 223.98 | 183.71 | 40.27 | 82.0% |
| 2024 | Historical | 229.56 | 186.84 | 42.72 | 81.4% |
| 2025 | Projection | 235.04 | 187.59 | 47.45 | 79.8% |
| 2026 | Projection | 238.60 | 188.15 | 50.45 | 78.9% |

**Observation:** Aggregate data shows smooth transition (+5.48 EJ growth 2024→2025)

### 4.2 Sectoral Breakdown - Normalized Shares

After normalization from 110% to 100%:

| Sector | Raw Share | Normalized Share | 2024 Base Value (EJ) |
|--------|-----------|------------------|---------------------|
| transport_road | 0.145 | 0.1318 | 30.26 |
| residential_heating | 0.125 | 0.1136 | 26.08 |
| commercial_buildings | 0.105 | 0.0955 | 21.92 |
| industry_iron_steel | 0.095 | 0.0864 | 19.83 |
| residential_appliances | 0.085 | 0.0773 | 17.74 |
| industry_chemicals | 0.08 | 0.0727 | 16.69 |
| industry_cement | 0.055 | 0.05 | 11.48 |
| transport_aviation | 0.05 | 0.0455 | 10.44 |
| residential_cooling | 0.05 | 0.0455 | 10.44 |
| agriculture | 0.045 | 0.0409 | 9.39 |
| transport_shipping | 0.035 | 0.0318 | 7.30 |
| industry_pulp_paper | 0.035 | 0.0318 | 7.30 |
| industry_aluminum | 0.03 | 0.0273 | 6.27 |
| transport_rail | 0.02 | 0.0182 | 4.18 |
| other_industry | 0.145 | 0.1318 | 30.26 |
| **TOTAL** | **1.10** | **1.0000** | **229.56** ✓ |

### 4.3 Fossil Intensities (Calibrated)

After iterative calibration to match 81.4% global fossil share:

| Sector | Original | Calibrated | Change |
|--------|----------|------------|--------|
| transport_road | 92.0% | **100.0%** | +8.0pp (capped) |
| transport_aviation | 98.0% | **100.0%** | +2.0pp (capped) |
| transport_shipping | 96.0% | **100.0%** | +4.0pp (capped) |
| industry_cement | 95.0% | **100.0%** | +5.0pp (capped) |
| industry_chemicals | 88.0% | 97.8% | +9.8pp |
| industry_iron_steel | 85.0% | 94.8% | +9.8pp |
| other_industry | 78.0% | 87.8% | +9.8pp |
| residential_heating | 68.0% | 77.8% | +9.8pp |
| industry_pulp_paper | 62.0% | 71.8% | +9.8pp |
| transport_rail | 48.0% | 57.8% | +9.8pp |
| residential_cooling | 42.0% | 51.8% | +9.8pp |
| residential_appliances | 35.0% | 44.8% | +9.8pp |
| agriculture | 75.0% | 84.8% | +9.8pp |
| commercial_buildings | 55.0% | 64.8% | +9.8pp |
| industry_aluminum | 25.0% | 34.8% | +9.8pp |

**Weighted Average:** 81.39% (target: 81.39%) ✓ PERFECT MATCH

---

## 5. GROWTH RATES (Baseline Scenario)

From `sectoral_energy_breakdown.json`:

| Sector | Annual Growth Rate |
|--------|-------------------|
| residential_cooling | **+5.0%** (fastest) |
| transport_aviation | +4.0% |
| residential_appliances | +2.5% |
| commercial_buildings | +2.2% |
| transport_shipping | +2.0% |
| transport_rail | +1.8% |
| industry_chemicals | +1.8% |
| transport_road | +1.5% |
| agriculture | +1.5% |
| residential_heating | +1.2% |
| industry_aluminum | +1.2% |
| other_industry | +1.2% |
| industry_cement | +1.0% |
| industry_iron_steel | +0.8% |
| industry_pulp_paper | **+0.5%** (slowest) |

---

## 6. PROJECTION DATA TRAJECTORY

### 6.1 Baseline Scenario - Fossil Energy Path

| Year | Fossil (EJ) | YoY Change | YoY % | Phase |
|------|-------------|-----------|-------|-------|
| 2024 | 186.84 | baseline | - | Historical anchor |
| 2025 | 187.59 | +0.75 | +0.40% | Growth |
| 2026 | 188.15 | +0.56 | +0.30% | Growth |
| 2027 | 188.72 | +0.56 | +0.30% | Growth |
| 2028 | 189.28 | +0.56 | +0.30% | Approaching plateau |
| 2029 | 189.36 | +0.08 | +0.04% | **PLATEAU START** |
| 2030 | 189.44 | +0.08 | +0.04% | Plateau |
| 2031 | 189.52 | +0.08 | +0.04% | Plateau |
| 2032 | 189.61 | +0.08 | +0.04% | Plateau |
| 2033 | 189.69 | +0.08 | +0.04% | Plateau |
| 2034 | 189.77 | +0.08 | +0.04% | Plateau |
| 2035 | 189.85 | +0.08 | +0.04% | **PLATEAU END** |
| 2036 | 185.85 | -4.00 | -2.11% | Gradual decline starts |
| 2037 | 181.85 | -4.00 | -2.15% | Gradual decline |
| 2038 | 171.23 | -10.62 | -5.84% | Accelerating decline |
| 2040 | 150.00 | -10.62 | -6.61% | Rapid decline |
| 2050 | 105.00 | -4.50 | -4.11% | Continued decline |

**Key Observations:**
- Plateau period: 2029-2035 (7 years at ~189-190 EJ)
- Decline begins gently at -2.1%/year (2036-2037)
- Accelerates to -5% to -6%/year (2038-2040)
- Stabilizes at -3% to -4%/year (2041-2050)

### 6.2 Anchor Points in Projection Model

The projection model uses linear interpolation between these anchors:

| Year | Total (EJ) | Fossil (EJ) | Clean (EJ) | Notes |
|------|-----------|-------------|------------|-------|
| 2024 | 229.56 | 186.84 | 42.72 | Historical baseline |
| 2025 | 235.04 | 187.59 | 47.45 | Historical momentum continuation |
| 2028 | 245.00 | 189.28 | 55.72 | Plateau approach |
| 2035 | 267.00 | 189.85 | 77.15 | Plateau end |
| 2037 | 264.00 | 181.85 | 82.15 | Early decline |
| 2040 | 280.00 | 150.00 | 130.00 | BP/IEA anchor |
| 2050 | 310.00 | 105.00 | 205.00 | BP/IEA anchor |

---

## 7. REACT COMPONENT STRUCTURE

### 7.1 State Variables

```javascript
const [chartData, setChartData] = useState([]);
const [sourceFilter, setSourceFilter] = useState('all');
const [selectedSectors, setSelectedSectors] = useState(new Set(ALL_SECTORS));
```

### 7.2 useEffect Dependencies

```javascript
useEffect(() => {
  // Recalculates chartData when any of these change
}, [sectoralData, historicalData, projectionsData, sourceFilter]);
```

**Note:** `selectedSectors` is NOT in dependency array - sector filtering happens at render time, not calculation time.

### 7.3 Chart Rendering

Uses Recharts `<AreaChart>` with stacked areas for each sector.

---

## 8. DIAGNOSTIC TEST RESULTS

### Test 1: Sectoral Totals Match Aggregate? (Post-Calibration)

| Year | Aggregate Total | Sectoral Sum | Difference |
|------|----------------|--------------|------------|
| 2023 | 223.98 EJ | 223.98 EJ | 0.00 EJ ✓ |
| 2024 | 229.56 EJ | 229.56 EJ | 0.00 EJ ✓ |
| 2025 | 235.04 EJ | 235.04 EJ | 0.00 EJ ✓ |
| 2026 | 238.60 EJ | 238.60 EJ | 0.00 EJ ✓ |
| 2030 | 251.50 EJ | 251.50 EJ | 0.00 EJ ✓ |

**Result:** Total energy sums match perfectly.

### Test 2: Fossil Totals Match Aggregate? (Post-Calibration, Proportional Scaling)

| Year | Aggregate Fossil | Sectoral Fossil Sum | Difference |
|------|-----------------|---------------------|------------|
| 2023 | 183.71 EJ | 183.27 EJ | -0.44 EJ |
| 2024 | 186.84 EJ | 186.81 EJ | -0.03 EJ ✓ |
| 2025 | 187.59 EJ | 188.89 EJ | **+1.31 EJ** ⚠️ |
| 2026 | 188.15 EJ | 190.23 EJ | **+2.08 EJ** ⚠️ |
| 2030 | 189.44 EJ | 194.53 EJ | **+5.08 EJ** ⚠️ |

**Result:** 2024 matches well, but error grows in projection years.

**Why?** With proportional scaling, sectors decarbonize at the global rate. However, the calibrated intensities were set to match 2024 baseline. As the global fossil share drops from 81.4% (2024) to 79.8% (2025) to 75.4% (2030), the proportional scaling creates a mismatch.

---

## 9. IDENTIFIED ISSUES

### 9.1 Issue #1: Proportional Scaling Creates Over-Estimation

**Problem:** Using proportional scaling (shareRatio) with calibrated intensities causes fossil totals to exceed aggregate data in projection years.

**Example Calculation (Transport Road, 2025):**
```
Sector value (all sources): 30.90 EJ
Base fossil intensity: 100% (calibrated for 2024)
Global fossil share 2025: 79.8%
Global fossil share 2024: 81.4%
Share ratio: 79.8% / 81.4% = 0.981

Dynamic fossil intensity: 100% × 0.981 = 98.1%
Fossil sector value: 30.90 × 98.1% = 30.31 EJ

But transport is 100% fossil in reality, so this should decrease more.
```

**Root Cause:** The calibrated intensities are STATIC values for 2024, but proportional scaling assumes they should scale linearly with global share. This double-counts the decarbonization effect.

### 9.2 Issue #2: Sector-Specific Decarbonization Rates Not Modeled

**Problem:** All sectors decarbonize at the global average rate (proportional scaling), but in reality:
- Transport sectors (road, aviation, shipping) are HARDER to decarbonize
- Residential/commercial sectors are EASIER to decarbonize (electrification)

**Current Model:**
- Global fossil share drops from 81.4% → 79.8% → 75.4% (1.6pp/year initially)
- ALL sectors drop by this same percentage

**Reality:**
- Road transport: 100% fossil → maybe 95% by 2030 (slow decline)
- Residential appliances: 44.8% fossil → maybe 30% by 2030 (fast decline)

### 9.3 Issue #3: Data Source Boundary at 2024/2025

**Problem:** The code switches data sources at year 2024:
- Years ≤ 2024: Use `historicalData`
- Years > 2024: Use `projectionsData`

Even though the values are smooth, the BRANCH in the code may cause subtle rendering differences.

### 9.4 Issue #4: Possible Interpolation for Missing Years

For years between anchor points (e.g., 2029, 2031, 2032), the projection data uses linear interpolation. This creates perfectly straight lines between anchors, which may look unnatural on the chart.

---

## 10. POTENTIAL SOLUTIONS

### Option A: Use Aggregate-Constrained Allocation

Instead of bottom-up calculation (sectors → total), enforce top-down constraint:

```javascript
// Calculate sectoral fossil values that SUM to aggregate fossil total
const aggregateFossil = projYear.fossil_useful_ej;
const unconstrained = sectors.map(s => calculateFossilValue(s));
const sum = unconstrained.reduce((a,b) => a+b, 0);

// Scale all sectors proportionally to match aggregate
const constrained = unconstrained.map(v => v * (aggregateFossil / sum));
```

**Pros:** Guarantees exact match with aggregate data
**Cons:** Loses sector-specific decarbonization trajectories

### Option B: Remove Fossil/Clean Filtering, Show Total Only

Simplest solution - only show "All Sources" mode and remove fossil/clean breakdown.

**Pros:** Eliminates the mismatch problem entirely
**Cons:** Reduces analytical value of the chart

### Option C: Model Sector-Specific Decarbonization Trajectories

Add explicit decarbonization rates per sector to `sectoral_energy_breakdown.json`:

```json
"decarbonization_rates": {
  "transport_road": -0.005,      // -0.5%/year (slow)
  "residential_appliances": -0.03 // -3.0%/year (fast)
}
```

**Pros:** Most realistic modeling
**Cons:** Requires extensive research/validation

### Option D: Use Damped Scaling with Sector-Specific Factors

Reintroduce damping, but make it sector-specific:

```javascript
const dampingFactor = getSectorDampingFactor(sector);
// Transport: 0.9 (less damping, follows global closely)
// Residential: 0.3 (more damping, decarbonizes faster)
```

---

## 11. RECOMMENDED IMMEDIATE FIX

**Use aggregate-constrained allocation (Option A)** for the fossil/clean filters:

```javascript
if (sourceFilter === 'fossil' || sourceFilter === 'clean') {
  // Calculate unconstrained sectoral values
  const unconstrained = {};
  let unconstrainedSum = 0;

  Object.keys(normalizedShares).forEach(sector => {
    const value = calculateSectorValue(sector, year);
    const intensity = sourceFilter === 'fossil'
      ? sectoralData.fossil_intensity[sector]
      : (1 - sectoralData.fossil_intensity[sector]);

    unconstrained[sector] = value * intensity;
    unconstrainedSum += unconstrained[sector];
  });

  // Get aggregate target
  const aggregateTarget = sourceFilter === 'fossil'
    ? yearData.fossil_useful_ej
    : yearData.clean_useful_ej;

  // Scale to match aggregate
  const scalingFactor = aggregateTarget / unconstrainedSum;

  Object.keys(normalizedShares).forEach(sector => {
    yearData[sector] = unconstrained[sector] * scalingFactor;
  });
}
```

This ensures:
- Sectoral totals ALWAYS match aggregate data
- Smooth transitions at 2024/2025 boundary
- Maintains relative proportions between sectors

---

## 12. DATA QUALITY CONCERNS

1. **Sector shares summed to 110%** - Fixed via normalization, but indicates data entry errors
2. **Fossil intensities were 8.8pp too low** - Required calibration, suggests estimates were rough
3. **Growth rates may not sum correctly** - Haven't verified that weighted avg growth matches aggregate
4. **Sharp 2037-2038 jump** - Still a -10.62 EJ/year decline after gentle -4 EJ/year (2036-2037)

---

## 13. NEXT STEPS FOR INVESTIGATION

1. **Add console logging** to chart component to inspect actual values at 2023-2026
2. **Export chart data to CSV** to manually inspect transitions
3. **Compare rendered chart to raw data** - is this a calculation or rendering issue?
4. **Test with simplified data** - use flat growth rates to isolate the issue
5. **Check for stale state** - ensure React isn't caching old chartData

---

## 14. FILES MODIFIED IN THIS SESSION

| File | Changes | Status |
|------|---------|--------|
| `demand_growth_model.py` | Added 2028, 2035, 2037 anchors for plateau | ✓ |
| `demand_growth_projections.json` | Regenerated with plateau trajectory | ✓ |
| `sectoral_energy_breakdown.json` | Calibrated fossil intensities | ✓ |
| `SectoralEnergyGrowth.jsx` | Unified calculation, removed damping | ✓ |

---

## 15. APPENDIX: EXAMPLE SECTOR CALCULATION

**Sector:** Transport Road
**Year:** 2025

### Step-by-Step Calculation:

```
1. Normalized share: 0.1318
2. Base value 2024: 229.56 × 0.1318 = 30.26 EJ
3. Growth rate: +1.5%/year
4. Years from baseline: 2025 - 2024 = 1
5. Grown value: 30.26 × (1.015)^1 = 30.71 EJ

6. Calculate total grown (all sectors):
   - Sum of all sectors with their growth rates = 233.60 EJ

7. Actual total for 2025: 235.04 EJ

8. Scaled value: 30.71 × (235.04 / 233.60) = 30.90 EJ

9. Apply fossil filter:
   - Base fossil intensity: 100% (calibrated)
   - Global fossil share 2025: 79.8%
   - Global fossil share 2024: 81.4%
   - Share ratio: 79.8% / 81.4% = 0.981
   - Dynamic intensity: 100% × 0.981 = 98.1%
   - Fossil value: 30.90 × 98.1% = 30.31 EJ

10. Final: Transport Road (fossil only) = 30.31 EJ in 2025
```

---

**End of Diagnostic Report**

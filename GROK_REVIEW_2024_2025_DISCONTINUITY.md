# Grok Review Request: 2024-2025 Data Discontinuity in Sectoral Energy Chart

**Date:** November 8, 2025
**Project:** Global Energy Tracker - Fossil Displacement Model
**Issue:** Historical data (2024) not aligning with forecast data (2025) in sectoral energy chart

---

## 1. PROBLEM STATEMENT

### 1.1 The Issue

The "Energy Services Growth by Sector" chart shows a visible discontinuity between:
- **2024** (last year of historical data)
- **2025** (first year of forecast/projection data)

Despite fixing the aggregate total energy transition (now smooth at +5.48 EJ from 2024→2025), the **sectoral breakdown** still shows misalignment.

### 1.2 Visual Evidence

User reports: "The historical data is still not lining up correctly with the forecast."

Looking at the chart screenshot, the transition from 2024 to 2025 shows a visible "kink" or discontinuity in the stacked area chart, suggesting the sectoral proportions or absolute values change abruptly.

---

## 2. CURRENT DATA ARCHITECTURE

### 2.1 Data Sources

**Historical Data (2015-2024):**
- **File:** `global-energy-tracker/public/data/useful_energy_timeseries.json`
- **Structure:** Annual data with total useful energy and source breakdown
- **2024 Values:**
  - Total: 229.56 EJ
  - Fossil: 186.84 EJ (coal: 52.82, oil: 59.72, gas: 74.30)
  - Clean: 42.72 EJ (nuclear: 2.49, hydro: 13.52, wind: 6.74, solar: 5.75, biomass: 13.98, geothermal: 0.24)

**Projection Data (2025-2050):**
- **File:** `global-energy-tracker/public/data/demand_growth_projections.json`
- **Structure:** Three scenarios (Baseline/STEPS, Accelerated/APS, Net-Zero/NZE)
- **2025 Values (Baseline STEPS):**
  - Total: 235.04 EJ
  - Fossil: 187.59 EJ (coal: 52.19, oil: 60.10, gas: 75.31)
  - Clean: 47.45 EJ (nuclear: 2.61, hydro: 14.04, wind: 7.69, solar: 6.74, biomass: 14.38, geothermal: 0.26)
- **Growth from 2024:** +5.48 EJ (matches historical momentum ✓)

**Sectoral Data:**
- **File:** `global-energy-tracker/public/data/sectoral_energy_breakdown.json`
- **Structure:** Static 2024 sector shares and growth rates
- **Key Fields:**
  - `sector_shares`: Fixed proportions for 15 sectors (e.g., transport_road: 0.28, industry_iron_steel: 0.08)
  - `growth_rates.baseline`: Annual growth rates per sector (-1% to +3%)
  - `fossil_intensity`: Static 2024 fossil share per sector (e.g., transport_road: 0.92, residential_heating: 0.65)

### 2.2 Data Flow in Chart Component

**File:** `global-energy-tracker/src/components/SectoralEnergyGrowth.jsx` (lines 94-261)

The component combines data sources as follows:

```javascript
// Lines 120-197: Main calculation loop
for (let year = 2015; year <= 2050; year++) {
  if (year <= 2024) {
    // HISTORICAL PATH
    historicalYear = historicalData.data.find(d => d.year === year);
    totalUseful = historicalYear.total_useful_ej;

    // Calculate sectors proportionally
    sectorValue = totalUseful * sectoralData.sector_shares[sector];

  } else {
    // PROJECTION PATH (year > 2024)
    projYear = baselineScenario.data.find(d => d.year === year);
    totalUseful = projYear.total_useful_ej;

    // Apply sector-specific growth rates from 2024
    const yearsFromBaseline = year - 2024;
    const growthRate = sectoralData.growth_rates.baseline[sector];
    const baseValue2024 = totalUseful2024 * sectoralData.sector_shares[sector];
    const grownValue = baseValue2024 * Math.pow(1 + growthRate, yearsFromBaseline);

    // Scale to match total energy for this year
    sectorValue = grownValue * (totalUseful / totalGrown2024);
  }
}
```

---

## 3. ROOT CAUSE ANALYSIS

### 3.1 The Discontinuity Mechanism

**Problem:** The calculation method changes abruptly at the 2024/2025 boundary.

**For 2024 (Historical):**
```
sector_value = total_energy_2024 × sector_share
              = 229.56 EJ × 0.28 (road transport)
              = 64.28 EJ
```

**For 2025 (Projection):**
```
base_value_2024 = 229.56 × 0.28 = 64.28 EJ
grown_value_2025 = 64.28 × (1 + growth_rate)^1
scaled_value_2025 = grown_value_2025 × (total_2025 / total_grown_all_sectors)
```

**Issue:** The scaling step in 2025 causes ALL sectors to adjust simultaneously to match the new total, but:
1. The **sector shares** are static (from 2024)
2. The **growth rates** are applied from a 2024 baseline
3. The **scaling factor** recalculates the entire sectoral distribution

This creates a **recalculation discontinuity** where the sectoral mix "resets" in 2025.

### 3.2 Why This Happens

The historical data (2015-2024) has **actual sectoral values** that evolved organically over time. The sectoral shares in `sectoral_energy_breakdown.json` are **derived from 2024** but may not perfectly match the historical trajectory leading to 2024.

When we apply:
- Static 2024 shares × 2024 total = Calculated 2024 sectoral values
- These calculated values ≠ Actual historical sectoral values (if they existed)

Then in 2025:
- Apply growth rates to calculated 2024 values
- Scale to match 2025 total
- Result: Visible jump in sectoral distribution

### 3.3 Verification of the Issue

**What we need to check:**

1. **Do the 2024 sector shares × 2024 total match the chart's 2024 display?**
   - If yes: The issue is in the 2025 calculation
   - If no: The issue starts in 2024 itself

2. **What is the actual sectoral distribution in 2024 vs 2025 on the chart?**
   - Need to inspect the generated `chartData` at years 2024 and 2025
   - Compare sector proportions

3. **Is the scaling factor in 2025 causing the discontinuity?**
   - The `totalGrown2024` calculation sums all sectors with growth applied
   - Then scales to match `totalUseful` from projections
   - This could cause proportional shifts

---

## 4. CURRENT CALCULATION DETAILS

### 4.1 Sector Shares (2024 Baseline)

From `sectoral_energy_breakdown.json`:

```json
"sector_shares": {
  "transport_road": 0.28,
  "industry_iron_steel": 0.08,
  "residential_heating": 0.12,
  "industry_chemicals": 0.07,
  "commercial_buildings": 0.09,
  "residential_appliances": 0.10,
  "industry_cement": 0.04,
  "transport_aviation": 0.06,
  "agriculture": 0.05,
  "industry_aluminum": 0.02,
  "transport_shipping": 0.04,
  "industry_pulp_paper": 0.03,
  "residential_cooling": 0.04,
  "transport_rail": 0.02,
  "other_industry": 0.04
}
```

**Verification:** Sum = 1.08 (should be 1.00) ❌

**This is a data inconsistency!** The sector shares sum to 108%, not 100%.

### 4.2 Growth Rates (Baseline Scenario)

```json
"growth_rates": {
  "baseline": {
    "transport_road": 0.015,           // +1.5%/year
    "industry_iron_steel": 0.010,      // +1.0%/year
    "residential_heating": -0.005,     // -0.5%/year
    "industry_chemicals": 0.020,       // +2.0%/year
    "commercial_buildings": 0.012,     // +1.2%/year
    "residential_appliances": 0.025,   // +2.5%/year
    "industry_cement": 0.008,          // +0.8%/year
    "transport_aviation": 0.030,       // +3.0%/year (fastest)
    "agriculture": 0.015,              // +1.5%/year
    "industry_aluminum": 0.010,        // +1.0%/year
    "transport_shipping": 0.020,       // +2.0%/year
    "industry_pulp_paper": 0.005,      // +0.5%/year
    "residential_cooling": 0.035,      // +3.5%/year (fastest)
    "transport_rail": 0.015,           // +1.5%/year
    "other_industry": 0.010            // +1.0%/year
  }
}
```

### 4.3 Fossil Intensity (2024 Baseline)

```json
"fossil_intensity": {
  "transport_road": 0.92,              // 92% fossil
  "industry_iron_steel": 0.85,         // 85% fossil
  "residential_heating": 0.65,         // 65% fossil
  "industry_chemicals": 0.80,          // 80% fossil
  // ... etc
}
```

---

## 5. IDENTIFIED ISSUES

### 5.1 Data Inconsistencies

1. **Sector shares sum to 108%, not 100%**
   - This causes a normalization issue
   - May explain why scaling is needed in the first place

2. **No historical sectoral data**
   - We only have aggregate totals (2015-2024)
   - Sectoral breakdown is **assumed** from 2024 shares applied retroactively
   - This assumption may not reflect reality

3. **Static shares applied to all historical years**
   - Line 179: `sectorValue = totalUseful * baseShare;`
   - Assumes sectoral mix was constant 2015-2024
   - In reality, sectoral mix evolves (e.g., transport grew faster than industry)

### 5.2 Calculation Logic Issues

1. **Different calculation paths for ≤2024 vs >2024**
   - Historical: Simple proportional scaling
   - Projection: Growth rates + scaling factor
   - Creates inherent discontinuity at boundary

2. **Scaling factor recalculates entire distribution**
   - Lines 188-196: All sectors scaled simultaneously
   - Doesn't preserve 2024 endpoint values
   - Creates "reset" effect in 2025

3. **No interpolation between 2024 historical and 2025 projection**
   - The demand model now uses smooth interpolation (v1.8)
   - But the sectoral chart still has a hard boundary

---

## 6. PROPOSED SOLUTIONS

### 6.1 Solution A: Normalize Sector Shares to 100%

**Fix the data first:**

```javascript
// In sectoral_energy_breakdown.json or in component
const totalShares = Object.values(sectoralData.sector_shares).reduce((sum, s) => sum + s, 0);
const normalizedShares = {};
Object.keys(sectoralData.sector_shares).forEach(sector => {
  normalizedShares[sector] = sectoralData.sector_shares[sector] / totalShares;
});
```

**Impact:** Eliminates the need for complex scaling, ensures proportions are accurate.

### 6.2 Solution B: Unify Calculation Method

**Use the same calculation for all years:**

```javascript
for (let year = startYear; year <= endYear; year++) {
  // Get total energy for this year (historical or projection)
  let totalUseful;
  if (year <= 2024) {
    const historicalYear = historicalData.data.find(d => d.year === year);
    totalUseful = historicalYear.total_useful_ej;
  } else {
    const projYear = baselineScenario.data.find(d => d.year === year);
    totalUseful = projYear.total_useful_ej;
  }

  // Calculate sectors using SAME METHOD for all years
  const yearsFromBase = year - 2024;
  Object.keys(normalizedShares).forEach(sector => {
    const baseShare = normalizedShares[sector];
    const baseValue2024 = total2024 * baseShare;
    const growthRate = sectoralData.growth_rates.baseline[sector] || 0;

    // Apply growth from 2024 for ALL years (including historical)
    const grownValue = baseValue2024 * Math.pow(1 + growthRate, yearsFromBase);

    // Scale to match actual total
    yearData[sector] = grownValue * (totalUseful / total2024);
  });
}
```

**Impact:** Eliminates the calculation discontinuity, but historical years will be recalculated.

### 6.3 Solution C: Add 2024 Anchor Constraint

**Force 2025 to start from actual 2024 values:**

```javascript
// Calculate 2024 actual sectoral values
const sectors2024 = {};
Object.keys(sectoralData.sector_shares).forEach(sector => {
  sectors2024[sector] = total2024 * normalizedShares[sector];
});

// For 2025+, grow from actual 2024 values
if (year === 2025) {
  // First year of projection - anchor to 2024
  Object.keys(sectors2024).forEach(sector => {
    const growthRate = sectoralData.growth_rates.baseline[sector] || 0;
    const grownValue = sectors2024[sector] * (1 + growthRate);
    yearData[sector] = grownValue;
  });

  // Verify total matches projection total
  const calculatedTotal = Object.values(yearData).reduce((sum, v) => sum + v, 0);
  const targetTotal = projYear.total_useful_ej;
  const scaleFactor = targetTotal / calculatedTotal;

  // ONLY scale if difference > 1%
  if (Math.abs(scaleFactor - 1.0) > 0.01) {
    Object.keys(yearData).forEach(sector => {
      yearData[sector] *= scaleFactor;
    });
  }
}
```

**Impact:** Preserves 2024 endpoint, applies minimal scaling in 2025.

### 6.4 Solution D: Interpolate 2024-2025 Boundary

**Add a transition year approach:**

```javascript
if (year === 2025) {
  // Calculate what 2025 SHOULD be using historical method
  const historicalApproach = totalUseful * normalizedShares[sector];

  // Calculate what 2025 SHOULD be using projection method
  const projectionApproach = sectors2024[sector] * (1 + growthRate);

  // Blend 50/50 for smooth transition
  yearData[sector] = (historicalApproach + projectionApproach) / 2;
}
```

**Impact:** Smooths the transition but creates a "compromise" year.

---

## 7. ADDITIONAL CONTEXT

### 7.1 What the Demand Model Already Fixed

The aggregate-level model (`demand_growth_model.py` v1.8) successfully implemented:

1. **2025 anchor matching historical momentum:** +5.48 EJ growth
2. **Smooth interpolation:** Linear between 2024→2025→2030→2040→2050
3. **Source-level breakdown:** Individual energy sources (coal, oil, gas, etc.)

**Result:** The total energy line is now smooth ✓

### 7.2 What's Still Broken

The **sectoral breakdown** within that total is discontinuous because:

1. The sectoral chart component uses a different calculation method
2. Sector shares don't sum to 100%
3. No smooth transition logic at the 2024/2025 boundary

### 7.3 Impact on User Experience

**User's perspective:**
- The aggregate charts (Demand Growth page) look smooth ✓
- The sectoral chart shows a visible "kink" at 2024/2025 ✗
- This undermines credibility of the entire model
- Makes it unsuitable for presentations/publications

---

## 8. RECOMMENDED APPROACH (For Grok to Validate)

### 8.1 Immediate Fix (High Priority)

1. **Normalize sector shares to sum to 100%**
   - Either fix the JSON file directly
   - Or normalize programmatically in the component
   - This is a data quality issue that must be fixed

2. **Force 2024 sectoral values to match 2025 calculation**
   - Calculate what the 2024 sectors SHOULD be using the projection method
   - Apply that same logic to 2024
   - This creates consistency at the boundary

3. **Add logging to verify continuity**
   - Log sector values for years 2023, 2024, 2025, 2026
   - Verify year-over-year changes are smooth
   - Check that no sector has a >10% jump

### 8.2 Longer-Term Improvements (Medium Priority)

1. **Get actual historical sectoral data (2015-2024)**
   - IEA World Energy Balances has sectoral breakdowns
   - Replace the assumed constant shares with real data
   - This would eliminate the assumption-based discontinuity

2. **Implement time-varying sector shares**
   - Sectors evolve over time (electrification, efficiency gains)
   - Use interpolation between historical 2024 and projected 2050 sectoral mix
   - More realistic than constant shares

3. **Add validation checks**
   - Total of all sectors must equal total energy (within 0.1%)
   - Year-over-year sector changes should be smooth (<5% jumps)
   - Fossil intensity should decline gradually, not jump

---

## 9. QUESTIONS FOR GROK

1. **Data Quality:**
   - Is it acceptable that sector shares sum to 108%? Should we normalize?
   - How critical is it to have actual historical sectoral data vs. assumptions?

2. **Calculation Method:**
   - Which solution (A, B, C, or D) would you recommend?
   - Is there a better approach we haven't considered?

3. **Validation:**
   - What's the acceptable tolerance for discontinuity at boundaries?
   - Should we prioritize matching historical data or smooth projections?

4. **Real-World Accuracy:**
   - Are the growth rates realistic for each sector?
   - Should fast-decarbonizing sectors (residential heating) have negative growth?

---

## 10. FILES FOR REFERENCE

**Data Files:**
1. `/global-energy-tracker/public/data/useful_energy_timeseries.json` - Historical aggregate (2015-2024)
2. `/global-energy-tracker/public/data/demand_growth_projections.json` - Projections (2025-2050)
3. `/global-energy-tracker/public/data/sectoral_energy_breakdown.json` - Sector shares & growth rates

**Code Files:**
1. `/global-energy-tracker/src/components/SectoralEnergyGrowth.jsx` - Chart component (lines 94-261)
2. `/demand_growth_model.py` - Projection model (v1.8, lines 113-185)

**Documentation:**
1. `/SECTORAL_CHART_METHODOLOGY.md` - Current methodology documentation
2. `/GROK_REVIEW_2024_2025_DISCONTINUITY.md` - This document

---

## 11. SUCCESS CRITERIA

**The fix is successful when:**

1. ✅ Visual inspection shows no "kink" at 2024/2025 boundary
2. ✅ Year-over-year sector changes are smooth (<5% jumps)
3. ✅ Total of all sectors equals total energy (within 0.1%)
4. ✅ Sector shares sum to 100% (within 0.1%)
5. ✅ Historical data (2015-2024) remains unchanged
6. ✅ Projection data (2025-2050) continues smoothly from 2024
7. ✅ Individual energy source filtering still works correctly
8. ✅ All three scenarios (Baseline, Accelerated, Net-Zero) display smoothly

---

**End of Document**

**Next Steps:**
1. Share with Grok for validation and recommendations
2. Implement recommended solution
3. Verify chart displays smoothly
4. Update methodology documentation
5. Add validation tests to prevent future regressions

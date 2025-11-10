# AI System Prompt Reference - What the AI Knows

This document shows exactly what context and instructions the AI receives with EVERY query.

## Data the AI Has Access To

### 1. Latest 2024 Baseline (Auto-loaded)
```
Total Useful Energy: 229.6 EJ
Fossil Useful Energy: 186.8 EJ (81.4%)
Clean Useful Energy: 42.7 EJ (18.6%)
```

**Breakdown by Source:**
- Gas: 74.3 EJ (32.4%)
- Oil: 59.7 EJ (26.0%)
- Coal: 52.8 EJ (23.0%)
- Biomass: 14.0 EJ (6.1%)
- Hydro: 13.5 EJ (5.9%)
- Wind: 6.7 EJ (2.9%)
- Solar: 5.8 EJ (2.5%)
- Nuclear: 2.5 EJ (1.1%)
- Geothermal: 0.2 EJ (0.1%)

### 2. V1.6 Model Methodology (Embedded in Prompt)

**Corrections Applied:**
> "Version 1.6 CRITICAL FIXES (95%+ credibility per Grok guidance): Nuclear 25% (thermal method, CORRECTED from 75%), hydro 85% (minimal conversion losses), total energy GROWS to 280 EJ (2040) and 310 EJ (2050) not capped at 230 EJ, 1:1 displacement CORRECT for useful energy terms. RMI baseline reconciliation: 230 EJ thermal vs 240 EJ partial direct equivalent."

**Displacement Methodology:**
> "1:1 displacement is CORRECT for useful energy. The 2-3x electrification leverage applies to PRIMARY energy only and is already captured in efficiency factors. No multiplier needed."

**RMI Baseline Note:**
> "Our 2024 baseline (~230 EJ) is ~10 EJ lower than RMI (240 EJ) due to full thermal accounting (nuclear 25%, hydro 85%) vs RMI partial direct equivalent method. This is methodologically more conservative and consistent."

### 3. Efficiency Factors (Auto-loaded)

```
Oil: 30%
Gas: 50%
Coal: 32%
Nuclear: 25%  ← CRITICAL v1.6 correction
Hydro: 85%    ← v1.6 refined
Wind: 75%
Solar: 75%
Biomass: 28% (weighted: 50% trad @26%, 50% modern @38%)
Geothermal: 75%
```

### 4. Key Projections - Baseline Scenario (Auto-loaded)

```
2030: 252.1 EJ total (191.4 fossil PEAK, 60.7 clean)
2040: 280.0 EJ total (150.0 fossil, 130.0 clean)
2050: 310.0 EJ total (105.0 fossil, 205.0 clean)
```

### 5. Historical Timeseries (Full Access)

The AI can query ANY year from 1965-2024 with complete data:
- Total useful energy
- Fossil breakdown (oil/gas/coal)
- Clean breakdown (nuclear/hydro/wind/solar/biomass)
- Year-over-year growth rates
- Shares and percentages

### 6. All Three Scenarios (Full Access)

**Baseline (STEPS):** Current trajectory, fossil peak 2030
**Accelerated (APS):** Faster transition, fossil peak 2030 (earlier decline)
**Net-Zero (NZE):** Aggressive transition, fossil floor 20 EJ by 2050

## Instructions the AI Follows

### Priority 1: Dataset-First Responses
```
"ALWAYS cite specific numbers from the provided dataset when answering questions"
```

**Example:**
- ❌ "Clean energy is around 20% of the total"
- ✅ "Clean energy is 42.7 EJ, representing 18.6% of total useful energy (229.6 EJ) in 2024"

### Priority 2: Source Attribution
```
"When using data, mention 'According to our v1.6 model...' or 'The data shows...'"
```

**Example:**
- ❌ "Fossil fuels will peak in 2030"
- ✅ "According to our v1.6 Baseline scenario (aligned with BP and IEA STEPS), fossil fuel consumption is projected to peak in 2030 at 191.4 EJ"

### Priority 3: Precision
```
"Use exact figures from the data (e.g., '229.6 EJ' not 'around 230 EJ')"
```

### Priority 4: Methodology Transparency
```
"Explain thermal accounting when relevant (e.g., why nuclear is 25% efficient)"
```

**Example response to "Why is nuclear only 25%?":**
> "Nuclear efficiency is 25% because we use the thermal accounting method: thermal-to-electric conversion is ~33%, then transmission/distribution losses reduce it by ~10% (to 90%), then end-use efficiency is ~85%. The full chain: 0.33 × 0.90 × 0.85 ≈ 0.25 (25%). This is more conservative than the 'direct equivalent' method which would count nuclear at ~90% by only considering the electricity stage."

### Priority 5: Scenario Clarity
```
"Always specify which scenario (Baseline/Accelerated/Net-Zero) when discussing projections"
```

### Priority 6: Educational Tone
```
"Explain concepts clearly for non-experts"
```

### Priority 7: Calculate Trends
```
"Calculate and explain trends (e.g., '+2.3% annually 2020-2024')"
```

**Example:**
> "Solar grew from 1.8 EJ in 2015 to 5.8 EJ in 2024, a 222% increase or ~14% CAGR."

## Example AI Response Structure

**User:** "How much has clean energy grown?"

**AI Response (Enforced Pattern):**
```
According to our v1.6 model, clean useful energy grew from 38.2 EJ in 2015 to 42.7 EJ in 2024.

That's an increase of 4.5 EJ (+11.8%) over 9 years, or roughly 1.2% annually.

Breaking down by source (2015 → 2024):
• Solar: 1.8 EJ → 5.8 EJ (+222%, ~14% CAGR)
• Wind: 2.4 EJ → 6.7 EJ (+179%, ~13% CAGR)
• Hydro: 12.1 EJ → 13.5 EJ (+12%, ~1.2% CAGR)
• Nuclear: 2.8 EJ → 2.5 EJ (-11%, declining due to plant retirements)
• Biomass: 11.5 EJ → 14.0 EJ (+22%, ~2.2% CAGR)

The fastest growth came from solar and wind, which together added 7.3 EJ of useful energy services. This represents displacement potential—every EJ of clean growth can offset 1 EJ of fossil consumption (1:1 in useful energy terms, which already captures the 2-3x primary energy leverage through our efficiency factors).

Clean energy's share rose from 17.1% in 2015 to 18.6% in 2024, an increase of 1.5 percentage points.
```

**Notice:**
- ✅ Cites exact numbers (42.7 EJ, not "around 43")
- ✅ Provides source attribution ("According to our v1.6 model")
- ✅ Calculates trends (CAGR, absolute change, percentage)
- ✅ Explains methodology (1:1 displacement, efficiency factors)
- ✅ Educational tone (breaks down by source, explains concepts)
- ✅ Precise years (2015 → 2024, not "last decade")

## What the AI Does NOT Have

### ❌ Real-time Data
- AI only has data through 2024 (your historical timeseries endpoint)
- Cannot fetch live energy prices, current events, etc.
- Projections are MODEL outputs, not predictions

### ❌ Regional Breakdowns
- Data is globally aggregated
- Cannot answer "How much solar does California have?"
- Can only discuss global trends

### ❌ Sectoral Detail
- No transport vs. industry vs. buildings breakdown
- Cannot answer "How much energy does aviation use?"
- Only total useful energy by source

### ❌ Policy-Specific Analysis
- Cannot analyze specific legislation (e.g., "What's the impact of IRA?")
- Can only discuss scenarios (Baseline/Accelerated/Net-Zero)

### ❌ Supply Chain Data
- No mineral requirements (lithium, cobalt, etc.)
- No manufacturing capacity data
- No cost/price projections

## Testing AI Responses

### Test 1: Dataset Priority
**Ask:** "How much energy do we use globally?"

**Expected:** AI cites YOUR 229.6 EJ useful energy (2024), NOT generic "~600 EJ primary" from its training data.

### Test 2: Precision
**Ask:** "What's the clean energy share?"

**Expected:** AI says "18.6%" (exact from your data), NOT "around 20%" or "nearly 20%".

### Test 3: Methodology
**Ask:** "Why is the model different from RMI?"

**Expected:** AI explains the ~10 EJ difference due to thermal vs. partial direct equivalent accounting, referencing your RMI baseline note.

### Test 4: Scenario Clarity
**Ask:** "When will we reach 50% clean?"

**Expected:** AI specifies for EACH scenario:
- Baseline: ~2040 (130 EJ clean / 280 EJ total = 46%, not quite 50%)
- Accelerated: ~2038 (extrapolating)
- Net-Zero: ~2035 (extrapolating)

### Test 5: Calculations
**Ask:** "What's the solar growth rate?"

**Expected:** AI calculates CAGR from your historical data (2015-2024: ~14% CAGR), NOT a generic estimate.

## Monitoring AI Quality

### Signs of Good Performance ✅
- Cites exact numbers (229.6, not ~230)
- Mentions "v1.6 model" or "our data shows"
- Explains methodology when relevant
- Calculates CAGRs/trends from your data
- Distinguishes scenarios clearly

### Signs of Poor Performance ❌
- Gives round numbers without data (e.g., "around 200-250 EJ")
- Doesn't mention your model/dataset
- Provides generic energy stats from training data
- Confuses primary vs. useful energy
- Doesn't calculate trends (just estimates)

### If AI Goes Off-Track

**Symptoms:**
- Responses don't cite your specific numbers
- Talks about "600 EJ primary energy" instead of your useful energy
- Doesn't explain v1.6 methodology

**Diagnosis:**
1. Check browser console for errors loading JSON files
2. Verify API key is configured correctly
3. Check that data files exist and are valid JSON

**Fix:**
- Refresh the page to reload data
- Clear chat and try again
- Check `aiChatService.js` for errors in `loadProjectContext()`

## Customizing the AI

### Make Responses More Technical
Edit system prompt in `aiChatService.js`:
```javascript
"Use academic terminology. Cite specific IEA/BP reports when relevant. Include uncertainty quantification."
```

### Make Responses More Casual
```javascript
"Explain as if talking to a curious friend who's not an energy expert. Use analogies."
```

### Add Warnings
```javascript
"Always mention that projections have ±10-20% uncertainty. Note model limitations."
```

### Emphasize Specific Points
```javascript
"Always explain that 1:1 displacement is correct for useful energy, and emphasize the thermal accounting methodology."
```

---

## Summary: AI's Core Knowledge

The AI knows:
- ✅ Your exact 2024 baseline (229.6 EJ, 81.4% fossil, 18.6% clean)
- ✅ Full 1965-2024 historical timeseries
- ✅ All three scenario projections to 2050
- ✅ V1.6 efficiency factors (nuclear 25%, hydro 85%, etc.)
- ✅ Displacement methodology (1:1 for useful energy)
- ✅ RMI baseline reconciliation
- ✅ Model credibility (95%) and corrections

The AI is instructed to:
- ✅ Prioritize YOUR dataset over general knowledge
- ✅ Cite exact numbers (229.6 not ~230)
- ✅ Provide source attribution
- ✅ Explain methodology transparently
- ✅ Calculate trends from your data
- ✅ Maintain educational tone

**Result:** Users get accurate, data-driven answers directly from your v1.6 model! 🚀

/**
 * AI Chat Service - Claude API Integration (Secure Proxy)
 * Provides context-aware responses using the fossil displacement dataset
 * Uses backend proxy to keep API key secure
 */

/**
 * Load all project data for AI context
 */
export async function loadProjectContext() {
  try {
    // Load all available data files in parallel for maximum context
    const [
      historicalResponse,
      projectionsResponse,
      efficiencyResponse,
      regionalResponse,
      sectoralResponse,
      ffGrowthResponse
    ] = await Promise.all([
      fetch('/data/useful_energy_timeseries.json'),
      fetch('/data/demand_growth_projections.json'),
      fetch('/data/efficiency_factors_corrected.json'),
      fetch('/data/regional_energy_timeseries.json'),
      fetch('/data/sectoral_energy_breakdown.json').catch(() => null),
      fetch('/data/ff_growth_timeseries.json').catch(() => null)
    ]);

    const historicalData = await historicalResponse.json();
    const projectionsData = await projectionsResponse.json();
    const efficiencyData = await efficiencyResponse.json();
    const regionalData = await regionalResponse.json();
    const sectoralData = sectoralResponse ? await sectoralResponse.json() : null;
    const ffGrowthData = ffGrowthResponse ? await ffGrowthResponse.json() : null;

    return {
      historical: historicalData,
      projections: projectionsData,
      efficiency: efficiencyData,
      regional: regionalData,
      sectoral: sectoralData,
      ffGrowth: ffGrowthData
    };
  } catch (error) {
    console.error('Error loading project context:', error);
    return null;
  }
}

/**
 * Build comprehensive system prompt with dataset context
 */
function buildSystemPrompt(projectData) {
  const { historical, projections, efficiency, regional, sectoral, ffGrowth } = projectData;

  // Get latest data point and previous year for YoY calculations
  const latest = historical.data[historical.data.length - 1];
  const previous = historical.data[historical.data.length - 2];
  const metadata = projections.metadata;

  // Calculate year-over-year changes
  const fossilChange = latest.fossil_useful_ej - previous.fossil_useful_ej;
  const cleanChange = latest.clean_useful_ej - previous.clean_useful_ej;
  const totalChange = latest.total_useful_ej - previous.total_useful_ej;
  const displacement = Math.max(0, cleanChange);

  // Calculate source-specific changes
  const sourceChanges = Object.keys(latest.sources_useful_ej).map(source => {
    const curr = latest.sources_useful_ej[source] || 0;
    const prev = previous.sources_useful_ej[source] || 0;
    const change = curr - prev;
    return `${source}: ${curr.toFixed(2)} EJ (${change > 0 ? '+' : ''}${change.toFixed(2)} EJ change from ${previous.year})`;
  }).join('\n');

  return `You are an expert energy analyst with access to a comprehensive fossil displacement tracking model (v${metadata.version}).

# YOUR PRIMARY DATA SOURCE (ALWAYS PRIORITIZE THIS)

## Current Status (${latest.year})
Total Useful Energy: ${latest.total_useful_ej.toFixed(1)} EJ (${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)} EJ from ${previous.year})
Fossil Useful Energy: ${latest.fossil_useful_ej.toFixed(1)} EJ (${fossilChange > 0 ? '+' : ''}${fossilChange.toFixed(2)} EJ from ${previous.year})
Clean Useful Energy: ${latest.clean_useful_ej.toFixed(1)} EJ (${cleanChange > 0 ? '+' : ''}${cleanChange.toFixed(2)} EJ from ${previous.year})

## Year-over-Year Changes (${previous.year} to ${latest.year})
Fossil Fuel Growth: ${fossilChange > 0 ? '+' : ''}${fossilChange.toFixed(2)} EJ
Clean Energy Growth: ${cleanChange > 0 ? '+' : ''}${cleanChange.toFixed(2)} EJ
Displacement: ${displacement.toFixed(2)} EJ
Net Change in Fossil Consumption: ${(fossilChange - displacement).toFixed(2)} EJ

## Energy by Source (${latest.year})
${sourceChanges}

## Model Methodology (v1.6 - 95% Credibility)
${metadata.corrections}

### Key Efficiency Factors (Thermal Accounting Method):
${Object.entries(efficiency.system_wide_efficiency)
  .filter(([key]) => !['notes', 'other'].includes(key))
  .map(([source, eff]) => `- ${source.charAt(0).toUpperCase() + source.slice(1)}: ${(eff * 100).toFixed(0)}%`)
  .join('\n')}

### Displacement Methodology:
${metadata.displacement_methodology}

### RMI Baseline Reconciliation:
${metadata.rmi_baseline_note}

## Baseline Scenario (STEPS) Key Projections:
${projections.scenarios
  .find(s => s.name === 'Baseline (STEPS)')
  ?.data.filter(d => [2030, 2040, 2050].includes(d.year))
  .map(d => `- ${d.year}: ${d.total_useful_ej.toFixed(1)} EJ total (${d.fossil_useful_ej.toFixed(1)} fossil, ${d.clean_useful_ej.toFixed(1)} clean)`)
  .join('\n')}

## Historical Trends Available:
- Years: ${historical.data[0].year} - ${latest.year} (${historical.data.length} years)
- All data uses consistent v1.6 efficiency factors
- Fossil peak projected: 2030 at ~191 EJ useful

## Regional Data Available:
You have access to detailed regional breakdowns for ${regional ? Object.keys(regional.regions || {}).length : 0} regions covering 1965-${latest.year}:
${regional && regional.regions ?
  `- Regions tracked: ${Object.keys(regional.regions).slice(0, 10).join(', ')}${Object.keys(regional.regions).length > 10 ? ', and more' : ''}
- Each region includes: total useful energy, fossil/clean split, source breakdown, efficiency percentage
- Can answer questions like "What is China's clean energy share?" or "How has Europe's energy mix changed since 1990?"`
  : '- Regional data loading...'}

${sectoral ?
  `## Sectoral Energy Breakdown Available:
You have access to energy consumption by sector (industrial, transport, residential, etc.)
- Can answer questions about which sectors consume the most energy
- Can show sectoral trends over time`
  : ''}

${ffGrowth ?
  `## Fossil Fuel Growth Tracking Available:
You have access to detailed fossil fuel growth patterns and displacement dynamics
- Year-by-year fossil fuel consumption changes
- Displacement effectiveness metrics
- Phase analysis (growth vs. decline)`
  : ''}

# RESPONSE GUIDELINES (CRITICAL - FOLLOW EXACTLY)

1. ALWAYS use the exact numbers from the dataset provided above. Do NOT make up numbers or estimates.
2. ALWAYS verify your answer against the data before responding. If asked about year-over-year changes, use the Year-over-Year Changes section.
3. When asked about fossil fuel changes, check the "Fossil Fuel Growth" value in the Year-over-Year Changes section.
4. When asked about increases or decreases, a positive number means increase, negative means decrease.
5. Be precise with figures from the data. Use exact numbers provided.
6. Explain thermal accounting when relevant (why nuclear is 25% efficient, coal is 28%, etc).
7. Always specify which scenario when discussing projections.
8. Explain concepts clearly for non-experts.

## Historical Data Queries (1965-${latest.year}):
- You have access to the FULL ${historical.data.length}-year dataset
- Can answer questions about ANY year from 1965 to ${latest.year}
- When asked about historical years (e.g., "What was the energy mix in 1980?"), reference the historical data array
- Can calculate trends between any two years in this range
- Example: "In 1965, total useful energy was ${historical.data[0].total_useful_ej.toFixed(1)} EJ with ${historical.data[0].clean_share_percent.toFixed(1)}% clean"

## When Dataset Cannot Answer:
If a question is about:
- Energy policy or political decisions
- Specific companies, technologies, or products not in aggregate data
- Current events or news after ${latest.year}
- Detailed technical specifications beyond efficiency factors
- Future events beyond 2050 projection horizon

Then clearly state: "This question is outside the scope of our energy services dataset. Based on general knowledge: [provide answer with appropriate caveats]" OR "I don't have specific data on this topic in the dataset, but I can explain the general concept..."

NEVER claim to have data you don't have. Be honest about dataset limitations.

# FORMATTING RULES (CRITICAL - FOLLOW EXACTLY)

DO NOT use:
- Asterisks (*) for bullets or emphasis
- Mdashes (—)
- Emojis or special characters
- Markdown formatting (**bold**, *italic*, etc.)
- Bullet point symbols (•, -, *)

DO use:
- Simple paragraph format
- Answer the question directly in the first paragraph
- Then provide additional helpful context in following paragraphs
- Use line breaks between paragraphs
- Keep it conversational but data-driven

Example good format:

Fossil fuel energy services increased by 3.13 EJ in 2024, rising from 183.7 EJ in 2023 to 186.8 EJ in 2024. This represents a 1.7% growth rate.

This growth occurred despite clean energy growing by 2.45 EJ during the same period. The displacement of 2.45 EJ was not enough to offset the 3.13 EJ increase in fossil demand, resulting in a net increase of 0.68 EJ in fossil consumption.

This pattern shows we are still in the "Displacement < Fossil Fuel Growth" phase, where clean energy growth has not yet exceeded the rate of new fossil fuel demand.

# DATA ACCESS

You have access to:
- Full historical timeseries (1965-${latest.year}) - ALL 60 years of data
- Three projection scenarios (2025-2050): Baseline (STEPS), Accelerated (APS), Net-Zero (NZE)
- Efficiency factors and rationale
- Displacement calculations and peak projections
- Regional breakdowns for ${regional ? Object.keys(regional.regions || {}).length : '27'} regions
- Sectoral energy consumption data (if available)
- Fossil fuel growth tracking and displacement dynamics

# EXAMPLE RESPONSES

User: "When will fossil fuels peak?"
You: "According to the Baseline scenario (aligned with BP and IEA STEPS), fossil fuel consumption is projected to peak in 2030 at approximately 191 EJ of useful energy services.

This timing represents the point where clean energy displacement exceeds fossil fuel growth. Clean energy is growing at about 3 EJ per year while fossil fuel growth is slowing to around 0.4% annually.

After the 2030 peak, fossil consumption declines to 150 EJ by 2040 and 105 EJ by 2050 in the Baseline scenario. The Accelerated and Net-Zero scenarios show earlier peaks with steeper declines."

User: "What was the absolute increase in fossil fuel energy services in 2024?"
You: "Fossil fuel energy services increased by ${fossilChange.toFixed(2)} EJ in ${latest.year}, rising from ${previous.fossil_useful_ej.toFixed(1)} EJ in ${previous.year} to ${latest.fossil_useful_ej.toFixed(1)} EJ in ${latest.year}.

This growth occurred despite clean energy growing by ${cleanChange.toFixed(2)} EJ during the same period. The displacement of ${displacement.toFixed(2)} EJ was not enough to offset the ${fossilChange.toFixed(2)} EJ increase in fossil demand, resulting in a net increase of ${(fossilChange - displacement).toFixed(2)} EJ in fossil consumption.

We are currently in the Displacement < Fossil Fuel Growth phase, where clean energy growth has not yet exceeded the rate of new fossil fuel demand."

Now respond to user questions using this format. Answer directly, then provide context. No bullets, mdashes, or emojis.`;
}

/**
 * Send message to Claude via secure backend proxy
 */
export async function sendMessage(userMessage, conversationHistory = []) {
  try {
    // Load project data
    const projectData = await loadProjectContext();
    if (!projectData) {
      throw new Error('Failed to load project data');
    }

    // Build system prompt with data context
    const systemPrompt = buildSystemPrompt(projectData);

    // Build messages array
    const messages = [
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage
      }
    ];

    // Call backend proxy endpoint
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages,
        systemPrompt: systemPrompt,
        model: 'claude-sonnet-4-20250514',
        maxTokens: 2048
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    const data = await response.json();

    return {
      content: data.content[0].text,
      role: 'assistant',
      modelUsed: data.model,
      tokensUsed: {
        input: data.usage.input_tokens,
        output: data.usage.output_tokens
      }
    };
  } catch (error) {
    console.error('Claude API error:', error);

    // Provide helpful error messages
    if (error.message.includes('429')) {
      return {
        content: 'Too many requests. Please wait a moment and try again.',
        role: 'assistant',
        error: true
      };
    }

    if (error.message.includes('401') || error.message.includes('authentication')) {
      return {
        content: 'API authentication failed. Please contact the site administrator.',
        role: 'assistant',
        error: true
      };
    }

    if (error.message.includes('529')) {
      return {
        content: 'The AI service is currently experiencing high demand. Please wait a moment and try again.',
        role: 'assistant',
        error: true
      };
    }

    return {
      content: `Error: ${error.message}. Please try again or contact support if the issue persists.`,
      role: 'assistant',
      error: true
    };
  }
}

/**
 * Get suggested questions based on current data
 */
export function getSuggestedQuestions(projectData) {
  const latest = projectData?.historical?.data[projectData.historical.data.length - 1];
  const year = latest?.year || '2024';

  return [
    `What is the current state of the energy transition in ${year}?`,
    `When will fossil fuels peak according to the model?`,
    `How fast is clean energy growing year-over-year?`,
    `What is the displacement rate and what does it mean?`,
    `Compare the three scenarios: Baseline, Accelerated, and Net-Zero`,
    `Explain the efficiency factors - why is nuclear only 25%?`,
    `What is "useful energy" and why does it matter?`,
    `How much has renewable energy grown in the last decade?`,
    `What would it take to reach Net-Zero by 2050?`,
    `Show me the year-over-year change in fossil consumption`
  ];
}

/**
 * Query specific data points (for AI to use)
 */
export async function queryDataPoint(query) {
  const projectData = await loadProjectContext();
  if (!projectData) return null;

  const { historical, projections } = projectData;

  // Parse query type
  if (query.type === 'historical' && query.year) {
    return historical.data.find(d => d.year === query.year);
  }

  if (query.type === 'projection' && query.scenario && query.year) {
    const scenario = projections.scenarios.find(s => s.name.includes(query.scenario));
    return scenario?.data.find(d => d.year === query.year);
  }

  if (query.type === 'trend' && query.source && query.startYear && query.endYear) {
    const startData = historical.data.find(d => d.year === query.startYear);
    const endData = historical.data.find(d => d.year === query.endYear);

    if (startData && endData) {
      const startValue = startData.sources_useful_ej?.[query.source] || 0;
      const endValue = endData.sources_useful_ej?.[query.source] || 0;
      const years = query.endYear - query.startYear;
      const cagr = ((endValue / startValue) ** (1 / years) - 1) * 100;

      return {
        source: query.source,
        startYear: query.startYear,
        endYear: query.endYear,
        startValue,
        endValue,
        absoluteChange: endValue - startValue,
        percentChange: ((endValue / startValue - 1) * 100),
        cagr
      };
    }
  }

  return null;
}

export default {
  sendMessage,
  getSuggestedQuestions,
  queryDataPoint,
  loadProjectContext
};

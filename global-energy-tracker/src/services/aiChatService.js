/**
 * AI Chat Service - Claude API Integration
 * Provides context-aware responses using the fossil displacement dataset
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Claude client (API key from environment variable)
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true // Only for demo - use backend proxy in production
});

/**
 * Load all project data for AI context
 */
export async function loadProjectContext() {
  try {
    // Load historical timeseries
    const historicalResponse = await fetch('/data/useful_energy_timeseries.json');
    const historicalData = await historicalResponse.json();

    // Load projections
    const projectionsResponse = await fetch('/data/demand_growth_projections.json');
    const projectionsData = await projectionsResponse.json();

    // Load efficiency factors
    const efficiencyResponse = await fetch('/data/efficiency_factors_corrected.json');
    const efficiencyData = await efficiencyResponse.json();

    return {
      historical: historicalData,
      projections: projectionsData,
      efficiency: efficiencyData
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
  const { historical, projections, efficiency } = projectData;

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

# RESPONSE GUIDELINES (CRITICAL - FOLLOW EXACTLY)

1. ALWAYS use the exact numbers from the dataset provided above. Do NOT make up numbers or estimates.
2. ALWAYS verify your answer against the data before responding. If asked about year-over-year changes, use the Year-over-Year Changes section.
3. When asked about fossil fuel changes, check the "Fossil Fuel Growth" value in the Year-over-Year Changes section.
4. When asked about increases or decreases, a positive number means increase, negative means decrease.
5. Be precise with figures from the data. Use exact numbers provided.
6. Explain thermal accounting when relevant (why nuclear is 25% efficient, coal is 28%, etc).
7. Always specify which scenario when discussing projections.
8. Explain concepts clearly for non-experts.

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
- Full historical timeseries (1965-${latest.year})
- Three projection scenarios (2025-2050): Baseline (STEPS), Accelerated (APS), Net-Zero (NZE)
- Efficiency factors and rationale
- Displacement calculations and peak projections

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
 * Send message to Claude with full project context
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

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages
    });

    return {
      content: response.content[0].text,
      role: 'assistant',
      modelUsed: response.model,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens
      }
    };
  } catch (error) {
    console.error('Claude API error:', error);

    // Provide helpful error messages
    if (error.status === 401) {
      return {
        content: 'API key not configured. Please add your Anthropic API key to the .env file as VITE_ANTHROPIC_API_KEY.',
        role: 'assistant',
        error: true
      };
    }

    if (error.status === 529) {
      return {
        content: 'The AI service is currently experiencing high demand. Please wait a moment and try again.',
        role: 'assistant',
        error: true
      };
    }

    return {
      content: `Error: ${error.message}. Please try again or check your API configuration.`,
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

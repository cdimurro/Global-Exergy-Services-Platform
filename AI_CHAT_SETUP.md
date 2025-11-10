# AI Chat Integration - Setup Guide

## Overview

The AI chatbot is powered by Claude (Anthropic) and has **full access** to your fossil displacement dataset and v1.6 model. It can answer questions about:

- Current energy transition status (2024 baseline)
- Historical trends (1965-2024)
- Future projections (3 scenarios: Baseline, Accelerated, Net-Zero)
- Methodology and efficiency factors
- Displacement calculations

## Features

✅ **Dataset-First Responses** - AI prioritizes your v1.6 model data over general knowledge
✅ **Precise Numbers** - Cites exact figures from your timeseries (e.g., "229.6 EJ" not "around 230")
✅ **Source Attribution** - Always mentions "According to our v1.6 model..."
✅ **Methodology Transparency** - Explains thermal accounting when relevant
✅ **Conversation Memory** - Maintains context across the chat session
✅ **Suggested Questions** - Provides helpful starting points

## Setup Instructions

### Step 1: Get an Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-...`)

**Pricing:** Claude API is very affordable:
- Sonnet 4: ~$3 per million input tokens, ~$15 per million output tokens
- Typical chat message: 5,000-10,000 tokens total
- **Cost per message: ~$0.01-0.05** (very cheap for the quality!)

### Step 2: Configure Environment Variable

1. Create a `.env` file in the `global-energy-tracker` directory:
   ```bash
   cd global-energy-tracker
   cp .env.example .env
   ```

2. Edit `.env` and add your API key:
   ```
   VITE_ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
   ```

3. **IMPORTANT:** The `.env` file is already in `.gitignore` - never commit your API key!

### Step 3: Restart Development Server

```bash
npm run dev
```

The chatbot should now work! Navigate to the "Chat" section in your app.

## How It Works

### Data Loading (Automatic)
The AI service automatically loads:
- `public/data/useful_energy_timeseries.json` (historical 1965-2024)
- `public/data/demand_growth_projections.json` (scenarios 2025-2050)
- `data-pipeline/efficiency_factors_corrected.json` (methodology)

### System Prompt (Embedded)
Every API call includes a comprehensive system prompt with:
- Latest 2024 data (229.6 EJ total, 187 EJ fossil, 43 EJ clean)
- V1.6 methodology corrections
- Efficiency factors (nuclear 25%, hydro 85%, etc.)
- Displacement methodology (1:1 for useful energy)
- RMI baseline reconciliation notes
- Key projections for 2030/2040/2050

### Response Guidelines (Enforced)
The AI is instructed to:
1. **Prioritize dataset** - Always cite specific numbers from your data
2. **Be precise** - Use exact figures (e.g., "229.6 EJ" not "~230 EJ")
3. **Source attribution** - Mention "According to our v1.6 model..."
4. **Methodology transparency** - Explain thermal accounting when relevant
5. **Scenario clarity** - Specify Baseline/Accelerated/Net-Zero
6. **Educational tone** - Explain concepts for non-experts

## Example Queries

Try asking:

**Current Status:**
- "What is the current state of the energy transition in 2024?"
- "How much fossil fuel are we using right now?"
- "What percentage of energy comes from clean sources?"

**Historical Analysis:**
- "How fast has solar grown in the last 10 years?"
- "Show me the year-over-year change in fossil consumption"
- "When did clean energy start accelerating?"

**Future Projections:**
- "When will fossil fuels peak according to the model?"
- "Compare the three scenarios: Baseline, Accelerated, and Net-Zero"
- "What would it take to reach Net-Zero by 2050?"

**Methodology:**
- "Explain the efficiency factors - why is nuclear only 25%?"
- "What is 'useful energy' and why does it matter?"
- "How does displacement work? Why is it 1:1?"

**Deep Dives:**
- "Calculate the CAGR for wind energy 2015-2024"
- "What's the displacement rate and what does it tell us?"
- "Why is our 2024 baseline lower than RMI's?"

## Testing the Integration

### Basic Test
1. Open the Chat page
2. Click a suggested question or type: "What is the current energy status?"
3. You should get a response citing exact 2024 numbers (229.6 EJ total, etc.)

### Dataset Priority Test
Ask: "How much clean energy do we have in 2024?"

**Expected Response:** The AI should cite YOUR exact data (42.7 EJ clean, 18.6% share) from the v1.6 model, NOT generic estimates from its training data.

### Methodology Test
Ask: "Why is nuclear efficiency only 25%?"

**Expected Response:** The AI should explain the thermal accounting chain (33% thermal-to-electric × 90% T&D × 85% end-use ≈ 25%) from your efficiency_factors_corrected.json file.

## Troubleshooting

### "API key not configured" error
- Check that `.env` file exists in `global-energy-tracker` directory
- Verify the API key starts with `sk-ant-`
- Restart the dev server (`npm run dev`)

### "Failed to load project data" error
- Check that JSON files exist:
  - `public/data/useful_energy_timeseries.json`
  - `public/data/demand_growth_projections.json`
  - `data-pipeline/efficiency_factors_corrected.json`
- Run the data generation scripts if needed

### AI gives generic responses (not using your data)
- This shouldn't happen - the system prompt is very explicit
- Check browser console for errors loading the JSON files
- Try clearing the chat and asking again

### "Rate limit exceeded" error
- You've hit API limits (unlikely with normal use)
- Wait a few minutes and try again
- Consider upgrading your Anthropic plan if using heavily

## Production Deployment

⚠️ **SECURITY WARNING:** The current implementation uses `dangerouslyAllowBrowser: true` which is only acceptable for development/demos.

**For production, you MUST:**

1. **Create a backend proxy:**
   ```javascript
   // Server-side API route (e.g., /api/chat)
   import Anthropic from '@anthropic-ai/sdk';

   export async function POST(request) {
     const anthropic = new Anthropic({
       apiKey: process.env.ANTHROPIC_API_KEY // Server-side only!
     });

     const { messages } = await request.json();
     const response = await anthropic.messages.create({...});
     return Response.json(response);
   }
   ```

2. **Remove browser-side API key:**
   - Delete `dangerouslyAllowBrowser: true`
   - Never expose API key to client-side code
   - Call your backend `/api/chat` endpoint instead

3. **Add rate limiting:**
   - Prevent abuse of your API key
   - Implement user authentication
   - Set usage quotas

## Cost Estimates

Assuming average chat session:
- 10 messages back and forth
- ~8,000 tokens per message (5k system prompt + 3k response)
- Total: 80,000 tokens

**Cost per session:** ~$0.40

**Monthly estimates:**
- 100 users/month: $40
- 1,000 users/month: $400
- 10,000 users/month: $4,000

Very affordable for the quality of responses!

## Advanced Customization

### Adding New Data Sources

Edit `aiChatService.js` and update `loadProjectContext()`:

```javascript
// Load additional data
const customDataResponse = await fetch('/data/my-custom-data.json');
const customData = await customDataResponse.json();

return {
  historical,
  projections,
  efficiency,
  custom: customData  // Add new data
};
```

Then reference in system prompt:
```javascript
Custom insights: ${JSON.stringify(projectData.custom)}
```

### Adjusting AI Behavior

Edit `buildSystemPrompt()` in `aiChatService.js`:

```javascript
// Make responses more technical
"Use academic terminology and cite peer-reviewed sources when possible."

// Make responses more casual
"Explain concepts in simple terms, as if talking to a friend."

// Add warnings
"Always mention uncertainty bands (±10%) when discussing projections."
```

### Switching Models

Edit `aiChatService.js`:

```javascript
// Use Claude Opus for highest quality (more expensive)
model: 'claude-opus-4-20250514'

// Use Claude Haiku for fastest/cheapest (less detailed)
model: 'claude-haiku-4-20250514'

// Current: Sonnet (best balance)
model: 'claude-sonnet-4-20250514'
```

## Files Created

- `src/services/aiChatService.js` - API integration and data loading
- `src/components/AIChatbot.jsx` - Enhanced UI with suggested questions
- `.env.example` - Template for API key configuration
- `AI_CHAT_SETUP.md` - This file

## Support

For issues with:
- **Anthropic API:** https://docs.anthropic.com/
- **Dataset questions:** Review COMPLETE_PROJECT_SUMMARY_V1.6_FINAL.md
- **Model methodology:** Review efficiency_factors_corrected.json

---

**Ready to use!** Get your API key, add it to `.env`, and start chatting with your dataset! 🚀

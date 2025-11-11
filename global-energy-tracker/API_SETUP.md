# API Setup Instructions

## Secure Backend Proxy for AI Chatbot

This application uses a secure backend proxy to protect the Anthropic API key from being exposed in the browser.

### Local Development Setup

1. Create a `.env.local` file in the root directory:
   ```bash
   ANTHROPIC_API_KEY=your_actual_api_key_here
   ```

2. Replace `your_actual_api_key_here` with your real Anthropic API key

3. Start the development server:
   ```bash
   npm run dev
   ```

4. The AI Chatbot will now work locally with the secure proxy

### Production Setup (Vercel)

1. Go to your Vercel project dashboard

2. Navigate to Settings → Environment Variables

3. Add a new environment variable:
   - **Name**: `ANTHROPIC_API_KEY` (no VITE_ prefix!)
   - **Value**: Your Anthropic API key
   - **Environments**: Production, Preview, Development (check all)

4. **Important**: Do NOT use the `VITE_` prefix for this variable. The API key should be server-side only.

5. After saving the environment variable, Vercel will automatically redeploy your application

### How It Works

- The frontend calls `/api/chat` instead of calling Anthropic directly
- The backend proxy (`/api/chat.js` for Vercel, `/server/chat.js` for local dev) handles the actual API call
- The API key stays on the server and is never exposed to the browser
- Rate limiting is built in (10 requests per minute per IP)

### Security Features

- API key is completely hidden from the browser
- Rate limiting prevents abuse (10 requests/minute/IP)
- Server-side validation of all requests
- Proper error handling without exposing sensitive information

### Files Modified

- `src/services/aiChatService.js` - Updated to use `/api/chat` endpoint
- `api/chat.js` - Vercel serverless function
- `server/chat.js` - Local development handler
- `vite.config.js` - Added local dev proxy configuration

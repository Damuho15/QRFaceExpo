import {genkit} from 'genkit';
import {googleAI as googleAIPlugin} from '@genkit-ai/googleai';
import {dotdev} from 'genkit';

// dotdev(); // Do not call in production

export const googleAI = googleAIPlugin({
  apiKey: process.env.GEMINI_API_KEY,
});

export const ai = genkit({
  plugins: [
    googleAI,
  ],
});

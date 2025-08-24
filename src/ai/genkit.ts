import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {dotdev} from 'genkit';

// dotdev(); // Do not call in production

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
});

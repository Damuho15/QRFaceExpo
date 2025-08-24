
'use server';

import 'dotenv/config';
import { listModels } from 'genkit';
import { googleAI } from './genkit'; // Use our configured plugin instance
// Flows will be imported for their side effects in this file.
import './flows/face-recognition-flow';
import './tools/get-registered-members-tool';


async function listGoogleAIModels() {
  try {
    const allModels = await listModels();
    
    console.log('--- Available Genkit Models ---');
    
    const googleAIModels = allModels.filter(m => m.name.startsWith('googleai/'));

    if (googleAIModels.length === 0) {
        console.log('No Google AI models found. Please ensure your API key and project configuration are correct.');
    } else {
        googleAIModels.forEach(model => {
            console.log('------------------------------------');
            console.log(`ID: ${model.name}`);
            console.log(`  Supports Generate: ${model.supports.generate}`);
            console.log(`  Supports Multimodal: ${model.supports.multimodal}`);
        });
        console.log('------------------------------------');
        console.log('\nACTION REQUIRED: Please copy the full ID of the model you wish to use (e.g., \'googleai/gemini-1.5-pro-latest\') and provide it.');
    }
    
  } catch (e) {
    console.error('CRITICAL: Failed to list models. This is likely an API key or authentication issue.', e);
  }
}

// Run the diagnostic function when the dev server starts.
listGoogleAIModels();

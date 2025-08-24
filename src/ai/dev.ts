
'use server';

import 'dotenv/config';
import { listModels } from 'genkit';
import { googleAI } from './genkit'; // Ensure googleAI plugin is imported

// Flows will be imported for their side effects in this file.
import './flows/face-recognition-flow';
import './tools/get-registered-members-tool';


// Function to list available models and log them to the console.
async function listGoogleAIModels() {
  console.log('--- Checking for available Genkit models... ---');
  try {
    const models = await listModels();
    if (models.length === 0) {
        console.log("No models found. This might be an issue with the API key or project permissions.");
    } else {
        console.log('--- Available Genkit Models ---');
        models.forEach((model) => {
            console.log(`ID: ${model.name}`);
            console.log(`  Supports Generate: ${model.supports.generate}`);
            console.log(`  Supports Multimodal: ${model.supports.multimodal}`);
            console.log(`  Provider: ${model.provider}`);
            console.log(`------------------------------------`);
        });
    }
  } catch (e) {
    console.error('Error listing models:', e);
  }
}

// Run the function to list models when the dev server starts.
listGoogleAIModels();

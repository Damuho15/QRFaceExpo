
// Flows will be imported for their side effects in this file.
import './flows/face-recognition-flow';
import './tools/get-registered-members-tool';

import { listModels } from 'genkit/ai';
import { googleAI } from './genkit';

async function listGoogleAIModels() {
  const models = await listModels({
    where: {
      plugin: googleAI.name,
    },
  });

  console.log('--- Available Google AI Models ---');
  models.forEach((model) => {
    console.log(`ID: ${model.name}`);
    console.log(`  Supports Generate: ${model.supports.generate}`);
    console.log(`  Supports Multimodal: ${model.supports.multimodal}`);
    console.log('------------------------------------');
  });
}

listGoogleAIModels();

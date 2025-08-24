
'use server';
/**
 * @fileOverview A Genkit tool for retrieving registered member data for face recognition.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Member } from '@/lib/types';
import { convertImageUrlToDataUri } from '@/lib/supabaseClient';

// Define the output schema for the tool
const GetRegisteredMembersOutputSchema = z.object({
  members: z.array(
    z.object({
      id: z.string(),
      fullName: z.string(),
      pictureDataUri: z
        .string()
        .describe('The member profile picture as a data URI.'),
    })
  ),
});

// This is the exported tool that the AI flow will use.
export const getRegisteredMembers = ai.defineTool(
  {
    name: 'getRegisteredMembers',
    description: 'Retrieves a list of all registered members, including their full name and profile picture as a data URI, for face recognition comparison.',
    inputSchema: z.object({}),
    outputSchema: GetRegisteredMembersOutputSchema,
  },
  async () => {
    // This tool now uses the centralized admin client from supabaseClient.ts
    // which handles environment variables and prevents multiple client instances.
    const { getMembers } = await import('@/lib/supabaseClient');
    
    console.log('[TOOL] Running getRegisteredMembers...');
    
    // 1. Fetch all members with a pictureUrl using the existing getMembers function.
    // Fetch all members by setting pageSize to 0.
    const { members } = await getMembers(0, 0); 
    
    const membersWithPictures = members.filter(m => m.pictureUrl);

    if (membersWithPictures.length === 0) {
      console.log('[TOOL] No members with pictures found.');
      return { members: [] };
    }
    
    console.log(`[TOOL] Found ${membersWithPictures.length} members with a pictureUrl. Now converting images to data URIs...`);
    const validMembersForPrompt = [];
    
    // 2. Process members and convert images
    for (const member of membersWithPictures) {
      if (member.pictureUrl) {
        try {
            const dataUri = await convertImageUrlToDataUri(member.pictureUrl);
            if (dataUri) {
              validMembersForPrompt.push({
                id: member.id,
                fullName: member.fullName,
                pictureDataUri: dataUri,
              });
            }
        } catch(convertError) {
            console.error(`[TOOL] Failed to convert image for member ${member.fullName} (ID: ${member.id}). URL: ${member.pictureUrl}`, convertError);
            // Continue to the next member without crashing.
        }
      }
    }
    
    console.log(`[TOOL] Successfully processed and converted images for ${validMembersForPrompt.length} members.`);
    return { members: validMembersForPrompt };
  }
);

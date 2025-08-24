
'use server';
/**
 * @fileOverview A Genkit tool for retrieving registered member data for face recognition.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Member } from '@/lib/types';
import { convertImageUrlToDataUri } from '@/lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';

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
    console.log('[PROD-DEBUG] --- Running getRegisteredMembers Tool ---');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        console.error("[PROD-DEBUG] Tool Error: NEXT_PUBLIC_SUPABASE_URL is not configured in the production environment.");
        return { members: [] };
    } else {
        console.log("[PROD-DEBUG] NEXT_PUBLIC_SUPABASE_URL is present.");
    }
    
    if (!supabaseServiceKey) {
        console.error("[PROD-DEBUG] Tool Error: SUPABASE_SERVICE_ROLE_KEY is not configured in the production environment. This is a secret key and is required for this tool to work.");
        return { members: [] };
    } else {
        console.log("[PROD-DEBUG] SUPABASE_SERVICE_ROLE_KEY is present.");
    }
    
    console.log("[PROD-DEBUG] Tool: Initializing Supabase admin client...");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 1. Fetch all members with a pictureUrl
    console.log('[PROD-DEBUG] Tool: Fetching members from Supabase...');
    const { data: members, error, count } = await supabase
      .from('members')
      .select('*', { count: 'exact' })
      .not('pictureUrl', 'is', null);

    if (error) {
      console.error('[PROD-DEBUG] Tool Error: Failed to fetch members from Supabase.', error);
      return { members: [] };
    }

    if (!members || members.length === 0) {
      console.log(`[PROD-DEBUG] Tool: No members with pictures found. Query returned ${count} total members, but 0 with a pictureUrl.`);
      return { members: [] };
    }
    
    console.log(`[PROD-DEBUG] Tool: Found ${members.length} members with a pictureUrl. Now converting images to data URIs...`);
    const validMembersForPrompt = [];
    
    // 2. Process members and convert images
    for (const member of members as Member[]) {
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
            console.error(`[PROD-DEBUG] Tool Error: Failed to convert image for member ${member.fullName} (ID: ${member.id}). URL: ${member.pictureUrl}`, convertError);
            // Continue to the next member without crashing.
        }
      }
    }
    
    console.log(`[PROD-DEBUG] Tool: Successfully processed and converted images for ${validMembersForPrompt.length} members.`);
    return { members: validMembersForPrompt };
  }
);

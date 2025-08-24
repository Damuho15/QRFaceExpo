
'use server';
/**
 * @fileOverview A Genkit tool for retrieving registered member data for face recognition.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { createClient } from '@supabase/supabase-js';
import type { Member } from '@/lib/types';

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

// Helper function to convert image URL to data URI
const convertImageUrlToDataUri = async (url: string): Promise<string | null> => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('Supabase URL is not defined. Cannot construct full URL for image.');
      return null;
    }
    // Construct the full URL if a relative path is provided
    const fullUrl = url.startsWith('http') ? url : `${supabaseUrl}${url}`;
    
    const response = await fetch(fullUrl);

    if (!response.ok) {
      console.error(`Failed to fetch image. URL: ${fullUrl}, Status: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get('Content-Type') || 'image/jpeg';
    
    return `data:${mimeType};base64,${buffer.toString('base64')}`;

  } catch (error) {
    console.error(`An exception occurred while trying to fetch image from URL: ${url}`, error);
    return null;
  }
};


// This is the exported tool that the AI flow will use.
export const getRegisteredMembers = ai.defineTool(
  {
    name: 'getRegisteredMembers',
    description: 'Retrieves a list of all registered members, including their full name and profile picture as a data URI, for face recognition comparison.',
    inputSchema: z.object({}),
    outputSchema: GetRegisteredMembersOutputSchema,
  },
  async () => {
    console.log('Tool: getRegisteredMembers is executing...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Tool Error: Supabase URL or Service Role Key is not configured.");
        return { members: [] };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch all members with a pictureUrl
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .not('pictureUrl', 'is', null);

    if (error) {
      console.error('Tool Error: Failed to fetch members from Supabase.', error);
      return { members: [] };
    }

    if (!members || members.length === 0) {
      console.log('Tool: No members with pictures found.');
      return { members: [] };
    }
    
    const validMembersForPrompt = [];
    
    // 2. Process members and convert images
    for (const member of members as Member[]) {
      if (member.pictureUrl) {
        const dataUri = await convertImageUrlToDataUri(member.pictureUrl);
        if (dataUri) {
          validMembersForPrompt.push({
            id: member.id,
            fullName: member.fullName,
            pictureDataUri: dataUri,
          });
        }
      }
    }
    
    console.log(`Tool: Successfully processed and converted images for ${validMembersForPrompt.length} members.`);
    return { members: validMembersForPrompt };
  }
);


'use server';
/**
 * @fileOverview A face recognition AI agent for member check-in.
 *
 * - recognizeFace - A function that handles the face recognition process.
 * - RecognizeFaceInput - The input type for the recognizeFace function.
 * - RecognizeFaceOutput - The return type for the recognizeFace function.
 */

import { ai } from '@/ai/genkit';
import { getMembers } from '@/lib/supabaseClient';
import { z } from 'genkit';

const RecognizeFaceInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo from the user's camera, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type RecognizeFaceInput = z.infer<typeof RecognizeFaceInputSchema>;

const RecognizeFaceOutputSchema = z.object({
  matchFound: z.boolean().describe('Whether a matching member was found.'),
  member: z
    .object({
      id: z.string().describe('The ID of the matched member.'),
      fullName: z.string().describe('The full name of the matched member.'),
    })
    .optional()
    .describe('The matched member, if any.'),
});
export type RecognizeFaceOutput = z.infer<typeof RecognizeFaceOutputSchema>;

export async function recognizeFace(input: RecognizeFaceInput): Promise<RecognizeFaceOutput> {
  return recognizeFaceFlow(input);
}

const prompt = ai.definePrompt({
    name: 'recognizeFacePrompt',
    input: {
        schema: z.object({
            imageDataUri: z.string(),
            members: z.array(z.object({
                id: z.string(),
                fullName: z.string(),
                pictureUrl: z.string().nullable(),
            })),
        }),
    },
    output: { schema: RecognizeFaceOutputSchema },
    prompt: `You are an advanced AI security agent responsible for face recognition at an event.
    Your task is to compare the live image provided by the user with the profile pictures of registered members.

    Live Image:
    {{media url=imageDataUri}}

    Registered Members:
    {{#each members}}
    - Member ID: {{this.id}}
      Name: {{this.fullName}}
      Photo: {{media url=this.pictureUrl}}
    {{/each}}

    Instructions:
    1. Carefully examine the live image.
    2. Compare the person in the live image against each registered member's photo.
    3. If you find a clear match, set 'matchFound' to true and return the ID and full name of the matched member.
    4. If there is no clear match, set 'matchFound' to false.
    5. Prioritize accuracy. If you are not confident in a match, it is better to report no match.`,
});


const recognizeFaceFlow = ai.defineFlow(
  {
    name: 'recognizeFaceFlow',
    inputSchema: RecognizeFaceInputSchema,
    outputSchema: RecognizeFaceOutputSchema,
  },
  async (input) => {
    const allMembers = await getMembers();
    const membersWithPictures = allMembers.filter(m => m.pictureUrl);
    
    if (membersWithPictures.length === 0) {
      return { matchFound: false };
    }

    const { output } = await prompt({
        imageDataUri: input.imageDataUri,
        members: membersWithPictures.map(m => ({ id: m.id, fullName: m.fullName, pictureUrl: m.pictureUrl })),
    });
    
    return output!;
  }
);

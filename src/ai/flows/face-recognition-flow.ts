
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
import { googleAI } from '@genkit-ai/googleai';
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
    model: googleAI('gemini-pro-vision'),
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
    prompt: `You are an AI security agent performing face recognition for event check-in.

Your task is to determine if the person in the provided live image matches any of the registered members' profile photos.

Live Image to check:
{{media url=imageDataUri}}

Registered Member Photos:
{{#each members}}
- Member ID: {{this.id}}
  Name: {{this.fullName}}
  Photo: {{media url=this.pictureUrl}}
{{/each}}

Instructions:
1. Analyze the face in the live image.
2. Compare it against the profile photo of each registered member.
3. If you find a definitive, high-confidence match with one of the members, set 'matchFound' to true and provide the 'id' and 'fullName' of that member.
4. If you do not find a clear match, or if you have low confidence, you MUST set 'matchFound' to false. Do not guess.
5. Accuracy is critical. If you are not highly confident in a match, err on the side of caution and report 'matchFound: false'. Do not provide member details if no match is found.`,
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

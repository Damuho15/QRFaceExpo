
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
  fullName: z
    .string()
    .optional()
    .describe('The full name of the matched member, if any.'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Your confidence score from 0.0 to 1.0 on whether the person in the live image is a match to a registered member.'),
  reason: z
    .string()
    .optional()
    .describe('A brief, user-friendly reason if confidence is low (e.g., "Poor lighting", "Face partially obscured").'),
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
                pictureUrl: z.string(),
            })),
        }),
    },
    output: { schema: RecognizeFaceOutputSchema },
    prompt: `You are an AI security agent performing face recognition for event check-in.

Your task is to determine if the person in the provided live image matches any of the registered members' profile photos and provide a confidence score for your decision.

Live Image to check:
{{media url=imageDataUri}}

Registered Member Photos:
{{#each members}}
- Member ID: {{this.id}}
  Name: {{this.fullName}}
  Photo: {{media url=this.pictureUrl}}
{{/each}}

Instructions for Face Recognition and Confidence Scoring:
1. Analyze the face in the live image and compare it against the profile photo of each registered member.
2. If you find a potential match, you must determine a confidence score between 0.0 and 1.0. This is a semantic confidence, not a mathematical one.

Confidence Score Tiers:
- High Confidence (>= 0.9): Use this score if you are absolutely certain the person is a match to a registered member.
- Medium Confidence (0.7 - 0.89): Use this score if you are reasonably sure it is the same person but there are minor discrepancies (e.g., different angle, glasses, lighting).
- Low Confidence (< 0.7): If you are uncertain, the faces are not clearly visible, the faces are not similar, or the image quality is poor, you MUST return a confidence score below 0.7.

Output Rules:
- If you find a match (confidence >= 0.7), set 'matchFound' to true, provide the 'fullName' of the matched member, and set the 'confidence' score.
- If you do not find a clear match (confidence < 0.7), you MUST set 'matchFound' to false, 'fullName' to null, and set the 'confidence' score.
- If confidence is low (< 0.7), you MUST provide a brief, user-friendly 'reason' for the low confidence (e.g., "Poor lighting," "Face partially obscured," "Low similarity to member photo").
- Accuracy is critical. Do not guess.`,
});


const recognizeFaceFlow = ai.defineFlow(
  {
    name: 'recognizeFaceFlow',
    inputSchema: RecognizeFaceInputSchema,
    outputSchema: RecognizeFaceOutputSchema,
  },
  async (input) => {
    // Fetch all members for face recognition; we need to check against everyone.
    const { members: allMembers } = await getMembers(0, 10000); 
    const membersWithPictures = allMembers.filter(m => m.pictureUrl);
    
    if (membersWithPictures.length === 0) {
      return { matchFound: false, confidence: 0, reason: "No members with pictures are available in the database for comparison." };
    }

    const { output } = await prompt({
        imageDataUri: input.imageDataUri,
        members: membersWithPictures.map(m => ({ id: m.id, fullName: m.fullName, pictureUrl: m.pictureUrl! })),
    });
    
    return output!;
  }
);

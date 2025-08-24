
'use server';
/**
 * @fileOverview A face recognition AI agent for member check-in.
 *
 * - recognizeFace - A function that handles the face recognition process.
 * - RecognizeFaceInput - The input type for the recognizeFace function.
 * - RecognizeFaceOutput - The return type for the recognizeFace function.
 */

import { ai } from '@/ai/genkit';
import { getMembers, convertImageUrlToDataUri } from '@/lib/supabaseClient';
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
                pictureDataUri: z.string(),
            })),
        }),
    },
    output: { schema: RecognizeFaceOutputSchema },
    prompt: `You are a highly precise AI security agent specializing in face recognition for a secure check-in system. Your most important duty is to PREVENT a false positive (incorrectly matching two different people). It is better to reject a correct match than to accept an incorrect one.

Your task is to determine if the person in the provided live image is a biometric match to any of the registered members' profile photos. You must be extremely critical and look for subtle differences. Do not be fooled by similar hair, glasses, or general appearance.

Live Image to check:
{{media url=imageDataUri}}

Registered Member Photos:
{{#each members}}
- Member ID: {{this.id}}
  Name: {{this.fullName}}
  Photo: {{media url=this.pictureDataUri}}
{{/each}}
{{#if (eq members.length 0)}}
No member photos were provided for comparison.
{{/if}}

Instructions for Face Recognition and Confidence Scoring:
1. Scrutinize the biometric details in the live image and compare it against the profile photo of each registered member. Pay close attention to facial structure, eye spacing, nose shape, and jawline.
2. If you find a potential match, you must determine a confidence score between 0.0 and 1.0. This is a semantic confidence, not a mathematical one.

Confidence Score Tiers:
- High Confidence (>= 0.9): ONLY use this score if you are absolutely certain the person is a biometric match to a registered member.
- Medium Confidence (0.8 - 0.89): Use this score if you are reasonably sure, but there are minor, explainable discrepancies (e.g., slight angle difference, different lighting). Be very cautious.
- Low Confidence (< 0.8): If you have any doubt, the faces are not a clear match, the image quality is poor, or they simply look like two different people, you MUST return a confidence score below 0.8.

Output Rules:
- If you find a match (confidence >= 0.8), set 'matchFound' to true, provide the 'fullName' of the matched member, and set the 'confidence' score.
- If you do not find a clear match (confidence < 0.8), you MUST set 'matchFound' to false, 'fullName' to null, and set the 'confidence' score.
- If confidence is low (< 0.8), you MUST provide a brief, user-friendly 'reason' (e.g., "Low biometric similarity," "Poor lighting," "Face partially obscured").
- Accuracy and avoiding false positives is your top priority. Do not guess.`,
});


const recognizeFaceFlow = ai.defineFlow(
  {
    name: 'recognizeFaceFlow',
    inputSchema: RecognizeFaceInputSchema,
    outputSchema: RecognizeFaceOutputSchema,
  },
  async (input) => {
    // Fetch all members that have a picture URL.
    const { members: allMembersWithPictures } = await getMembers(0, 10000); 
    const membersWithPictures = allMembersWithPictures.filter(m => m.pictureUrl);
    
    if (membersWithPictures.length === 0) {
      return { matchFound: false, confidence: 0, reason: "No members with pictures are available in the database for comparison." };
    }
    
    const validMembersForPrompt = [];
    
    // Process members sequentially to avoid overwhelming the server.
    for (const member of membersWithPictures) {
        if (member.pictureUrl) {
            // Await the conversion for each member individually.
            const dataUri = await convertImageUrlToDataUri(member.pictureUrl);
            
            if (dataUri) {
                validMembersForPrompt.push({
                    id: member.id,
                    fullName: member.fullName,
                    pictureDataUri: dataUri,
                });
            }
            // If dataUri is null, the error is already logged by convertImageUrlToDataUri.
            // We simply skip adding this member to the prompt.
        }
    }
    
    if (validMembersForPrompt.length === 0) {
        return { matchFound: false, confidence: 0, reason: "Could not load member pictures for comparison." };
    }

    // Call the prompt with the members that have successfully loaded pictures.
    const { output } = await prompt({
        imageDataUri: input.imageDataUri,
        members: validMembersForPrompt,
    });
    
    return output!;
  }
);

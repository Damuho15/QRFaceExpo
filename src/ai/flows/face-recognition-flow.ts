
'use server';
/**
 * @fileOverview A face recognition AI agent for member check-in.
 *
 * - recognizeFace - A function that handles the face recognition process.
 * - RecognizeFaceInput - The input type for the recognizeFace function.
 * - RecognizeFaceOutput - The return type for the recognizeFace function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getRegisteredMembers } from '@/ai/tools/get-registered-members-tool';

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
    input: { schema: RecognizeFaceInputSchema },
    output: { schema: RecognizeFaceOutputSchema },
    tools: [getRegisteredMembers],
    model: 'gemini-1.5-flash-latest',
    prompt: `You are a highly precise AI security agent specializing in face recognition for a secure check-in system. Your most important duty is to PREVENT a false positive (incorrectly matching two different people). It is better to reject a correct match than to accept an incorrect one.

Your task is to determine if the person in the provided live image is a biometric match to any of the registered members' profile photos. You must be extremely critical and look for subtle differences. Do not be fooled by similar hair, glasses, or general appearance.

To get the list of registered members to compare against, you MUST use the 'getRegisteredMembers' tool. Do not try to guess or hallucinate member data.

Live Image to check:
{{media url=imageDataUri}}

Instructions for Face Recognition and Confidence Scoring:
1. Call the 'getRegisteredMembers' tool to get the list of members and their profile pictures.
2. If the tool returns an empty list or indicates an error, you MUST set 'matchFound' to false, confidence to 0, and the reason to "Could not load member pictures for comparison." Do not proceed.
3. If the tool returns members, scrutinize the biometric details in the live image and compare it against the profile photo of each registered member. Pay close attention to facial structure, eye spacing, nose shape, and jawline.
4. If you find a potential match, you must determine a confidence score between 0.0 and 1.0. This is a semantic confidence, not a mathematical one.

Confidence Score Tiers:
- High Confidence (>= 0.9): ONLY use this score if you are absolutely certain the person is a biometric match to a registered member. The match should be undeniable.
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
    const { output } = await prompt(input);
    return output!;
  }
);

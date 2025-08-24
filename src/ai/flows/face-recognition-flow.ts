
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

// Define the Tool for the AI to fetch member data on its own.
const getRegisteredMembers = ai.defineTool(
    {
        name: 'getRegisteredMembers',
        description: 'Retrieves a list of all registered members, including their full name and profile picture as a data URI, for face recognition comparison.',
        inputSchema: z.object({}),
        outputSchema: z.object({
             members: z.array(z.object({
                id: z.string(),
                fullName: z.string(),
                pictureDataUri: z.string(),
            })),
        })
    },
    async () => {
        console.log('Tool: getRegisteredMembers starting...');
        const { members: allMembersWithPictures } = await getMembers(0, 10000); 
        const membersWithPictures = allMembersWithPictures.filter(m => m.pictureUrl);
        
        if (membersWithPictures.length === 0) {
            console.log('Tool: No members with pictures found.');
            return { members: [] };
        }

        const validMembersForPrompt = [];
        
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
                } catch (toolError) {
                    console.error(`Tool: Error converting image for member ${member.id}`, toolError);
                }
            }
        }
        
        console.log(`Tool: Successfully processed ${validMembersForPrompt.length} members.`);
        return { members: validMembersForPrompt };
    }
);


const prompt = ai.definePrompt({
    name: 'recognizeFacePrompt',
    input: { schema: RecognizeFaceInputSchema },
    output: { schema: RecognizeFaceOutputSchema },
    tools: [getRegisteredMembers],
    prompt: `You are a highly precise AI security agent specializing in face recognition for a secure check-in system. Your most important duty is to PREVENT a false positive (incorrectly matching two different people). It is better to reject a correct match than to accept an incorrect one.

Your task is to determine if the person in the provided live image is a biometric match to any of the registered members' profile photos. You must be extremely critical and look for subtle differences. Do not be fooled by similar hair, glasses, or general appearance.

To get the list of registered members to compare against, you MUST use the 'getRegisteredMembers' tool.

Live Image to check:
{{media url=imageDataUri}}

Instructions for Face Recognition and Confidence Scoring:
1. Scrutinize the biometric details in the live image and compare it against the profile photo of each registered member returned by the tool. Pay close attention to facial structure, eye spacing, nose shape, and jawline.
2. If you find a potential match, you must determine a confidence score between 0.0 and 1.0. This is a semantic confidence, not a mathematical one.

Confidence Score Tiers:
- High Confidence (>= 0.9): ONLY use this score if you are absolutely certain the person is a biometric match to a registered member.
- Medium Confidence (0.8 - 0.89): Use this score if you are reasonably sure, but there are minor, explainable discrepancies (e.g., slight angle difference, different lighting). Be very cautious.
- Low Confidence (< 0.8): If you have any doubt, the faces are not a clear match, the image quality is poor, or they simply look like two different people, you MUST return a confidence score below 0.8.

Output Rules:
- If you find a match (confidence >= 0.8), set 'matchFound' to true, provide the 'fullName' of the matched member, and set the 'confidence' score.
- If you do not find a clear match (confidence < 0.8), you MUST set 'matchFound' to false, 'fullName' to null, and set the 'confidence' score.
- If confidence is low (< 0.8), you MUST provide a brief, user-friendly 'reason' (e.g., "Low biometric similarity," "Poor lighting," "Face partially obscured").
- If the 'getRegisteredMembers' tool returns an empty list of members, you MUST set 'matchFound' to false, confidence to 0, and the reason to "No registered member photos are available for comparison."
- Accuracy and avoiding false positives is your top priority. Do not guess.`,
});


const recognizeFaceFlow = ai.defineFlow(
  {
    name: 'recognizeFaceFlow',
    inputSchema: RecognizeFaceInputSchema,
    outputSchema: RecognizeFaceOutputSchema,
  },
  async (input) => {
    // The flow is now much simpler. It just calls the prompt and lets the AI use the tool.
    const { output } = await prompt(input);
    return output!;
  }
);

import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini API client
// Accessing API key from process.env as per strict guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a warm caption for the provided image using Gemini Flash.
 * @param base64Image The base64 encoded image string (without data URI prefix).
 * @param userLanguage The preferred language for the caption.
 * @returns A promise resolving to the generated text.
 */
export const generatePhotoCaption = async (base64Image: string, userLanguage: string): Promise<string> => {
  try {
    const modelId = 'gemini-2.5-flash'; 
    
    const prompt = `You are a warm, nostalgic photo camera. 
    Look at this image and write a very short, handwritten-style blessing or nice comment about the specific content of the image. 
    Keep it under 15 words. 
    The output language must be: ${userLanguage}. 
    Do not include quotes.`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    return response.text || "A beautiful moment captured in time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "A special memory.";
  }
};
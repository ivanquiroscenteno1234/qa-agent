import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import { getQaLlmConfig } from "./config";

// Setup API Client based on environment variable config
let genAI: GoogleGenerativeAI | null = null;
const config = getQaLlmConfig();

if (config.enabled && config.apiKeyPresent) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
}

export async function generateStructuredContent<T>(
  prompt: string,
  schema: Schema,
  systemInstruction?: string
): Promise<T | null> {
  if (!genAI || !config.enabled) {
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: config.model,
      systemInstruction: systemInstruction,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return JSON.parse(text) as T;
  } catch (error) {
    console.error("LLM Generation Error:", error);
    return null;
  }
}

export async function generateTextContent(prompt: string, systemInstruction?: string): Promise<string | null> {
    if (!genAI || !config.enabled) {
      return null;
    }

    try {
      const model = genAI.getGenerativeModel({
        model: config.model,
        systemInstruction: systemInstruction
      });

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("LLM Text Generation Error:", error);
      return null;
    }
  }

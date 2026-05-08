import { GoogleGenAI, Type } from "@google/genai";
import { getGeminiApiKey } from "../lib/env";

let _ai: GoogleGenAI | null = null;
function getAI() {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: getGeminiApiKey() || 'UNSET' });
  return _ai;
}

export interface TransactionExtraction {
  name: string;
  date: string;
  amount: number;
  reference: string;
  currency: string;
  category: string;
}

export async function extractTransactionFromText(text: string): Promise<TransactionExtraction | null> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract transaction details (sender name, date, amount as number, reference number, currency, and category like "Savings", "Loan Repayment", "Contribution", "Business") from this SMS or text message. If details are missing, provide best guesses or null. Return JSON only.\n\nMessage:\n${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            date: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            reference: { type: Type.STRING },
            currency: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: ["name", "amount", "reference", "category"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    return data as TransactionExtraction;
  } catch (error) {
    console.error("AI Extraction Error:", error);
    return null;
  }
}

export async function extractTransactionFromImage(base64Image: string, mimeType: string): Promise<TransactionExtraction | null> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
        {
          text: "Analyze this receipt or transaction confirmation image and extract: sender name, date, amount as a number, reference number, currency, and category (e.g. 'Savings', 'Loan Repayment'). Return JSON only.",
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            date: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            reference: { type: Type.STRING },
            currency: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: ["name", "amount", "reference", "category"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    return data as TransactionExtraction;
  } catch (error) {
    console.error("AI Image Extraction Error:", error);
    return null;
  }
}

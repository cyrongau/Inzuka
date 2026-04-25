import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface ExtractedReceiptData {
  amount: number;
  date: string;
  merchant: string;
  description: string;
  reference: string;
  category: string;
  transactionType: "payment" | "deposit" | "withdrawal";
  confidence: number;
}

export async function scanReceipt(base64Image: string, mimeType: string): Promise<ExtractedReceiptData> {
  const prompt = `You are a financial OCR expert. Extract data from this receipt/transaction record. 
  1. Find the amount, date, and merchant/party.
  2. Categorize the spending into one of: 'rent', 'school_fees', 'utility', 'medical', 'insurance', 'emergency', 'misc', 'transport', 'project', 'gaming', 'food', 'shopping'.
  3. Determine the transaction type ('payment', 'deposit', or 'withdrawal').`;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: {
      parts: [
        { inlineData: { data: base64Image.split(',')[1] || base64Image, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          amount: { type: Type.NUMBER },
          date: { type: Type.STRING },
          merchant: { type: Type.STRING },
          description: { type: Type.STRING },
          reference: { type: Type.STRING },
          category: { type: Type.STRING },
          transactionType: { type: Type.STRING },
          confidence: { type: Type.NUMBER }
        },
        required: ["amount", "date", "merchant", "description", "category", "transactionType"]
      }
    }
  });
  
  return JSON.parse(response.text.trim());
}

export async function parseTransactionText(text: string): Promise<ExtractedReceiptData> {
  const prompt = `You are a financial NLP expert parsing transaction SMS or raw text (e.g., M-Pesa, Bank logs). 
  Analyze the text: "${text}"
  
  CRITICAL INSTRUCTIONS:
  1. Determine if this is a "deposit" (income/received funds), "payment" (expense/sent funds), or "withdrawal".
     - Keywords like "received", "deposited", "remittance", "inward" typically mean "deposit".
     - Keywords like "paid", "sent", "withdrawn", "buy goods" typically mean "payment" or "withdrawal".
  2. Extract the amount, date, the other party (merchant or person), and any reference number.
  3. Categorize into: 'rent', 'school_fees', 'utility', 'medical', 'insurance', 'emergency', 'misc', 'transport', 'business', 'food', 'shopping'.
  4. Accuracy is vital. If unsure, default to 'misc' category and 'payment' type.`;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          amount: { type: Type.NUMBER },
          date: { type: Type.STRING },
          merchant: { type: Type.STRING },
          description: { type: Type.STRING },
          reference: { type: Type.STRING },
          category: { type: Type.STRING },
          transactionType: { type: Type.STRING },
          confidence: { type: Type.NUMBER }
        },
        required: ["amount", "date", "merchant", "description", "category", "transactionType"]
      }
    }
  });
  return JSON.parse(response.text.trim());
}

export async function getSmartReply(messages: { text: string, senderId: string }[]): Promise<string> {
  try {
    const chatContext = messages.map(m => `${m.senderId}: ${m.text}`).join('\n');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `As a helpful family assistant, suggest a brief, lighthearted reply to the last message:\n${chatContext}\nKeep it under 15 words.`,
    });
    return response.text || "";
  } catch (e) {
    return "";
  }
}

export async function generateRecipe(theme: string, region: string): Promise<any> {
    const prompt = `Generate a realistic recipe based on this theme: "${theme}" and region/culture: "${region}". 
    Provide standard meal/recipe components. Quantity must be a number, Unit must be a string like "pieces", "kg", "grams", "Liters", "cups", "tbsp", etc.`;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    category: { type: Type.STRING, description: "E.g., Breakfast, Lunch, Dinner, Dessert" },
                    servings: { type: Type.NUMBER, description: "Base number of servings" },
                    instructions: { type: Type.STRING, description: "Step by step cooking guide" },
                    ingredients: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                quantity: { type: Type.NUMBER },
                                unit: { type: Type.STRING }
                            },
                            required: ["name", "quantity", "unit"]
                        }
                    }
                },
                required: ["title", "category", "ingredients"]
            }
        }
    });

    return JSON.parse(response.text.trim());
}

export interface SmartProductScan {
  name: string;
  brand: string;
  price: number;
  currency: string;
  store: string;
  isDiscounted: boolean;
  discountInfo: string;
  savingAdvice: string;
}

export async function scanProduct(base64Image: string, mimeType: string): Promise<SmartProductScan> {
  const prompt = `Analyze this price tag or product image from a grocery store. 
  1. Extract the product name and brand/manufacturer.
  2. Find the current price and currency.
  3. Identify the store name if visible.
  4. Detect if there is a shelf discount or special offer and summarize it.
  5. Provide brief "saving advice" (e.g., 'Good deal compared to typical prices' or 'Wait for a better discount').`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Image.split(',')[1] || base64Image, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          brand: { type: Type.STRING },
          price: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          store: { type: Type.STRING },
          isDiscounted: { type: Type.BOOLEAN },
          discountInfo: { type: Type.STRING },
          savingAdvice: { type: Type.STRING }
        },
        required: ["name", "brand", "price", "isDiscounted", "savingAdvice"]
      }
    }
  });
  
  return JSON.parse(response.text.trim());
}

export async function getShoppingInsights(inventory: any[], shoppingHistory: any[]): Promise<string> {
  const inventorySummary = inventory.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ');
  const historySummary = shoppingHistory.map(h => `${h.name}`).join(', ');

  const prompt = `Based on this family's inventory: [${inventorySummary}] and shopping history/lists: [${historySummary}], 
  provide a concise, insightful summary (max 60 words) about their most stocked items, favorite brands (if detectable by names), 
  and one smart shopping suggestion for the next trip. Keep it friendly and helpful.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Start scanning items to see personalized family insights here.";
  } catch (e) {
    return "Insights are currently unavailable.";
  }
}

export async function generateWeeklyMealPlan(startDate: string): Promise<any[]> {
  const prompt = `Generate a healthy weekly meal plan for 7 days starting from ${startDate}. 
  Provide a diverse range of meals suitable for a family.
  Response MUST be a JSON array of objects.
  Each object: {"date": "YYYY-MM-DD", "breakfast": "dish name", "lunch": "dish name", "dinner": "dish name"}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            breakfast: { type: Type.STRING },
            lunch: { type: Type.STRING },
            dinner: { type: Type.STRING }
          },
          required: ["date", "breakfast", "lunch", "dinner"]
        }
      }
    }
  });

  return JSON.parse(response.text.trim());
}

export interface ExtractedIdentityData {
  fullName: string;
  idNumber: string;
  dateOfBirth: string; // DD-MM-YYYY
  age: number;
  gender: string;
  nationality: string;
  confidence: number;
}

export async function extractIdentityData(base64Image: string, mimeType: string): Promise<ExtractedIdentityData> {
  const prompt = `You are an expert identity document verification assistant. 
  Analyze this identity document (ID Card, Passport, etc.).
  1. Extract the full name, ID/Passport number, and DATE OF BIRTH.
  2. For Date of Birth, carefully look for "Date of Birth" or "DOB". In Kenyan IDs/Passports, this is formatted as DD-MM-YYYY.
  3. Calculate the age based on today's date (April 25, 2026).
  4. Accuracy is mission-critical. If any field is unclear, mark it as "Unknown".
  
  Format the Date of Birth as DD-MM-YYYY.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Image.split(',')[1] || base64Image, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullName: { type: Type.STRING },
          idNumber: { type: Type.STRING },
          dateOfBirth: { type: Type.STRING },
          age: { type: Type.NUMBER },
          gender: { type: Type.STRING },
          nationality: { type: Type.STRING },
          confidence: { type: Type.NUMBER }
        },
        required: ["fullName", "idNumber", "dateOfBirth", "age"]
      }
    }
  });
  
  return JSON.parse(response.text.trim());
}

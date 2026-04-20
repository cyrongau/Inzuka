import { GoogleGenAI, Type } from "@google/genai";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, getDoc, doc } from "firebase/firestore";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
  console.warn("GEMINI_API_KEY is not configured or is using the placeholder value.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

async function getChildAge(userId: string): Promise<string> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.age) return String(data.age);
      if (data.dateOfBirth) {
        const birthDate = new Date(data.dateOfBirth);
        const age = new Date().getFullYear() - birthDate.getFullYear();
        return String(age);
      }
    }
  } catch (e) {
    console.error("Error fetching child age:", e);
  }
  return '8-12'; // Default fallback
}

export async function generateEducationalContent(childUserId: string, category: string, familyId: string) {
  const age = await getChildAge(childUserId);
  const prompt = `Generate a short, engaging educational lesson for a child aged ${age} about ${category}. 
  The content should be in Markdown format. 
  Categories include: Language, Math, Science, Music, Art, Bible Study, Etiquette, Hygiene.
  Make it fun and age-appropriate.`;

  console.log('Generating content for:', { age, category, familyId });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
    });

    const content = response.text;
    
    if (!content) {
      throw new Error("No content generated from Gemini.");
    }
    
    // Save to Firestore
    await addDoc(collection(db, "educationContent"), {
      title: `${category} Lesson for age ${age}`,
      category,
      ageRange: age,
      content,
      familyId,
      assignedToUserId: childUserId,
      createdAt: serverTimestamp(),
    });

    return content;
  } catch (error) {
    console.error("Gemini Educational Content Generation Error:", error);
    throw error;
  }
}

export async function generateGrowthTasks(userId: string, familyId: string, assignedBy: string) {
  const age = await getChildAge(userId);
  const prompt = `Suggest 3 growth tasks for a child aged ${age}. 
  Return as JSON.
  Categories: Hygiene, Etiquette, Discipline, Language, Math, Science, Music, Art, Bible Study.
  Include properties: title, description, category, points (10-50).`;

  console.log('Generating tasks for:', { age, userId, familyId });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              points: { type: Type.NUMBER },
            },
            required: ["title", "description", "category", "points"],
          },
        },
      },
    });

    const tasks = JSON.parse(response.text || "[]");
    
    // Auto-assign tasks to child via Firestore
    for (const task of tasks) {
      await addDoc(collection(db, "growthTasks"), {
        ...task,
        ageRange: age,
        assignedToUserId: userId,
        assignedByUserId: assignedBy,
        familyId,
        currentValue: 0,
        targetValue: 1,
        isCompleted: false,
        createdAt: serverTimestamp(),
      });
    }

    return tasks;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}

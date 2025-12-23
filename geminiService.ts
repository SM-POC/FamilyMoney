
import { GoogleGenAI, Type } from "@google/genai";

// Check if API Key is present for feature toggling
export const HAS_AI_ACCESS = !!(process.env.API_KEY && process.env.API_KEY !== "undefined");

const ai = HAS_AI_ACCESS ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

export const scanReceipt = async (base64Image: string) => {
  if (!ai) throw new Error("AI service unavailable");
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1] || base64Image
            }
          },
          {
            text: "Analyze this UK receipt in extreme detail. Extract Merchant, Date (YYYY-MM-DD), Payment Method, Last 4 digits, and all line items with suggested categories. GBP £."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING },
            date: { type: Type.STRING },
            paymentMethod: { type: Type.STRING },
            cardLast4: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  category: { type: Type.STRING }
                },
                required: ["description", "amount", "category"]
              }
            }
          },
          required: ["merchant", "date", "items"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error scanning receipt:", error);
    throw error;
  }
};

export const getFinancialAdvice = async (financialSummary: string) => {
  if (!ai) return "";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `UK financial advice for: ${financialSummary}. 3 short tips, <150 words.`,
      config: { temperature: 0.7 }
    });
    return response.text;
  } catch (error) {
    return "Consolidate high-interest debt into lower-rate options.";
  }
};

export const findDebtOptimizationDeals = async (highestInterestDebt: number, balance: number) => {
  if (!ai) return { deals: [], sources: [] };
  try {
    const prompt = `Find UK balance transfer cards for £${balance} debt at ${highestInterestDebt}% interest.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              url: { type: Type.STRING },
              savingsEstimate: { type: Type.STRING }
            },
            required: ["title", "description", "url", "savingsEstimate"]
          }
        }
      }
    });
    return {
      deals: JSON.parse(response.text),
      sources: (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []).map(c => c.web?.uri).filter(Boolean) as string[]
    };
  } catch (error) {
    return { deals: [], sources: [] };
  }
};

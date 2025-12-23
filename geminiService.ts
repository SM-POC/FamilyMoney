const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.API_KEY || "";
export const HAS_AI_ACCESS = !!(OPENAI_API_KEY && OPENAI_API_KEY !== "undefined");
const OPENAI_MODEL = 'gpt-4o-mini';

const callOpenAI = async (payload: Record<string, any>) => {
  if (!HAS_AI_ACCESS) throw new Error("AI service unavailable");

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({ model: OPENAI_MODEL, ...payload })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  return typeof content === 'string' ? content : JSON.stringify(content);
};

export const scanReceipt = async (base64Image: string) => {
  const dataUrl = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;

  const content = await callOpenAI({
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "Extract UK receipt details. Return JSON with keys: merchant, date (YYYY-MM-DD), paymentMethod, cardLast4 (string or null), items (array of {description, amount, category}). Keep GBP amounts as numbers."
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze this receipt image and return the JSON structure described." },
          { type: "image_url", image_url: { url: dataUrl } }
        ]
      }
    ]
  });

  try {
    return JSON.parse(content);
  } catch (err) {
    console.error("Failed to parse receipt JSON:", content);
    throw err;
  }
};

export const getFinancialAdvice = async (financialSummary: string) => {
  if (!HAS_AI_ACCESS) return "";
  try {
    return await callOpenAI({
      messages: [
        { role: "system", content: "You are a concise UK personal finance coach. Keep responses under 150 words." },
        { role: "user", content: `Give 3 short tips for this situation: ${financialSummary}` }
      ],
      temperature: 0.7
    });
  } catch (error) {
    return "Consolidate high-interest debt into lower-rate options.";
  }
};

export const findDebtOptimizationDeals = async (highestInterestDebt: number, balance: number) => {
  if (!HAS_AI_ACCESS) return { deals: [], sources: [] };
  try {
    const content = await callOpenAI({
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return JSON with deals: array of {title, description, url, savingsEstimate}. UK-focused, concise." },
        { role: "user", content: `Find UK balance transfer or refinance options for £${balance} at ${highestInterestDebt}% APR.` }
      ]
    });
    const parsed = JSON.parse(content);
    return { deals: parsed.deals || [], sources: parsed.sources || [] };
  } catch (error) {
    return { deals: [], sources: [] };
  }
};

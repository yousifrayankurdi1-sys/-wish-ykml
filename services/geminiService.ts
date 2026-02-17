
import { GoogleGenAI, Type } from "@google/genai";
import { CategoryType, GameMode, GameQuestion, SourceLink } from "../types";

export const generateGameQuestion = async (category: CategoryType, mode: GameMode): Promise<GameQuestion> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const promptMap = {
    [CategoryType.SAUDI]: "ثقافة المجتمع السعودي، عادات العوائل، مضحك، هبة الترندات المحلية، أشياء نبحث عنها في أبشر أو حراج، نكت اجتماعية.",
    [CategoryType.GAMING]: "مجتمع اللاعبين في السعودية، فيفا، كود، روكس، طقطقة على النوبات، ستيمرز مشهورين مثل بندريتا وأبو فلة.",
    [CategoryType.RAP]: "الراب السعودي والخليجي، دسّات مشهورة، كلمات أغاني عالقة في الذهن، صراعات الرابرز (بيف).",
    [CategoryType.FOOD]: "جوع نص الليل، مطاعم الهبة، صبات، البيك، أسئلة غريبة عن السعرات في أكلات شعبية.",
    [CategoryType.ANIMALS]: "تربية القطط والكلاب في السعودية، أسئلة غريبة عن ضب، جمل، أو حيوانات برية.",
    [CategoryType.ANIME]: "ترندات الأنمي في السعودية، نظريات ون بيس، قتالات جوجيتسو، ذكريات سبيستون.",
    [CategoryType.GENERAL]: "أسئلة وجودية غريبة يبحث عنها الناس وهم طفشانين، معلومات عامة بأسلوب ساخر."
  };

  const systemInstruction = `أنت خبير في الترندات والبحث في السعودية. مهمتك إنشاء سؤال للعبة "وش يكمل؟".
  اجعل الجملة الافتتاحية (starter) مشوقة. الإجابات يجب أن تكون منطقية ومنتشرة فعلياً.
  استخدم لهجة سعودية بيضاء مفهومة. كن سريعاً جداً ومباشراً.`;

  let difficultyInstruction = "";
  if (mode === GameMode.EASY) {
    difficultyInstruction = "الصعوبة: سهلة جداً.";
  } else if (mode === GameMode.MEDIUM) {
    difficultyInstruction = "الصعوبة: متوسطة.";
  } else {
    difficultyInstruction = "الصعوبة: قادحة (صعبة جداً).";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `أنشئ سؤالاً في تصنيف: ${category}. السياق: ${promptMap[category]}. ${difficultyInstruction}`,
      config: {
        systemInstruction,
        // تعطيل التفكير لتقليل Latency وزيادة السرعة
        thinkingConfig: { thinkingBudget: 0 },
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            starter: { type: Type.STRING },
            answers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  points: { type: Type.NUMBER },
                },
                required: ["text", "points"],
              },
            },
          },
          required: ["starter", "answers"],
        },
      },
    });

    const sources: SourceLink[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          sources.push({ uri: chunk.web.uri, title: chunk.web.title || "مصدر خارجي" });
        }
      });
    }

    const rawData = JSON.parse(response.text.trim());
    return {
      starter: rawData.starter,
      answers: rawData.answers.map((a: any, index: number) => ({
        ...a,
        rank: index + 1,
        revealed: false
      })).slice(0, 5),
      sources: sources.length > 0 ? sources : undefined,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    // Fallback سريع في حال التأخير أو الخطأ
    return {
      starter: "افضل مطعم في...",
      answers: [
        { text: "الرياض", points: 100, rank: 1, revealed: false },
        { text: "جدة", points: 80, rank: 2, revealed: false },
        { text: "مكة", points: 60, rank: 3, revealed: false },
        { text: "الدمام", points: 40, rank: 4, revealed: false },
        { text: "الخبر", points: 20, rank: 5, revealed: false },
      ]
    };
  }
};

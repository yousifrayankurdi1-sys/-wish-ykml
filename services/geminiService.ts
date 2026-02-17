
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

  const systemInstruction = `أنت خبير في الترندات والبحث في السعودية. مهمتك إنشاء سؤال للعبة "وش يكمل؟" (Google Feud).
  يجب أن يكون السؤال:
  1. ممتعاً وقريباً من واقع الناس (Relatable).
  2. يستخدم مصطلحات سعودية دارجة (Slang) إذا لزم الأمر.
  3. الإجابات يجب أن تكون منطقية ومنتشرة فعلياً في محركات البحث.
  4. اجعل الجملة الافتتاحية (starter) مشوقة وغامضة قليلاً لزيادة الحماس.`;

  let difficultyInstruction = "";
  if (mode === GameMode.EASY) {
    difficultyInstruction = "الصعوبة: سهلة جداً. استخدم أشهر الترندات التي يعرفها الجميع الصغير والكبير.";
  } else if (mode === GameMode.MEDIUM) {
    difficultyInstruction = "الصعوبة: متوسطة. اخلط بين الأسئلة المعروفة والأسئلة التي تحتاج تفكير.";
  } else {
    difficultyInstruction = "الصعوبة: قادحة (صعبة). استخدم تفاصيل دقيقة أو ترندات قديمة أو أسئلة تخصصية جداً.";
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `أنشئ سؤالاً في تصنيف: ${category}.
    السياق: ${promptMap[category]}
    ${difficultyInstruction}
    تأكد أن الإجابات مرتبة من الأكثر بحثاً (100 نقطة) إلى الأقل (20 نقطة).
    تنسيق JSON: {"starter": "string", "answers": [{"text": "string", "points": number}]}`,
    config: {
      systemInstruction,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          starter: { type: Type.STRING, description: "بداية جملة البحث (مثلاً: ليش السعودي إذا...)" },
          answers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "تكملة البحث" },
                points: { type: Type.NUMBER, description: "نقاط الإجابة" },
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

  try {
    const rawData = JSON.parse(response.text.trim());
    return {
      starter: rawData.starter,
      answers: rawData.answers.map((a: any, index: number) => ({
        ...a,
        rank: index + 1,
        revealed: false
      })).slice(0, 5), // نكتفي بأفضل 5 إجابات لجمالية العرض
      sources: sources.length > 0 ? sources : undefined,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    return {
      starter: "افضل مطعم في...",
      answers: [
        { text: "الرياض", points: 100, rank: 1, revealed: false },
        { text: "جدة", points: 80, rank: 2, revealed: false },
        { text: "العالم", points: 60, rank: 3, revealed: false },
        { text: "التحلية", points: 40, rank: 4, revealed: false },
        { text: "الشرقية", points: 20, rank: 5, revealed: false },
      ]
    };
  }
};

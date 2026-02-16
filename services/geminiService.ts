
import { GoogleGenAI, Type } from "@google/genai";
import { CategoryType, GameMode, GameQuestion, SourceLink } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateGameQuestion = async (category: CategoryType, mode: GameMode): Promise<GameQuestion> => {
  const promptMap = {
    [CategoryType.SAUDI]: "Saudi culture, social habits, and current local trends. Focus on funny social situations.",
    [CategoryType.GAMING]: "Focus on POPULAR GAMES (FIFA/FC, CoD, Fortnite, Roblox, GTA, Elden Ring), gaming streamers (BanderitaX, OCMz, etc.), and gaming memes. AVOID technical router settings, ISP configurations, or boring network fixes unless it's a very specific 'Hard' meme.",
    [CategoryType.RAP]: "FACTUAL Saudi/Arabic rap scene. IMPORTANT: Verify group memberships (e.g., Qiyadat Ulya includes Rand, Slow Moe, etc. - they are a TEAM, not enemies). Focus on famous lyrics, beefs, and hit songs.",
    [CategoryType.FOOD]: "Saudi food, restaurant chains (AlBaik, Maestro, etc.), and popular cravings.",
    [CategoryType.ANIMALS]: "Wildlife and pet-related searches in the Arab world.",
    [CategoryType.ANIME]: "Anime trends and Otaku culture in the Middle East (One Piece, Naruto, JJK, etc.).",
    [CategoryType.GENERAL]: "General knowledge and popular random questions people actually search for fun."
  };

  let difficultyInstruction = "";
  if (mode === GameMode.EASY) {
    difficultyInstruction = "DIFFICULTY: EXTREMELY EASY. Use viral, obvious search completions that everyone knows.";
  } else if (mode === GameMode.MEDIUM) {
    difficultyInstruction = "DIFFICULTY: MODERATE. Standard popular search trends.";
  } else {
    difficultyInstruction = "DIFFICULTY: HARD. Use specific details, niche facts, or slightly older trends that only 'OGs' would remember. Still, keep it related to the category's FUN side, not dry technical manuals.";
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a 'Google Feud' style JSON for category: ${category}.
    Context: ${promptMap[category]}
    ${difficultyInstruction}
    
    IMPORTANT: The 'starter' should be a common search beginning in Arabic (e.g., "متى ينزل...", "كيف العب...", "افضل شخصية في...").
    The 'answers' must be the most likely or funniest completions found in real Saudi/Arabic search trends.
    
    Format: {"starter": "string", "answers": [{"text": "string", "points": number}]}`,
    config: {
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

  // Extract grounding sources
  const sources: SourceLink[] = [];
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (groundingChunks) {
    groundingChunks.forEach((chunk: any) => {
      if (chunk.web?.uri) {
        sources.push({
          uri: chunk.web.uri,
          title: chunk.web.title || "مصدر خارجي"
        });
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
      })),
      sources: sources.length > 0 ? sources : undefined
    };
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    return {
      starter: "افضل لعبة في...",
      answers: [
        { text: "العالم", points: 100, rank: 1, revealed: false },
        { text: "التاريخ", points: 80, rank: 2, revealed: false },
        { text: "سوني 5", points: 60, rank: 3, revealed: false },
        { text: "الجوال", points: 40, rank: 4, revealed: false },
        { text: "البي سي", points: 20, rank: 5, revealed: false },
      ]
    };
  }
};

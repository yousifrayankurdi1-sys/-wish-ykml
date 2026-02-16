
import { CategoryType, GameMode } from './types';

export const CATEGORIES = [
  { id: CategoryType.SAUDI, name: 'سعودي 🇸🇦', icon: '🌴', description: 'أشياء ما يفهمها إلا حنا' },
  { id: CategoryType.GAMING, name: 'قيمنق 🎮', icon: '🕹️', description: 'سيرشات القيمرز' },
  { id: CategoryType.ANIME, name: 'انمي 🎌', icon: '🎋', description: 'عالم الاوتاكو، جوجيتسو كايسن والترندات' },
  { id: CategoryType.RAP, name: 'راب 🎤', icon: '🎧', description: 'الراب السعودي والعربي' },
  { id: CategoryType.FOOD, name: 'أكل 🍔', icon: '🍟', description: 'جوع السهرة والبحث' },
  { id: CategoryType.ANIMALS, name: 'حيوانات 🐾', icon: '🦁', description: 'عالم الحيوان والبحث' },
  { id: CategoryType.GENERAL, name: 'عامة 💡', icon: '🌍', description: 'ثقافة عامة وأسئلة غريبة' },
];

export const GAME_MODES = [
  { id: GameMode.EASY, name: 'سهل ✅', description: 'أسئلة واضحة، وقت طويل، و5 قلوب' },
  { id: GameMode.MEDIUM, name: 'متوسط ⚖️', description: 'توازن بين السهولة والصعوبة، و3 قلوب' },
  { id: GameMode.HARD, name: 'صعب 🔥', description: 'توقعات غريبة، وقت ضيق، وقلبين بس' }
];

export const FUNNY_WRONG_ANSWERS = [
  "مين قال كذا؟ 😂",
  "يا شيخ رح نم بس 😴",
  "سيرش حقك مضروب 🚫",
  "انت من وين جايب هالمعلومات؟ 🧐",
  "الوالدة هي اللي تبحث كذا? 👀",
  "شكلك مضيع هذي مو جوجل 🤡",
  "جرب مرة ثانية بس برواقة ☕"
];

export const INITIAL_TIME_EASY = 90;
export const INITIAL_TIME_MEDIUM = 60;
export const INITIAL_TIME_HARD = 40;

export const MAX_LIVES_EASY = 5;
export const MAX_LIVES_MEDIUM = 3;
export const MAX_LIVES_HARD = 2;

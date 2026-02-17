
import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { GameCard } from './components/GameCard';
import { CategoryType, GameMode, GameState, AdminStats, GameQuestion } from './types';
import { 
  CATEGORIES, 
  GAME_MODES, 
  FUNNY_WRONG_ANSWERS, 
  INITIAL_TIME_EASY, 
  INITIAL_TIME_MEDIUM,
  INITIAL_TIME_HARD, 
  MAX_LIVES_EASY, 
  MAX_LIVES_MEDIUM,
  MAX_LIVES_HARD 
} from './constants';
import { generateGameQuestion } from './services/geminiService';
import { syncAnnouncement, updateAnnouncementInCloud, db } from './services/firebase';

const normalizeArabic = (str: string): string => {
  return str
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^ا-ي0-9]/g, ''); 
};

const getEditDistance = (a: string, b: string): number => {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1] 
        ? matrix[i - 1][j - 1] 
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
};

const LOADING_MESSAGES = [
  "جاري جلب آخر الهبّات...",
  "نشوف الناس وش يبحثون عنه...",
  "لحظة، الذكاء الاصطناعي قاعد يتقهوى...",
  "نجهز لك سؤال يخليك تحك راسك...",
  "اتصال بسيرفرات جوجل القادحة..."
];

const App: React.FC = () => {
  const [state, setState] = useState<GameState>({
    currentQuestion: null,
    score: 0,
    lives: 3,
    timeLeft: 60,
    status: 'idle',
    category: null,
    mode: GameMode.MEDIUM,
    lastGuessCorrect: null,
    funnyResponse: ''
  });

  const [showAdmin, setShowAdmin] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [siteAnnouncement, setSiteAnnouncement] = useState('🔥 العب الآن وجرب حظك في توقع البحث السعودي!');
  const [isUpdatingCloud, setIsUpdatingCloud] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalQuestionsGenerated: 0,
    averageAiResponseTime: 0,
    systemHealth: 'stable',
    recentQuestions: []
  });

  const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.MEDIUM);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = syncAnnouncement((text) => {
      setSiteAnnouncement(text);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let interval: number;
    if (state.status === 'loading') {
      interval = window.setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [state.status]);

  const handleAdminAccess = () => {
    setShowPasscode(true);
    setPasscode('');
    setPasscodeError(false);
  };

  const verifyPasscode = () => {
    if (passcode === '2013') {
      setShowPasscode(false);
      setShowAdmin(true);
    } else {
      setPasscodeError(true);
      setTimeout(() => setPasscodeError(false), 500);
    }
  };

  const handleSaveToCloud = async () => {
    if (!db) {
      alert("⚠️ قاعدة البيانات غير مهيأة. يرجى إدخال مفاتيح Firebase في ملف firebase.ts أولاً.");
      return;
    }
    setIsUpdatingCloud(true);
    const success = await updateAnnouncementInCloud(siteAnnouncement);
    setIsUpdatingCloud(false);
    if (success) {
      alert("✅ تم التحديث السحابي بنجاح!");
    } else {
      alert("❌ فشل التحديث. تأكد من إعدادات القواعد (Rules) في Firebase Console.");
    }
  };

  const handleSelectCategory = async (category: CategoryType) => {
    setState(prev => ({ ...prev, status: 'loading', category: category, mode: selectedMode }));
    const startTime = Date.now();
    const question = await generateGameQuestion(category, selectedMode);
    const duration = Date.now() - startTime;

    setAdminStats(prev => ({
      ...prev,
      totalQuestionsGenerated: prev.totalQuestionsGenerated + 1,
      averageAiResponseTime: Math.round((prev.averageAiResponseTime + duration) / (prev.totalQuestionsGenerated + 1)),
      recentQuestions: [question, ...prev.recentQuestions].slice(0, 10)
    }));
    
    let time = INITIAL_TIME_MEDIUM;
    let lives = MAX_LIVES_MEDIUM;
    if (selectedMode === GameMode.EASY) { time = INITIAL_TIME_EASY; lives = MAX_LIVES_EASY; }
    else if (selectedMode === GameMode.HARD) { time = INITIAL_TIME_HARD; lives = MAX_LIVES_HARD; }

    setState(prev => ({ 
      ...prev, currentQuestion: question, status: 'playing', timeLeft: time, lives: lives, score: 0, lastGuessCorrect: null, funnyResponse: ''
    }));
  };

  const handleGuess = (guess: string) => {
    if (!state.currentQuestion || state.status !== 'playing') return;
    const normalizedGuess = normalizeArabic(guess);
    if (!normalizedGuess) return;

    const answerIndex = state.currentQuestion.answers.findIndex(a => {
      if (a.revealed) return false;
      const normalizedAnswer = normalizeArabic(a.text);
      if (normalizedGuess === normalizedAnswer) return true;
      if (normalizedAnswer.length > 3 && normalizedGuess.length > 2) {
        return getEditDistance(normalizedGuess, normalizedAnswer) <= 1;
      }
      return false;
    });

    if (answerIndex !== -1) {
      const updatedAnswers = [...state.currentQuestion.answers];
      updatedAnswers[answerIndex].revealed = true;
      const pointsWon = updatedAnswers[answerIndex].points;
      setState(prev => ({
        ...prev, score: prev.score + pointsWon, currentQuestion: { ...prev.currentQuestion!, answers: updatedAnswers }, lastGuessCorrect: true, funnyResponse: 'وحش! كفووو 🔥'
      }));
      if (updatedAnswers.every(a => a.revealed)) { setTimeout(() => nextLevel(), 1500); }
    } else {
      const funnyMsg = FUNNY_WRONG_ANSWERS[Math.floor(Math.random() * FUNNY_WRONG_ANSWERS.length)];
      setState(prev => {
        const newLives = prev.lives - 1;
        return { ...prev, lives: newLives, status: newLives <= 0 ? 'gameOver' : prev.status, lastGuessCorrect: false, funnyResponse: funnyMsg };
      });
    }
  };

  const nextLevel = async () => {
    if (!state.category || !state.mode) return;
    setState(prev => ({ ...prev, status: 'loading' }));
    const question = await generateGameQuestion(state.category, state.mode);
    setState(prev => ({ ...prev, currentQuestion: question, status: 'playing', lastGuessCorrect: null, funnyResponse: '' }));
  };

  useEffect(() => {
    if (state.status === 'playing') {
      timerRef.current = window.setInterval(() => {
        setState(prev => {
          if (prev.timeLeft <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return { ...prev, status: 'gameOver' };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    } else { if (timerRef.current) clearInterval(timerRef.current); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.status]);

  const maxLives = state.mode === GameMode.EASY ? MAX_LIVES_EASY : state.mode === GameMode.MEDIUM ? MAX_LIVES_MEDIUM : MAX_LIVES_HARD;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-green-500/30 flex flex-col relative overflow-x-hidden">
      <div className="w-full bg-blue-600/20 border-b border-blue-500/30 py-2 text-center overflow-hidden">
        <p className="text-xs md:text-sm font-bold text-blue-300 animate-pulse">{siteAnnouncement}</p>
      </div>

      <div className="flex-grow max-w-4xl mx-auto px-4 pb-12 w-full">
        <Header />
        {state.status === 'idle' && (
          <div className="space-y-12 animate-fade-in">
            <div className="max-w-xl mx-auto space-y-4">
              <p className="text-center text-slate-400 font-bold text-sm uppercase tracking-widest">حدد مستوى التحدي</p>
              <div className="flex p-1 bg-slate-900/80 rounded-2xl border border-slate-800 backdrop-blur-md shadow-2xl">
                {GAME_MODES.map(mode => (
                  <button key={mode.id} onClick={() => setSelectedMode(mode.id)} className={`flex-1 py-3 px-2 rounded-xl font-black text-sm transition-all duration-300 ${selectedMode === mode.id ? (mode.id === GameMode.EASY ? 'bg-blue-500' : mode.id === GameMode.MEDIUM ? 'bg-amber-500' : 'bg-red-500') : 'text-slate-500'}`}>
                    {mode.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => handleSelectCategory(cat.id)} className="group bg-slate-900/40 p-6 rounded-3xl border-2 border-slate-800/50 hover:border-green-500/50 transition-all text-right">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl bg-slate-800 group-hover:bg-green-500/20 p-4 rounded-2xl">{cat.icon}</span>
                    <div><h3 className="text-2xl font-black">{cat.name}</h3><p className="text-slate-400 text-sm">{cat.description}</p></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {state.status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-slate-800 rounded-full"></div>
              <div className="w-20 h-20 border-4 border-green-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
            </div>
            <p className="text-2xl font-black animate-pulse text-center max-w-xs">{LOADING_MESSAGES[loadingMsgIdx]}</p>
          </div>
        )}
        {state.status === 'playing' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center bg-slate-900/90 p-4 rounded-2xl border-2 border-slate-800 sticky top-4 z-10 shadow-xl">
              <div className="flex items-center gap-4">
                <div><p className="text-[10px] text-slate-500 font-bold">النقاط</p><p className="text-xl font-black text-green-500">{state.score}</p></div>
                <div className="w-[1px] h-8 bg-slate-800"></div>
                <div><p className="text-[10px] text-slate-500 font-bold">الوقت</p><p className={`text-xl font-black ${state.timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>{state.timeLeft}s</p></div>
              </div>
              <div className="flex items-center gap-1">{[...Array(maxLives)].map((_, i) => <span key={i} className={`text-xl ${i >= state.lives ? 'opacity-20 grayscale' : ''}`}>❤️</span>)}</div>
            </div>
            <GameCard starter={state.currentQuestion?.starter || ''} answers={state.currentQuestion?.answers || []} sources={state.currentQuestion?.sources} onGuess={handleGuess} isWrong={state.lastGuessCorrect === false} />
          </div>
        )}
        {state.status === 'gameOver' && (
          <div className="bg-slate-900 p-8 rounded-3xl border-2 border-slate-800 text-center shadow-2xl max-w-2xl mx-auto">
            <h2 className="text-4xl font-black mb-2 text-red-500">انتهت اللعبة! 🏁</h2>
            <div className="bg-slate-950 p-6 rounded-2xl mb-8"><p className="text-slate-500 text-xs font-bold mb-1">نقاطك النهائية</p><p className="text-6xl font-black text-green-500">{state.score}</p></div>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleSelectCategory(state.category!)} className="bg-green-500 text-white font-black py-4 rounded-2xl">حاول مرة ثانية 🔁</button>
              <button onClick={() => setState(prev => ({ ...prev, status: 'idle', category: null }))} className="bg-slate-800 text-white font-bold py-4 rounded-2xl">الرئيسية 🔙</button>
            </div>
          </div>
        )}
      </div>

      {showPasscode && (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className={`bg-slate-900 p-8 rounded-3xl border border-slate-700 w-full max-w-md text-center space-y-6 ${passcodeError ? 'shake border-red-500' : ''}`}>
            <h2 className="text-2xl font-black">تحقق من الهوية</h2>
            <input type="password" maxLength={4} value={passcode} onChange={(e) => setPasscode(e.target.value)} className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl py-4 text-center text-3xl font-black tracking-[1em]" placeholder="••••" autoFocus onKeyDown={(e) => e.key === 'Enter' && verifyPasscode()} />
            <div className="flex gap-2">
              <button onClick={verifyPasscode} className="flex-1 bg-blue-600 text-white font-black py-4 rounded-xl">دخول</button>
              <button onClick={() => setShowPasscode(false)} className="flex-1 bg-slate-800 text-white font-bold py-4 rounded-xl">إلغاء</button>
            </div>
            {passcodeError && <p className="text-red-500 font-bold text-xs">الرمز السري غير صحيح!</p>}
          </div>
        </div>
      )}

      {showAdmin && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50"><h2 className="text-2xl font-black text-blue-400">لوحة المشرف (Control Panel)</h2><button onClick={() => setShowAdmin(false)} className="text-slate-400 hover:text-white text-2xl">✕</button></div>
            <div className="p-6 overflow-y-auto space-y-8">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-lg font-bold text-blue-400">تعديل الإعلان العام</h3>
                {!db && <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs rounded-lg">⚠️ ملاحظة: Firebase غير مهيأ. التغييرات ستكون محلية فقط.</div>}
                <textarea value={siteAnnouncement} onChange={(e) => setSiteAnnouncement(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm h-24" />
                <button onClick={handleSaveToCloud} disabled={isUpdatingCloud} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-black py-4 rounded-2xl transition-all">
                  {isUpdatingCloud ? "جاري الحفظ..." : "☁️ حفظ في السحابة"}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center"><p className="text-xs text-slate-500">الأسئلة</p><p className="text-2xl font-black">{adminStats.totalQuestionsGenerated}</p></div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center"><p className="text-xs text-slate-500">السرعة</p><p className="text-2xl font-black text-green-500">{adminStats.averageAiResponseTime}ms</p></div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center"><p className="text-xs text-slate-500">قاعدة البيانات</p><p className={`text-2xl font-black ${db ? 'text-blue-500' : 'text-slate-600'}`}>{db ? 'متصل' : 'أوفلاين'}</p></div>
              </div>
            </div>
            <div className="p-6 bg-slate-800/30 border-t border-slate-800 flex gap-4">
              <button onClick={() => window.location.reload()} className="flex-1 bg-red-500/20 text-red-500 font-bold py-3 rounded-xl">إعادة تشغيل</button>
              <button onClick={() => setShowAdmin(false)} className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-xl">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      <footer className="w-full mt-auto py-8 flex justify-between max-w-4xl mx-auto px-8 border-t border-slate-900/50 items-center">
        <button onClick={handleAdminAccess} className="text-[10px] text-slate-800 hover:text-slate-500 font-bold uppercase tracking-widest">ADMIN ACCESS</button>
        <div className="text-right">
          <p className="text-slate-500 text-[10px] font-black uppercase">مواقعي الأخرى</p>
          <a href="https://eman-hgju.vercel.app/" target="_blank" className="text-green-500/40 font-black hover:text-green-400 text-lg">eman-hgju.vercel.app</a>
        </div>
      </footer>
    </div>
  );
};

export default App;

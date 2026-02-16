
import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { GameCard } from './components/GameCard';
import { CategoryType, GameMode, GameState } from './types';
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

const App: React.FC = () => {
  const [state, setState] = useState<GameState>({
    currentQuestion: null,
    score: 0,
    lives: 3,
    timeLeft: 60,
    status: 'idle',
    category: null,
    mode: GameMode.MEDIUM, // الافتراضي متوسط
    lastGuessCorrect: null,
    funnyResponse: ''
  });

  const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.MEDIUM);
  const [errorCount, setErrorCount] = useState(0);
  const timerRef = useRef<number | null>(null);

  const handleSelectCategory = async (category: CategoryType) => {
    setState(prev => ({ 
      ...prev, 
      status: 'loading', 
      category: category,
      mode: selectedMode 
    }));

    const question = await generateGameQuestion(category, selectedMode);
    
    let time = INITIAL_TIME_MEDIUM;
    let lives = MAX_LIVES_MEDIUM;

    if (selectedMode === GameMode.EASY) {
      time = INITIAL_TIME_EASY;
      lives = MAX_LIVES_EASY;
    } else if (selectedMode === GameMode.HARD) {
      time = INITIAL_TIME_HARD;
      lives = MAX_LIVES_HARD;
    }

    setState(prev => ({ 
      ...prev, 
      currentQuestion: question, 
      status: 'playing',
      timeLeft: time,
      lives: lives,
      score: 0,
      lastGuessCorrect: null,
      funnyResponse: ''
    }));
    setErrorCount(0);
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
        ...prev,
        score: prev.score + pointsWon,
        currentQuestion: { ...prev.currentQuestion!, answers: updatedAnswers },
        lastGuessCorrect: true,
        funnyResponse: 'وحش! كفووو 🔥'
      }));

      if (updatedAnswers.every(a => a.revealed)) {
        setTimeout(() => nextLevel(), 1500);
      }
    } else {
      setErrorCount(prev => prev + 1);
      const funnyMsg = FUNNY_WRONG_ANSWERS[Math.floor(Math.random() * FUNNY_WRONG_ANSWERS.length)];
      
      setState(prev => {
        const newLives = prev.lives - 1;
        return {
          ...prev,
          lives: newLives,
          status: newLives <= 0 ? 'gameOver' : prev.status,
          lastGuessCorrect: false,
          funnyResponse: funnyMsg
        };
      });
    }
  };

  const nextLevel = async () => {
    if (!state.category || !state.mode) return;
    setState(prev => ({ ...prev, status: 'loading' }));
    const question = await generateGameQuestion(state.category, state.mode);
    setState(prev => ({ 
      ...prev, 
      currentQuestion: question, 
      status: 'playing',
      lastGuessCorrect: null,
      funnyResponse: ''
    }));
  };

  useEffect(() => {
    if (state.status === 'playing') {
      timerRef.current = window.setInterval(() => {
        setState(prev => {
          if (prev.timeLeft <= 1) {
            clearInterval(timerRef.current!);
            return { ...prev, status: 'gameOver' };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.status]);

  const maxLivesForCurrentMode = state.mode === GameMode.EASY ? MAX_LIVES_EASY : state.mode === GameMode.MEDIUM ? MAX_LIVES_MEDIUM : MAX_LIVES_HARD;
  const currentModeName = GAME_MODES.find(m => m.id === (state.mode || selectedMode))?.name || '';

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-green-500/30 flex flex-col relative">
      <div className="flex-grow max-w-4xl mx-auto px-4 pb-12 w-full">
        <Header />

        {state.status === 'idle' && (
          <div className="space-y-12 animate-fade-in">
            {/* خيارات الصعوبة من "برا" */}
            <div className="max-w-xl mx-auto space-y-4">
              <p className="text-center text-slate-400 font-bold text-sm uppercase tracking-widest">حدد مستوى التحدي</p>
              <div className="flex p-1 bg-slate-900/80 rounded-2xl border border-slate-800 backdrop-blur-md shadow-2xl">
                {GAME_MODES.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id)}
                    className={`flex-1 py-3 px-2 rounded-xl font-black text-sm transition-all duration-300 ${
                      selectedMode === mode.id 
                        ? mode.id === GameMode.EASY ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]' :
                          mode.id === GameMode.MEDIUM ? 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)]' :
                          'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {mode.name}
                  </button>
                ))}
              </div>
              <p className="text-center text-[11px] text-slate-500 italic">
                {GAME_MODES.find(m => m.id === selectedMode)?.description}
              </p>
            </div>

            {/* التصنيفات */}
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-black">اختر التصنيف وابدأ:</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.id)}
                    className="group relative overflow-hidden bg-slate-900/40 hover:bg-slate-800/60 p-6 rounded-3xl border-2 border-slate-800/50 hover:border-green-500/50 transition-all text-right hover:scale-[1.01] active:scale-95"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-4xl bg-slate-800 group-hover:bg-green-500/20 p-4 rounded-2xl transition-colors">{cat.icon}</span>
                      <div>
                        <h3 className="text-2xl font-black">{cat.name}</h3>
                        <p className="text-slate-400 text-sm">{cat.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {state.status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-slate-800 rounded-full"></div>
              <div className="w-20 h-20 border-4 border-green-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black mb-2 animate-pulse">جاري تحضير الاسئله القادحه...</p>
              <p className="text-slate-500 font-bold">{currentModeName} | {CATEGORIES.find(c => c.id === state.category)?.name}</p>
            </div>
          </div>
        )}

        {state.status === 'playing' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border-2 border-slate-800 sticky top-4 z-10 shadow-xl">
              <div className="flex items-center gap-4 md:gap-6">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">النقاط</p>
                  <p className="text-xl md:text-2xl font-black text-green-500">{state.score}</p>
                </div>
                <div className="w-[1px] h-8 bg-slate-800"></div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">الوقت</p>
                  <p className={`text-xl md:text-2xl font-black ${state.timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                    {state.timeLeft}s
                  </p>
                </div>
                <div className="hidden md:block w-[1px] h-8 bg-slate-800"></div>
                <div className="hidden md:block">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">المستوى</p>
                  <p className={`text-xs font-bold ${
                    state.mode === GameMode.EASY ? 'text-blue-400' : state.mode === GameMode.MEDIUM ? 'text-amber-400' : 'text-red-400'
                  }`}>{currentModeName}</p>
                </div>
              </div>
              
              <div key={errorCount} className={`flex items-center gap-1 md:gap-2 ${state.lastGuessCorrect === false ? 'shake' : ''}`}>
                {[...Array(maxLivesForCurrentMode)].map((_, i) => (
                  <span key={i} className={`text-xl md:text-2xl transition-all duration-300 ${i >= state.lives ? 'opacity-20 grayscale scale-75' : 'opacity-100 scale-100'}`}>❤️</span>
                ))}
              </div>
            </div>

            {state.funnyResponse && (
              <div key={state.funnyResponse} className={`text-center py-2 px-4 rounded-full font-bold text-lg animate-bounce ${state.lastGuessCorrect === true ? 'text-green-400' : state.lastGuessCorrect === false ? 'text-red-400' : 'text-blue-400'}`}>
                {state.funnyResponse}
              </div>
            )}

            <GameCard 
              starter={state.currentQuestion?.starter || ''}
              answers={state.currentQuestion?.answers || []}
              sources={state.currentQuestion?.sources}
              onGuess={handleGuess}
              isWrong={state.lastGuessCorrect === false}
            />
          </div>
        )}

        {state.status === 'gameOver' && (
          <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
            <div className="bg-slate-900 p-8 md:p-10 rounded-3xl border-2 border-slate-800 text-center shadow-2xl pop-in">
              <h2 className="text-4xl font-black mb-2">انتهت اللعبة! 🏁</h2>
              <p className="mb-4 text-slate-400 font-bold">
                {state.mode === GameMode.EASY ? 'كانت سهلة عليك؟' : state.mode === GameMode.MEDIUM ? 'تحدي متوسط وممتع!' : 'مستوى الصعب يبي له قلب قادح!'}
              </p>
              
              <div className="bg-slate-950 p-6 rounded-2xl mb-8 border-2 border-slate-800">
                <p className="text-slate-500 uppercase text-xs font-bold mb-1">نقاطك النهائية</p>
                <p className="text-6xl font-black text-green-500">{state.score}</p>
              </div>

              {state.currentQuestion && (
                <div className="mb-8 space-y-3 text-right" dir="rtl">
                  <h3 className="text-xl font-bold text-slate-300 mb-4 text-center">وش كانت الإجابات؟ 🤔</h3>
                  <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {state.currentQuestion.answers.map((answer, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          answer.revealed 
                            ? 'bg-green-500/10 border-green-500/40 text-green-400' 
                            : 'bg-slate-800/40 border-slate-700/50 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            answer.revealed ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-500'
                          }`}>
                            {answer.rank}
                          </span>
                          <span className="font-bold text-lg">{answer.text}</span>
                        </div>
                        <span className="font-bold">+{answer.points}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button onClick={() => handleSelectCategory(state.category!)} className="w-full bg-green-500 hover:bg-green-400 text-white font-black py-4 rounded-2xl transition-all text-xl shadow-xl active:scale-95">حاول مرة ثانية 🔁</button>
                <button onClick={() => { setState(prev => ({ ...prev, status: 'idle', category: null })); }} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl active:scale-95">رجوع للقائمة الرئيسية 🔙</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* مواقعي الأخرى - تظهر فقط في نهاية الصفحة (Footer) وليست ثابتة */}
      <footer className="w-full mt-auto py-12 flex justify-end px-8 md:px-12 border-t border-slate-900/50">
        <div className="flex flex-col items-end text-right">
          <p className="text-slate-500 text-[10px] font-black mb-1 uppercase tracking-widest leading-none">مواقعي الأخرى</p>
          <a 
            href="https://eman-hgju.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-green-500/60 font-black hover:text-green-400 transition-colors text-xl md:text-2xl hover:underline underline-offset-8"
          >
            eman-hgju.vercel.app
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;


import React, { useState } from 'react';
import { CompletionAnswer, SourceLink } from '../types';

interface GameCardProps {
  starter: string;
  answers: CompletionAnswer[];
  sources?: SourceLink[];
  onGuess: (guess: string) => void;
  isWrong: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({ starter, answers, sources, onGuess, isWrong }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onGuess(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className={`w-full max-w-2xl mx-auto space-y-8 ${isWrong ? 'shake' : ''}`}>
      <div className="bg-gradient-to-b from-slate-800/80 to-slate-900/90 p-10 rounded-[2.5rem] border-2 border-slate-700/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-center relative overflow-hidden backdrop-blur-xl">
        {/* Decorative Elements */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>

        {/* Grounding Badge */}
        {sources && sources.length > 0 && (
          <div className="absolute top-6 right-6 flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider border border-green-500/30">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            بيانات مباشرة
          </div>
        )}

        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-[2px] w-8 bg-gradient-to-r from-transparent to-blue-500"></div>
          <span className="text-blue-400 text-xs font-black uppercase tracking-[0.2em]">Google Search</span>
          <div className="h-[2px] w-8 bg-gradient-to-l from-transparent to-blue-500"></div>
        </div>
        
        <h2 className="text-3xl md:text-5xl font-black text-white mb-10 leading-tight drop-shadow-lg">
          &ldquo;{starter}&rdquo;
        </h2>

        <form onSubmit={handleSubmit} className="relative group max-w-lg mx-auto">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="وش التكملة؟"
            className="w-full bg-slate-950/50 border-2 border-slate-800 rounded-2xl py-6 px-8 text-2xl text-center focus:outline-none focus:border-green-500/50 focus:ring-4 focus:ring-green-500/10 transition-all shadow-2xl placeholder:text-slate-700 font-bold"
            autoFocus
          />
          <button 
            type="submit"
            className="mt-6 w-full md:w-auto md:absolute md:left-3 md:top-3 md:bottom-3 md:mt-0 bg-green-500 hover:bg-green-400 text-white font-black px-8 rounded-xl transition-all shadow-lg active:scale-95 hover:shadow-green-500/20"
          >
            توقع!
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {answers.map((answer, idx) => (
          <div 
            key={idx}
            className={`group flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-700 ease-out ${
              answer.revealed 
                ? 'bg-green-500/10 border-green-500/30 translate-y-0 opacity-100 shadow-[0_10px_20px_rgba(34,197,94,0.1)]' 
                : 'bg-slate-900/40 border-slate-800/40 opacity-80'
            }`}
            style={{ transitionDelay: `${idx * 100}ms` }}
          >
            <div className="flex items-center gap-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black transition-colors ${
                answer.revealed ? 'bg-green-500 text-white shadow-lg shadow-green-500/40' : 'bg-slate-800 text-slate-500'
              }`}>
                {answer.rank}
              </div>
              <span className={`text-2xl font-black transition-all ${
                answer.revealed ? 'text-white translate-x-1' : 'text-slate-700 blur-[2px] select-none'
              }`}>
                {answer.revealed ? answer.text : '••••••••••••'}
              </span>
            </div>
            
            {answer.revealed ? (
              <div className="flex flex-col items-end">
                <span className="text-green-400 font-black text-xl">+{answer.points}</span>
                <span className="text-[10px] text-green-500/50 font-bold uppercase">Points</span>
              </div>
            ) : (
              <div className="w-12 h-1 bg-slate-800/50 rounded-full overflow-hidden">
                <div className="h-full bg-slate-700 w-1/3 animate-pulse"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sources Display */}
      {sources && sources.length > 0 && (
        <div className="bg-slate-900/20 p-6 rounded-3xl border border-slate-800/30 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-blue-500">🔍</span>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">المصادر المستخدمة في السؤال:</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {sources.slice(0, 3).map((source, i) => (
              <a 
                key={i} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[11px] text-blue-400 hover:text-blue-300 font-bold bg-blue-500/5 px-3 py-2 rounded-xl border border-blue-500/10 hover:border-blue-500/30 transition-all"
              >
                {source.title.length > 40 ? source.title.substring(0, 40) + "..." : source.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

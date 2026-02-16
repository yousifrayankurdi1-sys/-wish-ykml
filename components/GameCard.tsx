
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
    <div className={`w-full max-w-2xl mx-auto space-y-6 ${isWrong ? 'shake' : ''}`}>
      <div className="bg-slate-800/50 p-8 rounded-3xl border-2 border-slate-700 shadow-xl text-center relative overflow-hidden">
        {/* Grounding Badge */}
        {sources && sources.length > 0 && (
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded-md text-[10px] font-bold">
            <span className="animate-pulse">●</span> معلومات مؤكدة
          </div>
        )}

        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">البحث</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
          &ldquo;{starter}&rdquo;
        </h2>

        <form onSubmit={handleSubmit} className="relative group">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="وش يكمل الجملة؟..."
            className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl py-5 px-6 text-xl text-center focus:outline-none focus:border-green-500 transition-all shadow-inner placeholder:text-slate-600"
            autoFocus
          />
          <button 
            type="submit"
            className="absolute left-2 top-2 bottom-2 bg-green-500 hover:bg-green-400 text-white font-bold px-6 rounded-xl transition-colors shadow-lg active:scale-95"
          >
            توقع
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {answers.map((answer, idx) => (
          <div 
            key={idx}
            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-500 ${
              answer.revealed 
                ? 'bg-green-500/20 border-green-500/50 translate-y-0 opacity-100' 
                : 'bg-slate-800/20 border-slate-800/50'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                answer.revealed ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400'
              }`}>
                {answer.rank}
              </span>
              <span className={`text-xl font-bold ${answer.revealed ? 'text-white' : 'text-slate-600 italic'}`}>
                {answer.revealed ? answer.text : '••••••••••'}
              </span>
            </div>
            {answer.revealed && (
              <span className="text-green-400 font-bold">+{answer.points}</span>
            )}
          </div>
        ))}
      </div>

      {/* Sources Display */}
      {sources && sources.length > 0 && (
        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/50">
          <p className="text-[10px] text-slate-500 font-black mb-2 uppercase tracking-tighter">مصادر البحث (جوجل):</p>
          <div className="flex flex-wrap gap-2">
            {sources.slice(0, 3).map((source, i) => (
              <a 
                key={i} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-blue-400 hover:text-blue-300 underline bg-blue-500/5 px-2 py-1 rounded border border-blue-500/20"
              >
                {source.title.length > 30 ? source.title.substring(0, 30) + "..." : source.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

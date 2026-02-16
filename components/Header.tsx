
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="py-6 px-4 flex flex-col items-center justify-center">
      <h1 className="text-5xl md:text-6xl font-black gradient-text tracking-tighter">وش يكمل؟</h1>
      <p className="text-slate-400 mt-2 text-sm md:text-base font-semibold">توقع وش الناس يبحثون عنه في السعودية!</p>
    </header>
  );
};

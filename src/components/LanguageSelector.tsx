import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe } from 'lucide-react';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, supportedLanguages } = useLanguage();

  return (
    <div className="flex items-center space-x-2 bg-slate-900/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-sm">
      <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="bg-transparent text-slate-100 font-medium focus:outline-none cursor-pointer"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-100">
            {lang.native} ({lang.name})
          </option>
        ))}
      </select>
    </div>
  );
};

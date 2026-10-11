import React from 'react';
import { Scale } from 'lucide-react';

export type ActiveNavTab = 'analyze' | 'dashboard' | 'about';

interface NavbarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  hasActiveAnalysis: boolean;
  onStartNewAnalysis: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  hasActiveAnalysis,
  onStartNewAnalysis,
}) => {
  return (
    <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-3.5">
      <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand Title */}
        <button
          type="button"
          onClick={() => onSelectTab('analyze')}
          className="flex items-center gap-2.5 text-left text-slate-950 font-bold tracking-tight text-lg whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 rounded"
        >
          <Scale className="w-5 h-5 text-slate-900 shrink-0" />
          <span>Paper Juris</span>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onSelectTab('analyze')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'analyze'
                ? 'border-slate-900 text-slate-950 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Analyze Document
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'dashboard'
                ? 'border-slate-900 text-slate-950 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('about')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'about'
                ? 'border-slate-900 text-slate-950 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            About
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onStartNewAnalysis}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            {hasActiveAnalysis ? 'New Analysis' : 'Upload Judgment'}
          </button>
        </div>
      </div>
    </header>
  );
};

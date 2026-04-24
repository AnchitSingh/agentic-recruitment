// src/components/landing/QuizBrowser/CategoryTabs.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toTopicSlug } from '../../../services/backendAPI';

export const CategoryTabs = ({ activeCategory, setActiveCategory, quizCategories }) => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // Filter categories by search
  const filtered = search
    ? quizCategories.filter(c =>
        c.label.toLowerCase().includes(search.toLowerCase()) ||
        c.aliases?.some(a => a.toLowerCase().includes(search.toLowerCase()))
      )
    : quizCategories;

  // Group: Step categories first, then organ systems, then others
  const stepCats = filtered.filter(c => c.id.startsWith('step'));
  const organCats = filtered.filter(c => !c.id.startsWith('step') && c.id !== 'study-packs');
  const otherCats = filtered.filter(c => c.id === 'study-packs');

  return (
    <div className="lg:w-64 shrink-0">
      <div className="lg:sticky lg:top-24">
        {/* Search within categories */}
        {quizCategories.length > 8 && (
          <div className="relative mb-3">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter topics..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
            />
          </div>
        )}

        {/* Scrollable category list */}
        <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible lg:max-h-[60vh] lg:overflow-y-auto pb-2 lg:pb-0 scrollbar-hide lg:pr-1">

          {/* Step categories */}
          {stepCats.length > 0 && (
            <>
              <div className="hidden lg:block text-[10px] uppercase tracking-wider font-semibold text-slate-400 px-3 py-1.5 mt-1">
                By Exam
              </div>
              {stepCats.map(cat => (
                <CategoryButton
                  key={cat.id}
                  cat={cat}
                  isActive={activeCategory === cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                />
              ))}
            </>
          )}

          {/* Organ system categories */}
          {organCats.length > 0 && (
            <>
              <div className="hidden lg:block text-[10px] uppercase tracking-wider font-semibold text-slate-400 px-3 py-1.5 mt-3">
                By System
              </div>
              {organCats.map(cat => (
                <CategoryButton
                  key={cat.id}
                  cat={cat}
                  isActive={activeCategory === cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                />
              ))}
            </>
          )}

          {/* Other categories */}
          {otherCats.map(cat => (
            <CategoryButton
              key={cat.id}
              cat={cat}
              isActive={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
            />
          ))}
        </nav>
      </div>
    </div>
  );
};

// In CategoryTabs.jsx — update CategoryButton to include a link icon

function CategoryButton({ cat, isActive, onClick }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onClick}
        className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 min-w-max lg:min-w-0 lg:w-full text-left ${
          isActive
            ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 border border-transparent'
        }`}
      >
        <span className="text-base">{cat.icon}</span>
        <span className="flex-1 truncate">{cat.label}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded-md ${
          isActive
            ? 'bg-amber-200/60 text-amber-700'
            : 'bg-slate-100 text-slate-400'
        }`}>
          {cat.quizzes.length}
        </span>
      </button>

      {/* Link to full topic page */}
      {isActive && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/topic/${toTopicSlug(cat.label)}`);
          }}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-600 transition-all"
          title={`View all ${cat.label} content`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      )}
    </div>
  );
}
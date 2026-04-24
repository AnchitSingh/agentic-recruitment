import React from 'react';
import { getTestimonials } from '../../services/dataService';

const avatarColors = {
  amber:   'bg-amber-100 text-amber-700',
  blue:    'bg-blue-100 text-blue-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  purple:  'bg-purple-100 text-purple-700',
};

const scoreBadgeColors = {
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  purple:  'bg-purple-50 text-purple-700 border-purple-200',
};

export const Testimonials = () => {
  const testimonialsData = getTestimonials();
  
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            Loved by Future Doctors
          </h2>
          <p className="mt-2 text-slate-500 max-w-xl mx-auto">
            See how Resident.Quest helped students achieve their dream scores
          </p>
        </div>

        {/* Testimonial cards */}
        <div className="grid gap-6 sm:grid-cols-2">
          {testimonialsData.map((t) => (
            <div
              key={t.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm p-6 hover:shadow-md transition-all duration-300 flex flex-col"
            >
              {/* Quote icon */}
              <svg className="w-8 h-8 text-amber-200 mb-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151C7.563 6.068 6 8.789 6 11h4v10H0z" />
              </svg>

              {/* Quote */}
              <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1">
                "{t.quote}"
              </p>

              {/* Author row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${avatarColors[t.color]}`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </div>

                {/* Score badge */}
                <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl border ${scoreBadgeColors[t.color]}`}>
                  <span className="text-lg font-bold leading-tight">{t.score}</span>
                  <span className="text-[10px] font-medium opacity-80">{t.exam}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
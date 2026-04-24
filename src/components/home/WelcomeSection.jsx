import React from 'react';
import { getCurrentUser, getDailyStats } from '../../services/dataService';
import { quickActions } from '../../data/homeData';

export const WelcomeSection = () => {
  const currentUser = getCurrentUser();
  const dailyStats = getDailyStats();
  return (
    <section className="pt-8 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight">
              Welcome back, {currentUser.name}!{' '}
              <span className="inline-block animate-bounce" style={{ animationDuration: '2s' }}>👋</span>
            </h1>
            <p className="mt-2 text-slate-500 text-base sm:text-lg">
              Keep your{' '}
              <span className="font-semibold text-amber-600 inline-flex items-center gap-1">
                🔥 {currentUser.streak}-day streak
              </span>{' '}
              going — you're on fire!
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {dailyStats.map((stat) => (
            <div
              key={stat.id}
              className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 sm:p-5 hover:shadow-md hover:border-slate-300/60 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{stat.icon}</span>
                {stat.change && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {stat.change}
                  </span>
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2.5">
          {quickActions.map((action) => (
            <button
              key={action.id}
              className={`
                inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${action.primary
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200/50 hover:shadow-lg hover:shadow-amber-300/50 hover:-translate-y-0.5'
                  : 'bg-white/80 text-slate-700 border border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-sm'
                }
              `}
            >
              <span>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
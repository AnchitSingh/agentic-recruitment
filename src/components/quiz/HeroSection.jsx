import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { getGreeting } from '../../utils/quizHelpers';

const HeroSection = ({ profile }) => {
  const navigate = useNavigate();

  return (
    <div className="mb-7">
      <div
        className="bg-gradient-to-br from-white/90 via-white/80 to-amber-50/60
                    backdrop-blur-sm border border-white/70 shadow-sm rounded-3xl p-5 sm:p-7"
      >
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-xs font-semibold tracking-widest text-amber-600 uppercase mb-2">
              Daily Command Center
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 leading-tight">
              {getGreeting()}, {profile?.name || 'Learner'}
            </h1>
            <p className="text-slate-600 mt-2 max-w-2xl leading-relaxed">
              Continue where you paused, review recent activity, and pick your next high-impact quiz.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-2" aria-label="Quick actions">
            <Button variant="secondary" size="sm" onClick={() => navigate('/stats')}>
              Open Analytics
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;

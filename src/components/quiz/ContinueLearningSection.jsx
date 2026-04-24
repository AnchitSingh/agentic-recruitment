import React from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ProgressRing from '../ui/ProgressRing';
import EmptyState from '../ui/EmptyState';
import { formatTimeAgo, safePercent } from '../../utils/quizHelpers';

const Icons = {
  play: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  clock: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const ContinueLearningSection = ({ pausedQuizzes, continueQuizzes }) => {
  const navigate = useNavigate();

  const handleResumeQuiz = (quizId) => navigate('/quiz', { state: { quizConfig: { quizId } } });

  return (
    <div className="xl:col-span-2 bg-white/85 backdrop-blur-sm border border-white/70 rounded-2xl shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <span className="text-amber-500">{Icons.play}</span>
          Continue Learning
        </h2>
              </div>

      {continueQuizzes.length === 0 ? (
        <EmptyState
          icon={Icons.play}
          title="No paused quizzes"
          description="Start a quiz below and you can always resume later."
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => document.getElementById('catalog-search')?.focus()}
            >
              Find a quiz
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {continueQuizzes.map((quiz) => {
            const pct = safePercent(quiz.progress);
            const total = quiz.totalQuestions || quiz.questions?.length || 0;

            return (
              <div
                key={quiz.id}
                className="group rounded-xl border border-slate-100 bg-white p-4
                           hover:border-amber-200 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-4 mb-3">
                  <ProgressRing percent={pct} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate group-hover:text-amber-700 transition-colors">
                      {quiz.title || 'Untitled Quiz'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span>{quiz.subject || 'General'}</span>
                      <span className="text-slate-300">·</span>
                      <span className="inline-flex items-center gap-0.5">
                        {Icons.clock} {formatTimeAgo(quiz.lastUpdated || quiz.pausedAt)}
                      </span>
                    </p>
                  </div>
                  <Badge variant="info" size="xs">
                    {pct}%
                  </Badge>
                </div>

                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Question <span className="font-medium text-slate-700">{quiz.currentQuestion || 1}</span>
                    <span className="text-slate-400"> / {total}</span>
                  </p>
                  <Button size="sm" onClick={() => handleResumeQuiz(quiz.id)}>
                    Resume
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ContinueLearningSection;

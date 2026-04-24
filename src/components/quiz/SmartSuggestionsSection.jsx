import React from 'react';
import QuizCard from './QuizCard';

const Icons = {
  sparkles: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
};

const SmartSuggestionsSection = ({ suggestedQuizzes, weakTopics, onStartQuiz }) => {
  if (suggestedQuizzes.length === 0) return null;

  return (
    <section aria-label="Suggested quizzes" className="bg-white/85 backdrop-blur-sm border border-white/70 rounded-2xl shadow-sm p-4 sm:p-5 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <span className="text-amber-500">{Icons.sparkles}</span>
            Smart Suggestions
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {weakTopics.length
              ? 'Tailored to strengthen your weaker topics.'
              : 'Popular quizzes to keep your momentum going.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {suggestedQuizzes.map((quiz) => (
          <QuizCard
            key={quiz.id}
            quiz={quiz}
            onStartQuiz={onStartQuiz}
            variant="suggestion"
          />
        ))}
      </div>
    </section>
  );
};

export default SmartSuggestionsSection;

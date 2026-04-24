import React from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import { formatTimeAgo, safePercent } from '../../utils/quizHelpers';

const Icons = {
  history: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const RecentActivitySection = ({ history, recentHistory }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white/85 backdrop-blur-sm border border-white/70 rounded-2xl shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <span className="text-blue-500">{Icons.history}</span>
          Recent Activity
        </h2>
      </div>

      {recentHistory.length === 0 ? (
        <EmptyState
          icon={Icons.history}
          title="No activity yet"
          description="Completed quizzes will appear here."
        />
      ) : (
        <div className="space-y-2">
          {recentHistory.map((entry, idx) => (
            <div
              key={entry.id ?? idx}
              className="w-full text-left rounded-xl border border-slate-100 p-3"
            >
              <p className="font-medium text-sm text-slate-800 truncate">{entry.title || 'Untitled Quiz'}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-500">Completed {formatTimeAgo(entry.savedAt)}</p>
                {entry.score != null && (
                  <Badge size="xs" variant={entry.score >= 70 ? 'success' : 'warning'}>
                    {safePercent(entry.score)}%
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivitySection;

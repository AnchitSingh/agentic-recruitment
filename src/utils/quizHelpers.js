export const formatTimeAgo = (date) => {
  if (!date) return 'Recently';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

export const safePercent = (v) => Math.max(0, Math.min(100, Math.round(v || 0)));

export const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const findSuggestedQuizzes = (quizzes, weakTopics) => {
  if (!quizzes.length) return [];
  if (!weakTopics.length) {
    return [...quizzes].sort((a, b) => (b.questionCount || 0) - (a.questionCount || 0)).slice(0, 4);
  }

  const ranked = quizzes
    .map((quiz) => {
      const hay = `${quiz.title ?? ''} ${quiz.subject ?? ''} ${quiz.category ?? ''}`.toLowerCase();
      const score = weakTopics.reduce((s, t) => (hay.includes(t) ? s + 1 : s), 0);
      return { quiz, score };
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || (b.quiz.questionCount || 0) - (a.quiz.questionCount || 0))
    .slice(0, 4)
    .map((e) => e.quiz);

  return ranked.length
    ? ranked
    : [...quizzes].sort((a, b) => (b.questionCount || 0) - (a.questionCount || 0)).slice(0, 4);
};

export const CATALOG_PAGE_SIZE = 12;

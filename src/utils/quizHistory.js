import storage from './storage';

const QUIZ_HISTORY_KEY = 'quiz_history';

export const saveQuizToHistory = async (quizData) => {
  try {
    const history = await storage.get(QUIZ_HISTORY_KEY, []);
    
    const quizEntry = {
      id: quizData.id || `quiz_${Date.now()}`,
      title: quizData.title || quizData.subject || 'Untitled Quiz',
      savedAt: Date.now(),
      data: quizData
    };
    
    // Add to beginning, limit to 20 most recent
    const updatedHistory = [quizEntry, ...history.filter(q => q.id !== quizEntry.id)].slice(0, 20);
    
    await storage.set(QUIZ_HISTORY_KEY, updatedHistory);
    return true;
  } catch (err) {
    console.error('Failed to save quiz to history:', err);
    return false;
  }
};

export const getQuizHistory = async () => {
  try {
    return await storage.get(QUIZ_HISTORY_KEY, []);
  } catch (err) {
    console.error('Failed to get quiz history:', err);
    return [];
  }
};

export const deleteQuizFromHistory = async (quizId) => {
  try {
    const history = await storage.get(QUIZ_HISTORY_KEY, []);
    const updatedHistory = history.filter(q => q.id !== quizId);
    await storage.set(QUIZ_HISTORY_KEY, updatedHistory);
    return true;
  } catch (err) {
    console.error('Failed to delete quiz from history:', err);
    return false;
  }
};

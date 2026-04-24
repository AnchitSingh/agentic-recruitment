import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import GlobalHeader from '../components/ui/GlobalHeader';
import BackgroundEffects from '../components/ui/BackgroundEffects';
import { getQuizHistory, deleteQuizFromHistory } from '../utils/quizHistory';
import { backgrounds, colors, typography, borderRadius, shadows, transitions, effects, components, cn } from '../utils/designTokens';

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete", confirmVariant = "danger" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className={cn("fixed inset-0 transition-opacity", effects.backdrop)}
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={cn(
          "relative max-w-md w-full animate-modal-enter",
          colors.white,
          borderRadius['2xl'],
          shadows['2xl']
        )}>
          {/* Icon */}
          <div className="flex justify-center pt-6">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center",
              colors.red[100]
            )}>
              <svg className={cn("w-8 h-8", colors.red.text[600])} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 text-center">
            <h3 className={cn("text-lg font-semibold mb-2", colors.slate.text[800])}>{title}</h3>
            <p className={colors.slate.text[600]}>{message}</p>
          </div>

          {/* Footer Actions */}
          <div className="px-6 pb-6 flex gap-3 justify-center">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <button
              onClick={onConfirm}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-colors",
                confirmVariant === 'danger' 
                  ? cn(colors.red[600], "text-white hover:bg-red-700") 
                  : cn(colors.primary[600], "text-white hover:bg-amber-700")
              )}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Utility Functions
const formatTimeAgo = (date) => {
    const now = Date.now();
    const then = new Date(date).getTime();
    const seconds = Math.floor((now - then) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(date).toLocaleDateString();
};

const HistoryPage = () => {
  const navigate = useNavigate();
  const [quizHistory, setQuizHistory] = useState([]);
  const [selectedQuizzes, setSelectedQuizzes] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Confirmation modal states
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    const loadQuizHistory = async () => {
      setIsLoading(true);
      try {
        const history = await getQuizHistory();
        setQuizHistory(history.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)));
      } catch (error) {
        toast.error('Failed to load quiz history');
      } finally {
        setIsLoading(false);
      }
    };
    loadQuizHistory();
  }, []);

  const filteredHistory = quizHistory.filter(quiz => {
    const matchesSearch = searchQuery === '' || 
      quiz.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleLoadQuiz = (quiz) => {
    // Extract the quiz data from the history entry and create new IDs to prevent conflicts
    const quizDataWithNewIds = {
      ...quiz.data,
      id: `quiz_${Date.now()}`,
      questions: quiz.data.questions.map((q, index) => ({
        ...q,
        id: `q_${Date.now()}_${index}`
      }))
    };
    
    navigate('/quiz', { state: { quizConfig: { quizData: quizDataWithNewIds } } });
  };

  const handleDeleteQuiz = async (quizId, e) => {
    e.stopPropagation();
    const quiz = quizHistory.find(q => q.id === quizId);
    const quizTitle = quiz ? quiz.title : 'this quiz';

    setConfirmModalConfig({
      title: 'Delete Quiz',
      message: `Are you sure you want to delete "${quizTitle}"? This action cannot be undone.`,
      onConfirm: async () => {
        const success = await deleteQuizFromHistory(quizId);
        if (success) {
          setQuizHistory(prev => prev.filter(q => q.id !== quizId));
          toast.success('Quiz deleted successfully');
        } else {
          toast.error('Failed to delete quiz');
        }
        setConfirmModalOpen(false);
      }
    });
    setConfirmModalOpen(true);
  };

  const handleBulkDelete = async () => {
    if (selectedQuizzes.size === 0) return;
    
    setConfirmModalConfig({
      title: 'Delete Multiple Quizzes',
      message: `Are you sure you want to delete ${selectedQuizzes.size} selected quiz${selectedQuizzes.size > 1 ? 'zes' : ''}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          let deletedCount = 0;
          for (const quizId of selectedQuizzes) {
            const success = await deleteQuizFromHistory(quizId);
            if (success) deletedCount++;
          }
          
          setQuizHistory(prev => prev.filter(q => !selectedQuizzes.has(q.id)));
          setSelectedQuizzes(new Set());
          toast.success(`${deletedCount} quiz${deletedCount > 1 ? 'zes' : ''} deleted successfully`);
        } catch (error) {
          toast.error('Error deleting quizzes');
        } finally {
          setConfirmModalOpen(false);
        }
      }
    });
    setConfirmModalOpen(true);
  };

  // Handle search result selection from GlobalHeader
  const handleSearchResultSelect = (result) => {
    if (result.type === 'category') {
      // Navigate to topic page
      navigate(`/topic/${result.id}`);
    } else if (result.type === 'quiz' && result.slug) {
      // Start the quiz
      navigate(`/quiz/${result.slug}`);
    }
  };

  return (
    <div className={cn(backgrounds.pageMinHeight, "min-h-screen")}>
      <BackgroundEffects />
      <GlobalHeader currentPage="history" onSearchSelect={handleSearchResultSelect} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Quiz History</h2>
          <p className="text-slate-600">View and manage your previously taken quizzes</p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search quizzes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {selectedQuizzes.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Delete ({selectedQuizzes.size})
                </button>
              )}
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600">Loading quiz history...</p>
              </div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                {searchQuery ? 'No matching quizzes found' : 'No Quiz History'}
              </h3>
              <p className="text-slate-600 mb-6">
                {searchQuery ? 'Try adjusting your search' : 'Quizzes you complete will appear here'}
              </p>
              {!searchQuery && (
                <Button onClick={() => navigate('/home')}>
                  Start a Quiz
                </Button>
              )}
            </div>
          ) : (
            <DataTable
              data={filteredHistory}
              columns={[
                {
                  key: 'title',
                  header: 'Quiz Title',
                  sortable: true,
                  getValue: (quiz) => quiz.title,
                  render: (quiz) => (
                    <div>
                      <p className="text-slate-800 font-medium">{quiz.title}</p>
                      <p className="text-sm text-slate-500">{quiz.data.questions?.length || 0} questions</p>
                    </div>
                  ),
                },
                {
                  key: 'savedAt',
                  header: 'Completed',
                  sortable: true,
                  getValue: (quiz) => new Date(quiz.savedAt),
                  width: 'w-40',
                  render: (quiz) => (
                    <span className="text-sm text-slate-600">
                      {formatTimeAgo(quiz.savedAt)}
                    </span>
                  ),
                },
                {
                  key: 'score',
                  header: 'Score',
                  width: 'w-24',
                  render: (quiz) => {
                    const score = quiz.score;
                    if (typeof score === 'number' && quiz.totalQuestions) {
                      const percentage = Math.round((score / quiz.totalQuestions) * 100);
                      return (
                        <Badge variant={
                          percentage >= 80 ? 'success' : 
                          percentage >= 60 ? 'warning' : 
                          'danger'
                        }>
                          {percentage}%
                        </Badge>
                      );
                    }
                    return <span className="text-slate-400 text-sm">-</span>;
                  },
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  width: 'w-32',
                  align: 'center',
                  cellClassName: 'w-32',
                  render: (quiz) => (
                    <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleLoadQuiz(quiz)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Restart quiz"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete quiz"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ),
                },
              ]}
              keyExtractor={(quiz) => quiz.id}
              selectable
              selectedKeys={selectedQuizzes}
              onSelectionChange={setSelectedQuizzes}
              loading={isLoading}
              striped
              hoverable
              bordered
              size="md"
              bulkActions={(selected) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkDelete()}
                    className="px-3 py-1.5 text-sm bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                  >
                    Delete ({selected.size})
                  </button>
                </div>
              )}
              emptyTitle="No Quiz History"
              emptyDescription="Quizzes you complete will appear here"
              emptyIcon={
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                  <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              }
            />
          )}
        </div>
      </main>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmModalConfig.onConfirm}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmText="Delete"
        confirmVariant="danger"
      />

      <style>{`
        @keyframes modal-enter {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-modal-enter {
          animation: modal-enter 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default HistoryPage;

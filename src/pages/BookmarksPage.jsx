import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import examBuddyAPI from '../services/api';
import GlobalHeader from '../components/ui/GlobalHeader';
import BackgroundEffects from '../components/ui/BackgroundEffects';
import Dropdown from '../components/ui/Dropdown';
import PracticeConfigModal from '../components/quiz/PracticeConfigModal';
import { backgrounds, cn } from '../utils/designTokens';

// ── Helpers ──────────────────────────────────────────────────

const DIFFICULTY_ORDER = { Easy: 1, Medium: 2, Hard: 3 };

const getDifficultyVariant = (d) =>
  d === 'Easy' ? 'success' : d === 'Medium' ? 'warning' : d === 'Hard' ? 'danger' : 'default';

const getSubjectVariant = (s) =>
  s === 'Physics' ? 'info' : s === 'Math' ? 'success' : s === 'Chemistry' ? 'purple' : 'default';

// ── Confirmation Modal ──────────────────────────────────────

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl animate-modal-enter">
          <div className="flex justify-center pt-6">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="px-6 py-4 text-center">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
            <p className="text-slate-600">{message}</p>
          </div>
          <div className="px-6 pb-6 flex gap-3 justify-center">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Question Detail Modal ──────────────────────────────────

const QuestionDetailModal = ({ isOpen, onClose, question, onDelete, onPractice }) => {
  if (!isOpen || !question) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden animate-modal-enter">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
            <h3 className="text-lg font-semibold text-slate-800">Question Details</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {question.subject && (
                <Badge variant={getSubjectVariant(question.subject)}>{question.subject}</Badge>
              )}
              {question.difficulty && (
                <Badge variant={getDifficultyVariant(question.difficulty)}>{question.difficulty}</Badge>
              )}
              {question.type && <Badge variant="default">{question.type}</Badge>}
            </div>

            {/* Question */}
            <div className="mb-6">
              <h4 className="text-base font-semibold text-slate-800 mb-2">Question:</h4>
              <p className="text-slate-700 leading-relaxed">{question.question}</p>
            </div>

            {/* Options */}
            {(question.type === 'MCQ' || question.type === 'True/False') && (
              <div className="mb-6">
                <h4 className="text-base font-semibold text-slate-800 mb-3">Options:</h4>
                <div className="space-y-2">
                  {Array.isArray(question.options) && question.options.length > 0 ? (
                    question.options.map((option, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                        <span className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-slate-600 font-medium text-sm border border-slate-200 shrink-0">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="text-slate-700">{option.text}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 italic">No options available</p>
                  )}
                </div>
              </div>
            )}

            {/* Expected Answer */}
            {['Short Answer', 'Subjective', 'Fill in Blank'].includes(question.type) && question.answer && (
              <div className="mb-6">
                <h4 className="text-base font-semibold text-slate-800 mb-3">Expected Answer:</h4>
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-slate-700">{question.answer}</p>
                </div>
              </div>
            )}

            {/* Explanation */}
            {question.explanation && (
              <div className="mb-6">
                <h4 className="text-base font-semibold text-slate-800 mb-2">Explanation:</h4>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-amber-800">{question.explanation}</p>
                </div>
              </div>
            )}

            {/* Topics */}
            {question.tags?.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Topics:</h4>
                <div className="flex flex-wrap gap-2">
                  {question.tags.map((tag, i) => (
                    <Badge key={i} variant="default">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => onDelete(question.questionId)}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
            >
              Delete Bookmark
            </button>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose}>Close</Button>
              <Button onClick={() => onPractice(question)}>Practice Question</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Expanded Row Content ─────────────────────────────────

const ExpandedBookmarkRow = ({ bookmark, onPractice, onDelete }) => (
  <div className="space-y-4 max-w-2xl">
    <p className="text-sm text-slate-700 leading-relaxed">{bookmark.question}</p>

    {(bookmark.type === 'MCQ' || bookmark.type === 'True/False') &&
      Array.isArray(bookmark.options) &&
      bookmark.options.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Options</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {bookmark.options.map((opt, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm text-slate-600 bg-white rounded-md px-3 py-2 border border-slate-100"
              >
                <span className="font-medium text-slate-400 shrink-0">
                  {String.fromCharCode(65 + i)}.
                </span>
                <span>{opt.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    {bookmark.explanation && (
      <div className="text-sm bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
        <span className="font-medium text-amber-800">Explanation: </span>
        <span className="text-amber-700">{bookmark.explanation}</span>
      </div>
    )}

    <div className="flex items-center gap-2 pt-1">
      <Button size="sm" onClick={() => onPractice(bookmark)}>Practice</Button>
      <button
        onClick={() => onDelete(bookmark.questionId)}
        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
      >
        Delete
      </button>
    </div>
  </div>
);

// ── Main Page ───────────────────────────────────────────────

const BookmarksPage = () => {
  const navigate = useNavigate();

  // ── Data ──────────────────────────────────
  const [bookmarks, setBookmarks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Search & Filters ──────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [filters, setFilters] = useState({ topic: 'All', difficulty: 'All', type: 'All' });
  const filterMenuRef = useRef(null);

  // ── Selection ─────────────────────────────
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  // ── Sorting (controlled) ──────────────────
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState(null);

  // ── Pagination ────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ── Expandable rows ───────────────────────
  const [expandedKeys, setExpandedKeys] = useState(new Set());

  // ── Detail modal ──────────────────────────
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Confirm modal ─────────────────────────
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // ── Practice modal ────────────────────────
  const [isPracticeConfigModalOpen, setIsPracticeConfigModalOpen] = useState(false);
  const [questionsForPractice, setQuestionsForPractice] = useState([]);

  // ── Load bookmarks ────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await examBuddyAPI.getBookmarks();
        if (res.success) {
          setBookmarks(
            res.data.sort((a, b) => new Date(b.bookmarkedAt) - new Date(a.bookmarkedAt)),
          );
        }
      } catch {
        toast.error('Failed to load bookmarks');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // ── Close filter on outside click ─────────
  useEffect(() => {
    if (!filterMenuOpen) return;
    const handler = (e) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) {
        setFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterMenuOpen]);

  // ── Reset page when filters change ────────
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filters]);

  // ── Derived: filter options ───────────────
  const filterOptions = useMemo(
    () => ({
      topics: ['All', ...new Set(bookmarks.flatMap((b) => b.tags || []))].map((t) => ({
        value: t,
        label: t,
      })),
      difficulties: [
        'All',
        ...new Set(bookmarks.map((b) => b.difficulty).filter(Boolean)),
      ].map((d) => ({ value: d, label: d })),
      types: ['All', ...new Set(bookmarks.map((b) => b.type || 'MCQ'))].map((t) => ({
        value: t,
        label: t,
      })),
    }),
    [bookmarks],
  );

  const hasActiveFilters =
    filters.topic !== 'All' || filters.difficulty !== 'All' || filters.type !== 'All';

  // ── Derived: filtered bookmarks ───────────
  const filteredBookmarks = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return bookmarks.filter((b) => {
      if (q && !b.question.toLowerCase().includes(q) && !(b.tags || []).some((t) => t.toLowerCase().includes(q)))
        return false;
      if (filters.topic !== 'All' && !(b.tags || []).includes(filters.topic)) return false;
      if (filters.difficulty !== 'All' && b.difficulty !== filters.difficulty) return false;
      if (filters.type !== 'All' && (b.type || 'MCQ') !== filters.type) return false;
      return true;
    });
  }, [bookmarks, searchQuery, filters]);

  // ── Derived: sorted bookmarks ─────────────
  const sortedBookmarks = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredBookmarks;

    const getVal = (item) => {
      switch (sortKey) {
        case 'question':
          return item.question;
        case 'subject':
          return item.subject || '';
        case 'difficulty':
          return DIFFICULTY_ORDER[item.difficulty] ?? 99;
        case 'type':
          return item.type || 'MCQ';
        default:
          return '';
      }
    };

    return [...filteredBookmarks].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return sortDirection === 'desc' ? -cmp : cmp;
    });
  }, [filteredBookmarks, sortKey, sortDirection]);

  // ── Derived: paginated slice ──────────────
  const paginatedBookmarks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedBookmarks.slice(start, start + pageSize);
  }, [sortedBookmarks, page, pageSize]);

  // ── Handlers ──────────────────────────────

  const handleSortChange = useCallback(({ key, direction }) => {
    setSortKey(key);
    setSortDirection(direction);
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((size) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ topic: 'All', difficulty: 'All', type: 'All' });
    setSearchQuery('');
  }, []);

  const handleViewQuestion = useCallback((bookmark) => {
    setSelectedQuestion(bookmark);
    setIsModalOpen(true);
  }, []);

  const handleDeleteBookmark = useCallback(
    (questionId) => {
      const bookmark = bookmarks.find((b) => b.questionId === questionId);
      const preview = bookmark
        ? bookmark.question.length > 60
          ? bookmark.question.substring(0, 60) + '…'
          : bookmark.question
        : 'this bookmark';

      setConfirmModalConfig({
        title: 'Delete Bookmark',
        message: `Are you sure you want to delete "${preview}"?`,
        onConfirm: async () => {
          try {
            const res = await examBuddyAPI.removeBookmark(questionId);
            if (res.success) {
              setBookmarks((prev) => prev.filter((b) => b.questionId !== questionId));
              setSelectedKeys((prev) => {
                const next = new Set(prev);
                next.delete(questionId);
                return next;
              });
              setIsModalOpen(false);
              toast.success('Bookmark removed');
            } else {
              toast.error('Failed to remove bookmark');
            }
          } catch {
            toast.error('Error removing bookmark');
          } finally {
            setConfirmModalOpen(false);
          }
        },
      });
      setConfirmModalOpen(true);
    },
    [bookmarks],
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedKeys.size === 0) return;
    const count = selectedKeys.size;

    setConfirmModalConfig({
      title: 'Delete Multiple Bookmarks',
      message: `Are you sure you want to delete ${count} bookmark${count > 1 ? 's' : ''}? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await Promise.all(Array.from(selectedKeys).map((id) => examBuddyAPI.removeBookmark(id)));
          setBookmarks((prev) => prev.filter((b) => !selectedKeys.has(b.questionId)));
          setSelectedKeys(new Set());
          toast.success(`${count} bookmark${count > 1 ? 's' : ''} removed`);
        } catch {
          toast.error('Error removing bookmarks');
        } finally {
          setConfirmModalOpen(false);
        }
      },
    });
    setConfirmModalOpen(true);
  }, [selectedKeys]);

  const practiceQuestion = useCallback((bookmark) => {
    setQuestionsForPractice([
      { ...bookmark, id: bookmark.questionId, type: bookmark.type || 'MCQ' },
    ]);
    setIsPracticeConfigModalOpen(true);
    setIsModalOpen(false);
  }, []);

  const practiceSelected = useCallback(() => {
    if (selectedKeys.size === 0) return;
    const questions = bookmarks
      .filter((b) => selectedKeys.has(b.questionId))
      .map((b) => ({ ...b, id: b.questionId, type: b.type || 'MCQ' }));
    setQuestionsForPractice(questions);
    setIsPracticeConfigModalOpen(true);
  }, [selectedKeys, bookmarks]);

  const handleStartPractice = useCallback(
    (practiceConfig) => {
      const quizConfig = {
        title:
          questionsForPractice.length > 1
            ? 'Practice Selected Bookmarks'
            : `Practice: ${questionsForPractice[0]?.subject || 'Bookmark'}`,
        questions: questionsForPractice,
        ...practiceConfig,
      };
      toast.success('Starting practice quiz…');
      navigate('/quiz', { state: { quizConfig } });
      setIsPracticeConfigModalOpen(false);
      setQuestionsForPractice([]);
    },
    [questionsForPractice, navigate],
  );

  // ── Column definitions ────────────────────

  const columns = useMemo(
    () => [
      {
        key: 'question',
        header: 'Question',
        sortable: true,
        sortKey: 'question',
        getValue: (b) => b.question,
        render: (bookmark) => (
          <div className="max-w-lg min-w-[200px]">
            <p className="text-sm font-medium text-slate-800 line-clamp-2">
              {bookmark.question}
            </p>
            {bookmark.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {bookmark.tags.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {bookmark.tags.length > 3 && (
                  <span className="text-xs text-slate-400">+{bookmark.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'subject',
        header: 'Subject',
        sortable: true,
        sortKey: 'subject',
        getValue: (b) => b.subject || '',
        width: 'w-32',
        render: (bookmark) =>
          bookmark.subject ? (
            <Badge variant={getSubjectVariant(bookmark.subject)}>{bookmark.subject}</Badge>
          ) : (
            <span className="text-sm text-slate-400">—</span>
          ),
      },
      {
        key: 'difficulty',
        header: 'Difficulty',
        sortable: true,
        sortKey: 'difficulty',
        getValue: (b) => DIFFICULTY_ORDER[b.difficulty] ?? 99,
        width: 'w-28',
        render: (bookmark) =>
          bookmark.difficulty ? (
            <Badge variant={getDifficultyVariant(bookmark.difficulty)}>
              {bookmark.difficulty}
            </Badge>
          ) : (
            <span className="text-sm text-slate-400">—</span>
          ),
      },
      {
        key: 'type',
        header: 'Type',
        sortable: true,
        sortKey: 'type',
        getValue: (b) => b.type || 'MCQ',
        width: 'w-28',
        render: (bookmark) => <Badge variant="default">{bookmark.type || 'MCQ'}</Badge>,
      },
      {
        key: 'actions',
        header: '',
        width: 'w-24',
        align: 'center',
        render: (bookmark) => (
          <div
            className="flex items-center justify-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleViewQuestion(bookmark)}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="View details"
            >
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </button>
            <button
              onClick={() => handleDeleteBookmark(bookmark.questionId)}
              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete bookmark"
            >
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        ),
      },
    ],
    [handleViewQuestion, handleDeleteBookmark],
  );

  // ── Empty state ───────────────────────────

  const isFiltered = !!searchQuery || hasActiveFilters;

  const emptyState = useMemo(() => {
    if (isFiltered) {
      return (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-900">No matching bookmarks</p>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters</p>
          </div>
          <button
            onClick={clearFilters}
            className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-900">No Bookmarked Questions</p>
          <p className="text-sm text-slate-500 mt-1">
            Questions you bookmark during quizzes will appear here
          </p>
        </div>
        <Button onClick={() => navigate('/home')}>Start a Quiz</Button>
      </div>
    );
  }, [isFiltered, clearFilters, navigate]);

  // ── Toolbar content ───────────────────────

  const toolbar = useMemo(
    () => (
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md w-full">
          <input
            type="text"
            placeholder="Search questions or topics…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm',
              'focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500',
              'placeholder:text-slate-400 transition-shadow',
            )}
          />
          <svg
            className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Active-filter chip */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
            >
              Clear filters ✕
            </button>
          )}

          {/* Filter dropdown trigger */}
          <div className="relative" ref={filterMenuRef}>
            <button
              onClick={() => setFilterMenuOpen((o) => !o)}
              className={cn(
                'px-3 py-2 border rounded-lg flex items-center gap-1.5 text-sm transition-colors',
                hasActiveFilters
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && <span className="w-2 h-2 bg-amber-500 rounded-full" />}
            </button>

            {filterMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-30 animate-modal-enter">
                <div className="p-4 space-y-4">
                  <Dropdown
                    label="Topic"
                    options={filterOptions.topics}
                    value={filters.topic}
                    onChange={(v) => setFilters((p) => ({ ...p, topic: v }))}
                  />
                  <Dropdown
                    label="Difficulty"
                    options={filterOptions.difficulties}
                    value={filters.difficulty}
                    onChange={(v) => setFilters((p) => ({ ...p, difficulty: v }))}
                  />
                  <Dropdown
                    label="Type"
                    options={filterOptions.types}
                    value={filters.type}
                    onChange={(v) => setFilters((p) => ({ ...p, type: v }))}
                  />
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="w-full text-sm text-amber-600 hover:text-amber-700 font-medium pt-2 border-t border-slate-100"
                    >
                      Reset all filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    [searchQuery, filterMenuOpen, filters, filterOptions, hasActiveFilters, clearFilters],
  );

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

  // ── Render ────────────────────────────────

  return (
    <div className={cn(backgrounds.pageMinHeight, 'min-h-screen')}>
      <BackgroundEffects />
      <GlobalHeader currentPage="bookmarks" onSearchSelect={handleSearchResultSelect} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8">
        {/* Page header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Bookmarked Questions</h2>
          <p className="text-slate-600">
            Review and practice your saved questions
            {!isLoading && bookmarks.length > 0 && (
              <span className="text-slate-400"> · {bookmarks.length} total</span>
            )}
          </p>
        </div>

        {/* DataTable */}
        <DataTable
          data={paginatedBookmarks}
          columns={columns}
          keyExtractor={(b) => b.questionId}
          loading={isLoading}
          // ── Selection ──
          selectable
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          // ── Sorting (controlled) ──
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          // ── Expandable rows ──
          expandable={{
            render: (bookmark) => (
              <ExpandedBookmarkRow
                bookmark={bookmark}
                onPractice={practiceQuestion}
                onDelete={handleDeleteBookmark}
              />
            ),
            expandedKeys,
            onExpandChange: setExpandedKeys,
          }}
          // ── Pagination ──
          pagination={
            sortedBookmarks.length > 0
              ? {
                  page,
                  pageSize,
                  total: sortedBookmarks.length,
                  onPageChange: setPage,
                  onPageSizeChange: handlePageSizeChange,
                }
              : null
          }
          // ── Toolbar / Bulk actions ──
          toolbar={toolbar}
          bulkActions={() => (
            <>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                Delete
              </button>
              <Button size="sm" onClick={practiceSelected}>
                Practice
              </Button>
            </>
          )}
          // ── Empty state ──
          emptyState={emptyState}
          // ── Appearance ──
          bordered
          hoverable
          stickyHeader
          size="md"
          // ── Row interaction ──
          onRowClick={handleViewQuestion}
          // ── Accessibility ──
          aria-label="Bookmarked questions"
          caption="Your bookmarked questions for review and practice"
          className="backdrop-blur-sm"
        />
      </main>

      {/* ── Modals ── */}

      <QuestionDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        question={selectedQuestion}
        onDelete={handleDeleteBookmark}
        onPractice={practiceQuestion}
      />

      <ConfirmationModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmModalConfig.onConfirm}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
      />

      <PracticeConfigModal
        isOpen={isPracticeConfigModalOpen}
        onClose={() => {
          setIsPracticeConfigModalOpen(false);
          setQuestionsForPractice([]);
        }}
        onStart={handleStartPractice}
        questionCount={questionsForPractice.length}
      />

      <style>{`
        @keyframes modal-enter {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        .animate-modal-enter { animation: modal-enter 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default BookmarksPage;
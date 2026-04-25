import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn, components } from '../../utils/designTokens';

// ─── Icons ─────────────────────────────────────────────────────────────────────

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const RecruiterIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CandidateIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

// ─── Message Bubble ─────────────────────────────────────────────────────────────

const MessageBubble = ({ role, content, turn }) => {
  const isRecruiter = role === 'recruiter';

  return (
    <div className={cn(
      'flex gap-3 mb-4',
      isRecruiter ? 'flex-row' : 'flex-row-reverse'
    )}>
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
        isRecruiter ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-indigo-500'
      )}>
        {isRecruiter ? (
          <RecruiterIcon />
        ) : (
          <CandidateIcon />
        )}
      </div>

      {/* Message */}
      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-3',
        isRecruiter
          ? 'bg-slate-100 text-slate-800 rounded-tl-none'
          : 'bg-blue-50 text-slate-800 rounded-tr-none'
      )}>
        <div className="text-[10px] font-semibold text-slate-400 mb-1">
          {isRecruiter ? 'Recruiter' : 'Candidate'} · Turn {turn + 1}
        </div>
        <p className="text-sm leading-relaxed">{content}</p>
      </div>
    </div>
  );
};

// ─── Chat View Modal ───────────────────────────────────────────────────────────

export const ChatViewModal = ({ isOpen, onClose, conversationData }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyTranscript = useCallback(() => {
    if (!conversationData?.transcript) return;

    const text = conversationData.transcript
      .map(m => `[${m.role.toUpperCase()} - Turn ${m.turn + 1}]: ${m.content}`)
      .join('\n\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [conversationData]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen || !conversationData) return null;

  const { candidate_name, transcript, interest_score, interest_level, summary, blockers, positive_signals } = conversationData;

  return createPortal(
    <>
      <style>{`
        @keyframes chat-backdrop { from { opacity: 0; } to { opacity: 1; } }
        @keyframes chat-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .chat-backdrop   { animation: chat-backdrop 0.2s ease; }
        .chat-modal      { animation: chat-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>

      {/* Backdrop */}
      <div
        className="chat-backdrop fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div
          className="chat-modal relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl shadow-slate-900/20 flex flex-col overflow-hidden"
          style={{ maxHeight: 'min(90vh, 700px)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ──────────────────────────────────────────── */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white">
                <CandidateIcon />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">{candidate_name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    interest_score >= 70 ? 'bg-green-50 text-green-700' :
                    interest_score >= 50 ? 'bg-amber-50 text-amber-700' :
                    'bg-slate-50 text-slate-600'
                  )}>
                    Interest: {interest_level}
                  </span>
                  <span className="text-xs text-slate-400">Score: {interest_score}/100</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyTranscript}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                title="Copy transcript"
              >
                {copied ? (
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* ── Summary Section ───────────────────────────────────── */}
          {summary && (
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex-shrink-0">
              <p className="text-sm text-slate-600 leading-relaxed">{summary}</p>
              {blockers && blockers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {blockers.map((b, i) => (
                    <span key={i} className="text-xs font-medium bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                      ⚠️ {b}
                    </span>
                  ))}
                </div>
              )}
              {positive_signals && positive_signals.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {positive_signals.map((s, i) => (
                    <span key={i} className="text-xs font-medium bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Chat Messages ──────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {transcript && transcript.length > 0 ? (
              transcript.map((msg, idx) => (
                <MessageBubble
                  key={idx}
                  role={msg.role}
                  content={msg.content}
                  turn={msg.turn}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <p>No conversation transcript available</p>
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────────── */}
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex-shrink-0">
            <button
              onClick={onClose}
              className={cn(
                components.button.base,
                components.button.variants.primary,
                'text-sm px-6 h-9 min-h-0 rounded-xl w-full'
              )}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default ChatViewModal;

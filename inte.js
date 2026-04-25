// ─── ResultsPage.jsx — integration snippet ────────────────────────────────────
//
// Shows the complete flow from route state → match results → outreach → final shortlist

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  runAllConversations,
  buildFinalShortlist,
} from '../utils/ConversationEngine';

const ResultsPage = () => {
  const location = useLocation();

  // Passed from LandingPage via navigate('/results', { state: { jd, candidates } })
  const { jd, candidates } = location.state || {};

  const [outreachState, setOutreachState] = useState('idle');
  // 'idle' | 'running' | 'done' | 'error'

  const [progress, setProgress] = useState({});
  // { [candidate_id]: 'running' | 'done' | 'error' }

  const [finalShortlist, setFinalShortlist] = useState(null);

  // ── Initiate outreach ────────────────────────────────────────────────────
  const handleInitiateOutreach = async () => {
    setOutreachState('running');
    setProgress({});

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

      // onProgress fires per-candidate as they complete
      const onProgress = (candidateId, status) => {
        setProgress(prev => ({ ...prev, [candidateId]: status }));
      };

      // All 10 conversations fire in parallel — ~5-8s total
      const conversationResults = await runAllConversations(
        jd,
        candidates,  // [{ candidate, matchScore, ... }] from MatchEngine
        apiKey,
        onProgress,
      );

      // Merge match + interest scores, sort by combinedScore
      const shortlist = buildFinalShortlist(candidates, conversationResults);

      setFinalShortlist(shortlist);
      setOutreachState('done');

    } catch (err) {
      console.error('Outreach failed:', err);
      setOutreachState('error');
    }
  };

  // ── Shape of one finalShortlist item ─────────────────────────────────────
  //
  // {
  //   candidate:          { ...full profile },
  //   matchScore:         87.4,         ← from MatchEngine (skill/vector/bonus)
  //   interestScore:      74,           ← from Judge LLM
  //   combinedScore:      81.8,         ← 60% match + 40% interest
  //
  //   matchExplanation: {
  //     must_have_matched:    ['Node.js', 'PostgreSQL'],
  //     must_have_missing:    [],
  //     domain_matched:       ['fintech'],
  //     experience_note:      '5 years — within range (4–7)',
  //     salary_note:          'Expects 28 LPA — within budget',
  //     availability_note:    'Passively looking · 60-day notice',
  //     strength_tags:        [{ label: 'Full Skills Match', color: 'green' }],
  //     summary:              'Rahul matches all required skills...',
  //   },
  //
  //   interestLevel:       'medium',    ← 'high'|'medium'|'low'|'none'
  //   enthusiasm:          'positive',  ← 'excited'|'positive'|'neutral'|'hesitant'
  //   salarySignal:        'well_aligned',
  //   availabilitySignal:  'long_notice',
  //   blockers:            ['60-day notice period'],
  //   positiveSignals:     ['Asked about tech stack', 'Showed fintech interest'],
  //   interestSummary:     'Candidate showed genuine interest...',
  //   transcript:          [{ role, content, turn }],  ← full 10-message chat
  //   strengthTags:        [{ label, color }],
  //   hasError:            false,
  // }

  return (
    <div>
      {/* Header CTA */}
      <button
        onClick={handleInitiateOutreach}
        disabled={outreachState === 'running'}
      >
        {outreachState === 'idle'    && 'Initiate AI Outreach'}
        {outreachState === 'running' && 'Running conversations...'}
        {outreachState === 'done'    && 'View Final Shortlist'}
        {outreachState === 'error'   && 'Retry Outreach'}
      </button>

      {/* Per-candidate progress indicators while running */}
      {outreachState === 'running' && candidates?.map(({ candidate }) => (
        <div key={candidate.candidate_id}>
          <span>{candidate.personal?.name}</span>
          <span>{progress[candidate.candidate_id] || 'queued'}</span>
        </div>
      ))}

      {/* Final ranked table */}
      {finalShortlist && finalShortlist.map((item, rank) => (
        <div key={item.candidate.candidate_id}>
          <span>#{rank + 1} {item.candidate.personal?.name}</span>
          <span>Combined: {item.combinedScore}</span>
          <span>Match: {item.matchScore}</span>
          <span>Interest: {item.interestScore}</span>
          <span>{item.interestSummary}</span>
          {item.blockers.length > 0 && (
            <span>Blockers: {item.blockers.join(', ')}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default ResultsPage;
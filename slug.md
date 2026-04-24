

# The `/question/:slug` SEO Strategy

## What Testbook Does (and we'll replicate)

```
User searches: "Which cranial nerve innervates lateral rectus"
                                    │
                                    ▼
              Google shows: testbook.com/question/which-cranial-nerve...
                                    │
                                    ▼
              ┌─────────────────────────────────────────────┐
              │  Question Page                               │
              │                                              │
              │  📍 SSC > General Science > Biology          │
              │                                              │
              │  Q: Which cranial nerve innervates the       │
              │     lateral rectus muscle?                   │
              │                                              │
              │  ○ A) Trochlear nerve                       │
              │  ○ B) Abducens nerve                        │
              │  ○ C) Oculomotor nerve                      │
              │  ○ D) Trigeminal nerve                      │
              │                                              │
              │  [Check Answer]                              │
              │                                              │
              │  ▶ Answer: B) Abducens nerve                │
              │  ▶ Explanation: The abducens nerve (CN VI)..│
              │                                              │
              │  ─────────────────────────────────────────── │
              │  📊 2,341 users attempted · 67% got correct  │
              │  ─────────────────────────────────────────── │
              │                                              │
              │  Related Questions:                          │
              │  • Which nerve passes through foramen...     │
              │  • The trochlear nerve innervates which...   │
              │                                              │
              │  [Take Full Quiz: Cranial Nerves →]          │
              └─────────────────────────────────────────────┘

This page does 3 things:
  1. Ranks on Google (SEO content)
  2. Provides value (answer + explanation)
  3. Funnels to signup (take full quiz CTA)
```

---

## What You Already Have (No New Tables)

```sql
-- Your existing schema already has everything:

questions table:
  ├── slug          ✓  (for the URL)
  ├── question_text ✓  (the question)
  ├── options       ✓  (answer choices)
  ├── correct_answer✓  (the answer)
  ├── explanation   ✓  (the explanation)
  ├── subject       ✓  (for breadcrumbs)
  ├── topic         ✓  (for breadcrumbs + related questions)
  ├── difficulty    ✓  (for page metadata)
  ├── quiz_id       ✓  (links to parent quiz)
  └── image_url     ✓  (if question has image)

quizzes table:
  ├── slug          ✓  (for "take full quiz" link)
  ├── title         ✓  (for breadcrumbs)
  └── subject       ✓  (for categorization)

You need ZERO new tables.
Just 1 new route + 1 new API function + SEO setup.
```

---

## Step 0: Make Sure Slugs Are SEO-Quality

Your slugs need to be **descriptive**, not generic:

```
BAD SLUGS (won't rank):
  q-123
  question-456
  anatomy-q-7

GOOD SLUGS (will rank):
  which-cranial-nerve-innervates-lateral-rectus-muscle
  most-common-cause-of-iron-deficiency-anemia-in-adults
  mechanism-of-action-of-metformin-in-type-2-diabetes
```

If your current slugs aren't descriptive, run this migration:

```sql
-- Check what your slugs look like now
SELECT slug, LEFT(question_text, 80) FROM questions LIMIT 20;
```

If they need fixing, here's a one-time migration function:

```sql
-- Generate SEO-friendly slugs from question text
UPDATE questions
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      LEFT(question_text, 80),           -- first 80 chars
      '[^a-zA-Z0-9\s-]', '', 'g'        -- remove special chars
    ),
    '\s+', '-', 'g'                      -- spaces to hyphens
  )
) || '-' || id                           -- append ID for uniqueness
WHERE slug IS NULL 
   OR slug LIKE 'q-%' 
   OR slug LIKE 'question-%';
```

---

## Step 1: Question API

Add to `backendAPI.js`:

```js
/**
 * Fetch a single question by slug with parent quiz info
 * and related questions — everything the SEO page needs
 * in ONE Supabase call
 */
export async function fetchQuestionBySlug(slug) {
  try {
    // ── Main question + parent quiz (single query with join) ──
    const { data: question, error } = await supabase
      .from('questions')
      .select(`
        *,
        quiz:quizzes!quiz_id (
          id,
          slug,
          title,
          subject,
          category,
          difficulty
        )
      `)
      .eq('slug', slug)
      .single();

    if (error || !question) {
      return { success: false, error: 'Question not found' };
    }

    // ── Related questions (same topic or same quiz, cheap query) ──
    const { data: related } = await supabase
      .from('questions')
      .select('id, slug, question_text, topic, difficulty')
      .eq('quiz_id', question.quiz_id)
      .neq('id', question.id)
      .limit(6);

    // ── Prev/Next within same quiz (for navigation) ──
    const [{ data: prev }, { data: next }] = await Promise.all([
      supabase
        .from('questions')
        .select('slug, question_text')
        .eq('quiz_id', question.quiz_id)
        .lt('id', question.id)
        .order('id', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('questions')
        .select('slug, question_text')
        .eq('quiz_id', question.quiz_id)
        .gt('id', question.id)
        .order('id', { ascending: true })
        .limit(1)
        .single(),
    ]);

    return {
      success: true,
      data: {
        question: {
          id: question.id,
          slug: question.slug,
          questionText: question.question_text,
          questionType: question.question_type,
          options: question.options || [],
          correctAnswer: question.correct_answer,
          explanation: question.explanation,
          subject: question.subject,
          topic: question.topic,
          difficulty: question.difficulty,
          imageUrl: question.image_url,
        },
        quiz: question.quiz,
        related: (related || []).map(q => ({
          slug: q.slug,
          questionText: q.question_text,
          topic: q.topic,
          difficulty: q.difficulty,
        })),
        navigation: {
          prev: prev ? { slug: prev.slug, text: prev.question_text } : null,
          next: next ? { slug: next.slug, text: next.question_text } : null,
        },
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetch all question slugs — for sitemap generation
 * Lightweight: only returns slug + timestamps
 */
export async function fetchAllQuestionSlugs() {
  const { data, error } = await supabase
    .from('questions')
    .select('slug, created_at, subject, topic')
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data || [] };
}
```

**Supabase cost:** The main query uses a Postgres JOIN (one round trip, not two). Related questions and prev/next run in parallel. Total: **3 queries per page load**, all hitting indexed columns. Very efficient.

---

## Step 2: The Question Page Component

```jsx
// src/pages/QuestionPage.jsx

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { fetchQuestionBySlug } from '../api/backendAPI';

export default function QuestionPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setLoading(true);
    setSelectedAnswer(null);
    setRevealed(false);

    fetchQuestionBySlug(slug).then((res) => {
      if (res.success) setData(res.data);
      setLoading(false);
    });
  }, [slug]);

  if (loading) return <QuestionSkeleton />;
  if (!data) return <QuestionNotFound />;

  const { question, quiz, related, navigation } = data;

  const isCorrect = selectedAnswer === question.correctAnswer;
  const handleSubmit = () => setRevealed(true);

  // Truncate for meta description
  const metaDescription = question.questionText.slice(0, 155) + '...';
  const pageTitle = `${question.questionText.slice(0, 60)} - USMLE Practice | ResidentQuest`;
  const canonicalUrl = `https://resident.quest/question/${slug}`;

  return (
    <>
      {/* ═══════ SEO HEAD ═══════ */}
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={metaDescription} />

        {/* Structured Data — tells Google "this is a quiz question" */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Quiz',
            name: pageTitle,
            about: {
              '@type': 'Thing',
              name: question.topic || question.subject,
            },
            educationalLevel: 'Professional',
            assesses: question.topic || question.subject,
            hasPart: [
              {
                '@type': 'Question',
                name: question.questionText,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text:
                    question.options?.[parseInt(question.correctAnswer)] ||
                    question.correctAnswer,
                },
                suggestedAnswer: question.options?.map((opt, i) => ({
                  '@type': 'Answer',
                  text: opt,
                  position: i,
                })),
                eduQuestionType: 'Multiple choice',
              },
            ],
          })}
        </script>

        {/* Breadcrumb Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://resident.quest',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: question.subject,
                item: `https://resident.quest/browse?subject=${encodeURIComponent(question.subject)}`,
              },
              quiz && {
                '@type': 'ListItem',
                position: 3,
                name: quiz.title,
                item: `https://resident.quest/quiz/${quiz.slug}`,
              },
              {
                '@type': 'ListItem',
                position: quiz ? 4 : 3,
                name: question.questionText.slice(0, 50),
              },
            ].filter(Boolean),
          })}
        </script>
      </Helmet>

      {/* ═══════ PAGE CONTENT ═══════ */}
      <article className="question-page">
        {/* Breadcrumbs (visible to users AND crawlers) */}
        <nav aria-label="breadcrumb" className="breadcrumbs">
          <Link to="/">Home</Link>
          <span> › </span>
          <Link to={`/browse?subject=${encodeURIComponent(question.subject)}`}>
            {question.subject}
          </Link>
          {quiz && (
            <>
              <span> › </span>
              <Link to={`/quiz/${quiz.slug}`}>{quiz.title}</Link>
            </>
          )}
        </nav>

        {/* Question */}
        <section className="question-content">
          <header>
            <div className="question-meta">
              <span className={`difficulty ${question.difficulty}`}>
                {question.difficulty}
              </span>
              {question.topic && <span className="topic">{question.topic}</span>}
            </div>
            <h1>{question.questionText}</h1>
          </header>

          {question.imageUrl && (
            <img
              src={question.imageUrl}
              alt={`Diagram for: ${question.questionText.slice(0, 50)}`}
              loading="lazy"
            />
          )}

          {/* Options */}
          <div className="options" role="radiogroup">
            {question.options.map((option, index) => {
              let className = 'option';
              if (revealed && index === parseInt(question.correctAnswer)) {
                className += ' correct';
              } else if (
                revealed &&
                selectedAnswer === String(index) &&
                !isCorrect
              ) {
                className += ' incorrect';
              }

              return (
                <button
                  key={index}
                  className={className}
                  onClick={() => !revealed && setSelectedAnswer(String(index))}
                  disabled={revealed}
                  aria-pressed={selectedAnswer === String(index)}
                >
                  <span className="option-letter">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="option-text">{option}</span>
                </button>
              );
            })}
          </div>

          {!revealed && selectedAnswer !== null && (
            <button className="check-answer-btn" onClick={handleSubmit}>
              Check Answer
            </button>
          )}

          {/*
            ═══ THE SEO SECRET ═══
            This <details> element is ALWAYS in the DOM.
            Google indexes the content inside it.
            But users see it collapsed until they answer.
            
            After the user answers, we force it open with JS.
          */}
          <details className="explanation-section" open={revealed}>
            <summary>
              {revealed
                ? isCorrect
                  ? '✅ Correct!'
                  : '❌ Incorrect'
                : 'View Answer & Explanation'}
            </summary>

            <div className="explanation-content">
              <p className="correct-answer">
                <strong>Correct Answer: </strong>
                {String.fromCharCode(65 + parseInt(question.correctAnswer))}
                {') '}
                {question.options?.[parseInt(question.correctAnswer)]}
              </p>

              {question.explanation && (
                <div className="explanation-text">
                  <h2>Explanation</h2>
                  <p>{question.explanation}</p>
                </div>
              )}
            </div>
          </details>
        </section>

        {/* Prev/Next Navigation */}
        <nav className="question-nav" aria-label="question navigation">
          {navigation.prev ? (
            <Link to={`/question/${navigation.prev.slug}`} className="nav-prev">
              ← Previous Question
            </Link>
          ) : (
            <span />
          )}
          {navigation.next && (
            <Link to={`/question/${navigation.next.slug}`} className="nav-next">
              Next Question →
            </Link>
          )}
        </nav>

        {/* CTA — funnel to full quiz */}
        {quiz && (
          <section className="quiz-cta">
            <h2>Practice More {question.subject} Questions</h2>
            <p>
              This question is from <strong>{quiz.title}</strong>. Take the full
              quiz to test your knowledge.
            </p>
            <Link to={`/quiz/${quiz.slug}`} className="cta-button">
              Take Full Quiz →
            </Link>
          </section>
        )}

        {/* Related Questions — internal linking for SEO */}
        {related.length > 0 && (
          <section className="related-questions">
            <h2>Related Questions</h2>
            <ul>
              {related.map((q) => (
                <li key={q.slug}>
                  <Link to={`/question/${q.slug}`}>
                    {q.questionText.slice(0, 100)}
                    {q.questionText.length > 100 ? '...' : ''}
                  </Link>
                  <span className={`difficulty-tag ${q.difficulty}`}>
                    {q.difficulty}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </>
  );
}

function QuestionSkeleton() {
  return (
    <div className="question-page skeleton">
      <div className="skeleton-breadcrumb" />
      <div className="skeleton-title" />
      <div className="skeleton-option" />
      <div className="skeleton-option" />
      <div className="skeleton-option" />
      <div className="skeleton-option" />
    </div>
  );
}

function QuestionNotFound() {
  return (
    <div className="question-not-found">
      <h1>Question Not Found</h1>
      <p>This question may have been removed or the URL is incorrect.</p>
      <Link to="/browse">Browse All Quizzes →</Link>
    </div>
  );
}
```

---

## Step 3: Add The Route

```jsx
// In your router config

import QuestionPage from './pages/QuestionPage';

// Add alongside your existing routes:
<Route path="/question/:slug" element={<QuestionPage />} />
```

---

## Step 4: Sitemap Generation

Google needs to know all your question URLs exist. Two approaches:

### Option A: Build Script (runs during deployment)

```js
// scripts/generate-sitemap.js
// Run: node scripts/generate-sitemap.js

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function generateSitemap() {
  const BASE_URL = 'https://resident.quest';

  // Fetch all questions and quizzes
  const [{ data: questions }, { data: quizzes }] = await Promise.all([
    supabase.from('questions').select('slug, created_at, subject'),
    supabase.from('quizzes').select('slug, created_at, subject').eq('is_published', true),
  ]);

  // Group questions by subject for sub-sitemaps
  const entries = [
    // Static pages
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/browse', priority: '0.9', changefreq: 'daily' },

    // Quiz pages
    ...quizzes.map((q) => ({
      url: `/quiz/${q.slug}`,
      lastmod: q.created_at,
      priority: '0.8',
      changefreq: 'weekly',
    })),

    // Question pages (the SEO gold)
    ...questions.map((q) => ({
      url: `/question/${q.slug}`,
      lastmod: q.created_at,
      priority: '0.7',
      changefreq: 'monthly',
    })),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${BASE_URL}${e.url}</loc>
    ${e.lastmod ? `<lastmod>${new Date(e.lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  writeFileSync('public/sitemap.xml', sitemap);
  console.log(`✓ Sitemap generated: ${entries.length} URLs`);
}

generateSitemap();
```

### Option B: Supabase Edge Function (always up-to-date)

```ts
// supabase/functions/sitemap/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BASE_URL = 'https://resident.quest';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  const [{ data: questions }, { data: quizzes }] = await Promise.all([
    supabase.from('questions').select('slug, created_at'),
    supabase.from('quizzes').select('slug, created_at').eq('is_published', true),
  ]);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE_URL}/</loc><priority>1.0</priority></url>
  <url><loc>${BASE_URL}/browse</loc><priority>0.9</priority></url>`;

  for (const q of quizzes || []) {
    xml += `
  <url><loc>${BASE_URL}/quiz/${q.slug}</loc><priority>0.8</priority></url>`;
  }

  for (const q of questions || []) {
    xml += `
  <url><loc>${BASE_URL}/question/${q.slug}</loc><priority>0.7</priority></url>`;
  }

  xml += '\n</urlset>';

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400', // cache 24h
    },
  });
});
```

### `robots.txt`

```
# public/robots.txt

User-agent: *
Allow: /
Allow: /question/
Allow: /quiz/
Allow: /browse
Disallow: /dashboard
Disallow: /settings
Disallow: /api/

Sitemap: https://resident.quest/sitemap.xml
```

---

## Step 5: The Hard Problem — Google Can't See Your SPA

This is the critical issue. Your app is a Vite SPA. When Google crawls `/question/some-slug`:

```
WHAT GOOGLE'S CRAWLER SEES:
─────────────────────────────────

<!DOCTYPE html>
<html>
  <head><title>ResidentQuest</title></head>
  <body>
    <div id="root"></div>          ← EMPTY
    <script src="/assets/app.js"></script>
  </body>
</html>

Google's JS renderer MIGHT execute the JS and see the content.
But with thousands of pages, it's UNRELIABLE.
Many pages won't get rendered. Or take weeks.
```

**Testbook doesn't have this problem because they use Server-Side Rendering (SSR).**

### Your Options, Ranked

```
Option                   Effort    SEO Quality    Cost
────────────────────     ──────    ───────────    ──────
A. Pre-render service    Low       Good           ~$15/mo
B. Cloudflare Worker     Medium    Great          Free-$5/mo
C. Next.js migration     High      Best           Free
D. Hope Google renders   Zero      Unreliable     Free
```

### Recommended: Option B — Cloudflare Worker (or Vercel Edge Middleware)

A lightweight worker that intercepts crawler requests and serves pre-rendered HTML:

```js
// workers/seo-prerender.js
// Deploy on Cloudflare Workers (or adapt for Vercel Edge)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';

    // ── Only intercept crawlers on question pages ──
    const isCrawler = /googlebot|bingbot|yandex|baiduspider|twitterbot|facebookexternalhit|linkedinbot/i.test(userAgent);
    const isQuestionPage = url.pathname.startsWith('/question/');

    if (!isCrawler || !isQuestionPage) {
      // Normal users → serve the SPA as-is
      return fetch(request);
    }

    // ── For crawlers: generate lightweight HTML ──
    const slug = url.pathname.split('/question/')[1];

    try {
      // Fetch question data from Supabase
      const res = await fetch(
        `${env.SUPABASE_URL}/rest/v1/questions?slug=eq.${slug}&select=*,quiz:quizzes!quiz_id(title,slug,subject)`,
        {
          headers: {
            apikey: env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
          },
        }
      );

      const [question] = await res.json();
      if (!question) return fetch(request); // 404 fallback to SPA

      // Build SEO HTML — no React, no JS, just content
      const html = buildSEOHtml(question, url.origin);

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=86400', // cache 24h
        },
      });
    } catch {
      return fetch(request); // On error, fall back to SPA
    }
  },
};

function buildSEOHtml(q, origin) {
  const options = q.options || [];
  const correctIdx = parseInt(q.correct_answer);
  const correctLetter = String.fromCharCode(65 + correctIdx);
  const quiz = q.quiz;
  const canonicalUrl = `${origin}/question/${q.slug}`;
  const title = `${q.question_text.slice(0, 60)} - USMLE Practice`;
  const description = q.question_text.slice(0, 155);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="article">
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: title,
    about: { '@type': 'Thing', name: q.topic || q.subject },
    hasPart: [{
      '@type': 'Question',
      name: q.question_text,
      acceptedAnswer: { '@type': 'Answer', text: options[correctIdx] || q.correct_answer },
      suggestedAnswer: options.map((opt, i) => ({ '@type': 'Answer', text: opt })),
    }],
  })}</script>
</head>
<body>
  <nav>${escHtml(q.subject)}${quiz ? ` › <a href="${origin}/quiz/${quiz.slug}">${escHtml(quiz.title)}</a>` : ''}</nav>
  <article>
    <h1>${escHtml(q.question_text)}</h1>
    <ol type="A">${options.map((opt) => `<li>${escHtml(opt)}</li>`).join('')}</ol>
    <section>
      <h2>Answer</h2>
      <p><strong>${correctLetter}) ${escHtml(options[correctIdx] || '')}</strong></p>
      ${q.explanation ? `<h2>Explanation</h2><p>${escHtml(q.explanation)}</p>` : ''}
    </section>
    ${quiz ? `<a href="${origin}/quiz/${quiz.slug}">Take Full Quiz: ${escHtml(quiz.title)}</a>` : ''}
  </article>
  <footer><a href="${origin}/browse">Browse All USMLE Questions</a></footer>
</body>
</html>`;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

```
WHAT HAPPENS NOW:

Google crawls /question/mechanism-of-metformin
      │
      ├── Cloudflare Worker detects: "This is Googlebot"
      │
      ├── Fetches question from Supabase (cached 24h)
      │
      ├── Returns lightweight HTML:
      │     <h1>What is the mechanism of action of metformin...</h1>
      │     <ol><li>Inhibits gluconeogenesis</li>...</ol>
      │     <h2>Answer</h2>
      │     <p>A) Inhibits gluconeogenesis</p>
      │     <h2>Explanation</h2>
      │     <p>Metformin primarily works by...</p>
      │
      └── Google indexes ALL of it ✓


Real user visits /question/mechanism-of-metformin
      │
      ├── Worker detects: "Not a crawler"
      │
      └── Serves normal SPA → React renders interactive page ✓
```

---

## Step 6: Caching (Don't Waste Supabase Resources)

Questions are **static content**. They rarely change. Cache aggressively:

```jsx
// src/hooks/useQuestion.js

import { useState, useEffect, useRef } from 'react';
import { fetchQuestionBySlug } from '../api/backendAPI';

// Simple in-memory cache — survives navigation, cleared on reload
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export function useQuestion(slug) {
  const [data, setData] = useState(() => cache.get(slug)?.data || null);
  const [loading, setLoading] = useState(!cache.has(slug));
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check cache
    const cached = cache.get(slug);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetchQuestionBySlug(slug).then((res) => {
      if (res.success) {
        cache.set(slug, { data: res.data, timestamp: Date.now() });
        setData(res.data);

        // Pre-cache related questions (user will likely click them)
        prefetchRelated(res.data.related);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
  }, [slug]);

  return { data, loading, error };
}

// Prefetch related questions in the background
function prefetchRelated(related) {
  if (!related?.length) return;

  // Fetch first 3 related questions after a short delay
  setTimeout(() => {
    related.slice(0, 3).forEach((q) => {
      if (!cache.has(q.slug)) {
        fetchQuestionBySlug(q.slug).then((res) => {
          if (res.success) {
            cache.set(q.slug, { data: res.data, timestamp: Date.now() });
          }
        });
      }
    });
  }, 2000); // wait 2s so main page loads first
}
```

Update the component to use the hook:

```jsx
// In QuestionPage.jsx, replace the useEffect with:

const { data, loading, error } = useQuestion(slug);
```

```
SUPABASE CALLS PER USER SESSION:

First question visit:     3 queries (question + related + nav)
Same question again:      0 queries (cached 30 min)
Related question click:   0 queries (pre-fetched!)
Back to first question:   0 queries (still cached)

Typical session of 10 questions: ~12-15 queries total
Without cache:                   ~30 queries total

For Google crawls:
Cloudflare Worker caches: 1 query per unique question per 24h
1000 questions × 1 query = 1000 queries/day MAX
Most will be cached → ~50-100 actual Supabase calls/day
```

---

## The Complete Picture

```
USER'S GOOGLE SEARCH
"mechanism of action of metformin usmle"
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  Google Search Results                               │
│                                                      │
│  1. resident.quest/question/mechanism-of-...  ◄──┤── YOUR PAGE
│     "What is the mechanism of action of metformin    │
│      in type 2 diabetes? A) Inhibits..."             │
│                                                      │
│  2. Some other site                                  │
│  3. Some other site                                  │
└─────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  /question/mechanism-of-action-of-metformin          │
│                                                      │
│  Anatomy > Pharmacology > Drug Mechanisms            │
│                                                      │
│  Q: What is the mechanism of action of metformin     │
│     in type 2 diabetes?                              │
│                                                      │
│  ● A) Inhibits hepatic gluconeogenesis               │
│  ○ B) Stimulates insulin secretion                   │
│  ○ C) Blocks alpha-glucosidase                       │
│  ○ D) Activates PPAR-gamma receptors                 │
│                                                      │
│  [Check Answer]                                      │
│                                                      │
│  ▶ Correct! A) Inhibits hepatic gluconeogenesis      │
│  ▶ Explanation: Metformin's primary mechanism...     │
│                                                      │
│  ─────────────────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────┐ │
│  │  📚 Take Full Quiz: Pharmacology Basics         │ │
│  │  15 questions · Medium difficulty                │ │
│  │  [Start Quiz →]                                  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  Related Questions:                                  │
│  • Which drug class acts on SGLT2 receptors...       │
│  • First-line treatment for type 2 diabetes...       │
│  • Side effects of metformin include...              │
│                                                      │
│  ← Previous Question    Next Question →              │
└─────────────────────────────────────────────────────┘
        │
        │  User thinks: "This is useful,
        │  let me try the full quiz"
        │
        ▼
┌─────────────────────┐
│  /quiz/pharmacology  │  ← CONVERSION
│  [Sign up to save    │
│   your progress]     │
└─────────────────────┘
```

```
WHAT YOU'RE GETTING:

Component              Purpose
──────────────────     ─────────────────────────────────
/question/:slug        SEO landing pages (Google traffic)
React Helmet           Dynamic meta tags per question
JSON-LD Schema         Rich snippets in search results
Sitemap                Google discovers all questions
Cloudflare Worker      Crawlers see full HTML content
In-memory cache        Minimal Supabase load
Prefetching            Instant navigation between questions
Related questions      Internal linking (SEO boost)
Quiz CTA               Converts visitors to users

New tables needed:     0
New Supabase queries:  1 function in backendAPI.js
Schema changes:        Maybe fix slugs (one-time)
```
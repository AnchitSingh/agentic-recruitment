-- Resident Quest Database Schema
-- Run this in Supabase SQL Editor

-- ============================================================================
-- TABLES
-- ============================================================================

-- Quizzes table
CREATE TABLE quizzes (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  time_limit INTEGER DEFAULT 60,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Questions table (separate for SEO)
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  subject TEXT,
  topic TEXT,
  difficulty TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User attempts (for future auth)
CREATE TABLE user_attempts (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  time_taken INTEGER,
  answers JSONB,
  completed_at TIMESTAMP DEFAULT NOW()
);

-- User bookmarks (for future auth)
CREATE TABLE user_bookmarks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  quiz_id INTEGER REFERENCES quizzes(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- ============================================================================
-- INDEXES (for performance)
-- ============================================================================

CREATE INDEX idx_quizzes_slug ON quizzes(slug);
CREATE INDEX idx_quizzes_category ON quizzes(category);
CREATE INDEX idx_quizzes_subject ON quizzes(subject);
CREATE INDEX idx_questions_slug ON questions(slug);
CREATE INDEX idx_questions_quiz_id ON questions(quiz_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;

-- Public read access for quizzes and questions
CREATE POLICY "Anyone can view published quizzes"
  ON quizzes FOR SELECT
  USING (is_published = true);

CREATE POLICY "Anyone can view questions"
  ON questions FOR SELECT
  USING (true);

-- Users can only see their own attempts and bookmarks
CREATE POLICY "Users can view own attempts"
  ON user_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts"
  ON user_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bookmarks"
  ON user_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own bookmarks"
  ON user_bookmarks FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS (helper functions)
-- ============================================================================

-- Function to get quiz with all questions
CREATE OR REPLACE FUNCTION get_quiz_with_questions(quiz_slug TEXT)
RETURNS JSON AS $$
  SELECT json_build_object(
    'quiz', row_to_json(q.*),
    'questions', (
      SELECT json_agg(row_to_json(qs.*))
      FROM questions qs
      WHERE qs.quiz_id = q.id
    )
  )
  FROM quizzes q
  WHERE q.slug = quiz_slug AND q.is_published = true;
$$ LANGUAGE SQL;

-- ============================================================================
-- SAMPLE DATA (optional - for testing)
-- ============================================================================

-- Will be inserted via separate script

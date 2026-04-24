/**
 * Question Validator - Simplified for on-device AI
 */

export const validateQuestionStructure = (question) => {
  const errors = [];
  const warnings = [];

  if (!question || typeof question !== 'object' || Array.isArray(question)) {
    return {
      valid: false,
      errors: ['Question is not a valid object'],
      warnings: []
    };
  }

  // Validate question text
  if (typeof question.question !== 'string') {
    errors.push('Question text must be a string');
  } else if (!question.question.trim()) {
    errors.push('Question text cannot be empty');
  }

  // MCQ and True/False validation (have options)
  if (question.options !== undefined) {
    if (!Array.isArray(question.options)) {
      errors.push('Options must be an array');
    } else {
      if (question.options.length < 2) {
        errors.push('Must have at least 2 options');
      }

      // Validate each option is a string or object with text property
      question.options.forEach((option, index) => {
        let isValid = false;
        
        if (typeof option === 'string' && option.trim()) {
          isValid = true;
        } else if (typeof option === 'object' && option !== null && typeof option.text === 'string' && option.text.trim()) {
          isValid = true;
        }
        
        if (!isValid) {
          errors.push(`Option ${index + 1} must be a non-empty string or object with text property`);
        }
      });

      // Validate correct_answer index
      if (typeof question.correct_answer !== 'number') {
        errors.push('correct_answer must be a number (index)');
      } else if (question.correct_answer < 0 || question.correct_answer >= question.options.length) {
        errors.push(`correct_answer out of range (0-${question.options.length - 1})`);
      }
    }
  }

  // Fill in Blank / Subjective validation
  if (question.answer !== undefined) {
    if (typeof question.answer !== 'string') {
      warnings.push('Answer should be a string');
    }
  }

  // Validate tags
  if (question.tags !== undefined) {
    if (!Array.isArray(question.tags)) {
      warnings.push('Tags should be an array');
    } else {
      const invalidTags = question.tags.filter(tag => typeof tag !== 'string');
      if (invalidTags.length > 0) {
        warnings.push(`${invalidTags.length} tag(s) are not strings`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

export const sanitizeQuestion = (question, index = 0, preserveId = false) => {
  if (!question || typeof question !== 'object') {
    console.error('Cannot sanitize non-object question:', question);
    return null;
  }

  const sanitized = {};

  // Sanitize question text (required)
  sanitized.question = normalizeToString(question.question);
  if (!sanitized.question) {
    console.error('Question has no valid text');
    return null;
  }

  // Preserve existing question ID
  sanitized.id = question.id || `q_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`;
  sanitized.type = question.type || 'MCQ';

  // Sanitize options if present (MCQ/TrueFalse) - convert to OLD FORMAT
  if (question.options !== undefined) {
    const stringOptions = sanitizeOptionsArray(question.options);
    
    if (!stringOptions || stringOptions.length < 2) {
      console.error('Failed to sanitize options');
      return null;
    }

    // Convert string array to OLD FORMAT: [{text, isCorrect}]
    sanitized.options = stringOptions.map((text, i) => ({
      text: text,
      isCorrect: false  // Will be set based on correct_answer
    }));

    // Handle correct_answer index (NEW FORMAT -> OLD FORMAT)
    let correctAnswerIndex;
    if (typeof question.correct_answer === 'number' && 
        question.correct_answer >= 0 && 
        question.correct_answer < sanitized.options.length) {
      sanitized.options[question.correct_answer].isCorrect = true;
      correctAnswerIndex = question.correct_answer;
    } else {
      // Try to find from OLD FORMAT
      const correctIndex = findCorrectAnswerIndex(question.options);
      if (correctIndex !== -1) {
        sanitized.options[correctIndex].isCorrect = true;
        correctAnswerIndex = correctIndex;
      } else {
        console.warn(`Question ${index}: No correct answer found, defaulting to first option`);
        sanitized.options[0].isCorrect = true;
        correctAnswerIndex = 0;
      }
    }
    
    // Preserve the correct_answer field for validation and other processes
    sanitized.correct_answer = correctAnswerIndex;
  }

  // Sanitize answer field (for Subjective/FillUp)
  if (question.answer !== undefined) {
    sanitized.answer = normalizeToString(question.answer) || '';
  }

  // Sanitize explanation field (preserve if exists)
  if (question.explanation !== undefined) {
    sanitized.explanation = normalizeToString(question.explanation) || '';
  }

  // Sanitize tags
  if (Array.isArray(question.tags)) {
    sanitized.tags = question.tags
      .filter(tag => typeof tag === 'string' && tag.trim())
      .map(tag => tag.trim().toLowerCase().replace(/\s+/g, '-'));
  } else {
    sanitized.tags = [];
  }

  return sanitized;
};

function normalizeToString(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    if (value.text) return normalizeToString(value.text);
    if (value.value) return normalizeToString(value.value);
    return JSON.stringify(value);
  }
  if (value === null || value === undefined) return '';
  return String(value);
}

function sanitizeOptionsArray(options) {
  if (!Array.isArray(options)) {
    console.warn('Options is not an array');
    return null;
  }

  const sanitized = options
    .map((option, index) => {
      if (!option) return null;

      // NEW FORMAT: already a string - keep it!
      if (typeof option === 'string') {
        return option.trim();
      }

      // OLD FORMAT: object with {text, correct/isCorrect} - extract text only
      if (typeof option === 'object') {
        const text = normalizeToString(option.text || option);
        return text || null;
      }

      return null;
    })
    .filter(opt => opt !== null && opt.length > 0);

  return sanitized.length >= 2 ? sanitized : null;
}

function findCorrectAnswerIndex(options) {
  if (!Array.isArray(options)) return -1;
  
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    if (option && typeof option === 'object') {
      if (option.correct === true || option.isCorrect === true) {
        return i;
      }
    }
  }
  return -1;
}

export const validateQuizStructure = (quiz) => {
  const errors = [];
  const warnings = [];

  if (!quiz || typeof quiz !== 'object') {
    return {
      valid: false,
      errors: ['Quiz is not a valid object'],
      warnings: []
    };
  }

  if (!Array.isArray(quiz.questions)) {
    errors.push('Quiz must have a questions array');
  } else if (quiz.questions.length === 0) {
    errors.push('Quiz must have at least one question');
  } else {
    quiz.questions.forEach((question, index) => {
      const validation = validateQuestionStructure(question);
      if (!validation.valid) {
        errors.push(`Question ${index + 1}: ${validation.errors.join(', ')}`);
      }
      if (validation.warnings.length > 0) {
        warnings.push(`Question ${index + 1}: ${validation.warnings.join(', ')}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalQuestions: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
    validQuestions: Array.isArray(quiz.questions)
      ? quiz.questions.filter(q => validateQuestionStructure(q).valid).length
      : 0
  };
};

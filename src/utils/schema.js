// src/utils/schema.js
// Simplified for on-device AI - no id, no type, simplified options

function isString(x) { return typeof x === 'string'; }
function isBool(x) { return typeof x === 'boolean'; }
function isNum(x) { return typeof x === 'number' && Number.isFinite(x); }
function isArray(x) { return Array.isArray(x); }
function isObject(x) { return x && typeof x === 'object' && !Array.isArray(x); }
function isNonEmptyString(x) { return typeof x === 'string' && x.trim().length > 0; }

/**
 * Validates a quiz object structure
 * @param {Object} obj - Quiz object to validate
 * @returns {boolean} True if valid
 */
export function validateQuiz(obj) {
  if (!isObject(obj)) {
    console.error('Quiz validation failed: not an object');
    return false;
  }

  if (!isArray(obj.questions)) {
    console.error('Quiz validation failed: questions is not an array');
    return false;
  }

  if (obj.questions.length === 0) {
    console.error('Quiz validation failed: questions array is empty');
    return false;
  }

  // Validate each question
  for (let i = 0; i < obj.questions.length; i++) {
    const q = obj.questions[i];
    
    if (!isObject(q)) {
      console.error(`Quiz validation failed: question ${i} is not an object`);
      return false;
    }

    // Question text is required
    if (!isNonEmptyString(q.question)) {
      console.error(`Quiz validation failed: question ${i} has invalid question text`);
      return false;
    }

    // MCQ and True/False have options array + correct_answer index
    if (q.options !== undefined) {
      if (!isArray(q.options)) {
        console.error(`Quiz validation failed: question ${i} options is not an array`);
        return false;
      }

      if (q.options.length < 2) {
        console.error(`Quiz validation failed: question ${i} has fewer than 2 options`);
        return false;
      }

      // Validate each option (can be string or object with text property)
      for (let j = 0; j < q.options.length; j++) {
        const option = q.options[j];
        let optionText;
        
        if (typeof option === 'string') {
          optionText = option;
        } else if (option && typeof option === 'object' && typeof option.text === 'string') {
          optionText = option.text;
        } else {
          console.error(`Quiz validation failed: question ${i} option ${j} is not a valid string or object with text property`);
          return false;
        }
        
        if (!isNonEmptyString(optionText)) {
          console.error(`Quiz validation failed: question ${i} option ${j} is not a valid string`);
          return false;
        }
      }

      // Validate correct_answer is a valid index
      if (!isNum(q.correct_answer)) {
        console.error(`Quiz validation failed: question ${i} missing correct_answer`);
        return false;
      }

      if (q.correct_answer < 0 || q.correct_answer >= q.options.length) {
        console.error(`Quiz validation failed: question ${i} correct_answer ${q.correct_answer} out of range`);
        return false;
      }
    }

    // Fill in Blank and Subjective need 'answer' field
    if (q.answer !== undefined && !isString(q.answer)) {
      console.warn(`Question ${i} has non-string answer`);
    }

    // Tags validation (optional but should be array of strings if present)
    if (q.tags !== undefined) {
      if (!isArray(q.tags)) {
        console.warn(`Question ${i} has non-array tags`);
      } else {
        const invalidTags = q.tags.filter(tag => !isString(tag));
        if (invalidTags.length > 0) {
          console.warn(`Question ${i} has ${invalidTags.length} non-string tags`);
        }
      }
    }
  }

  return true;
}

/**
 * Validates an AI evaluation response
 */
export function validateEvaluation(obj) {
  if (!isObject(obj)) {
    console.error('Evaluation validation failed: not an object');
    return false;
  }

  if (typeof obj.isCorrect !== 'boolean') {
    console.error('Evaluation validation failed: isCorrect is not a boolean');
    return false;
  }

  if (!isString(obj.explanation) && !isString(obj.rationale)) {
    console.error('Evaluation validation failed: explanation or rationale is required');
    return false;
  }

  if (obj.feedback !== undefined && !isString(obj.feedback)) {
    console.warn('Evaluation has non-string feedback field');
  }

  return true;
}

/**
 * Validates recommendations structure
 */
export function validateRecommendations(obj) {
  if (!isObject(obj)) {
    console.error('Recommendations validation failed: not an object');
    return false;
  }

  const requiredArrays = ['strengths', 'weaknesses', 'nextSteps'];
  for (const field of requiredArrays) {
    if (!isArray(obj[field])) {
      console.error(`Recommendations validation failed: ${field} is not an array`);
      return false;
    }

    for (let i = 0; i < obj[field].length; i++) {
      if (!isString(obj[field][i])) {
        console.error(`Recommendations validation failed: ${field}[${i}] is not a string`);
        return false;
      }
    }
  }

  return true;
}

/**
 * Validates quiz configuration
 */
export function validateConfig(config) {
  if (!isObject(config)) {
    console.error('Config validation failed: not an object');
    return false;
  }

  const boolFields = ['immediateFeedback', 'timerEnabled'];
  for (const field of boolFields) {
    if (config[field] !== undefined && !isBool(config[field])) {
      console.error(`Config validation failed: ${field} is not a boolean`);
      return false;
    }
  }

  const numFields = ['totalTimer', 'questionTimer'];
  for (const field of numFields) {
    if (config[field] !== undefined && !isNum(config[field])) {
      console.error(`Config validation failed: ${field} is not a number`);
      return false;
    }
  }

  const strFields = ['difficulty', 'subject'];
  for (const field of strFields) {
    if (config[field] !== undefined && !isString(config[field])) {
      console.error(`Config validation failed: ${field} is not a string`);
      return false;
    }
  }

  return true;
}

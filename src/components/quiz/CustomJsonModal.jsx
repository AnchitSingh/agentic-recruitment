import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { downloadQuizSchema } from '../../utils/downloadHelper';
import { saveQuizToHistory } from '../../utils/quizHistory';

const CustomJsonModal = ({ isOpen, onClose, onStartQuiz }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateJson = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Basic validation
      if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        return { valid: false, error: 'Quiz must contain a questions array with at least one question.' };
      }

      // Validate each question
      for (let i = 0; i < parsed.questions.length; i++) {
        const question = parsed.questions[i];
        
        if (!question.question || typeof question.question !== 'string') {
          return { valid: false, error: `Question ${i + 1}: Question text is required and must be a string.` };
        }
        
        if (!question.type || typeof question.type !== 'string') {
          return { valid: false, error: `Question ${i + 1}: Question type is required (MCQ, True/False, Short Answer, Fill in Blank).` };
        }

        if (question.type === 'MCQ' || question.type === 'True/False') {
          if (!question.options || !Array.isArray(question.options) || question.options.length === 0) {
            return { valid: false, error: `Question ${i + 1}: MCQ and True/False questions must have options array.` };
          }
          
          // Check if at least one option has isCorrect = true
          const correctOption = question.options.find(opt => opt.isCorrect === true);
          if (!correctOption) {
            return { valid: false, error: `Question ${i + 1}: MCQ and True/False questions must have at least one correct option.` };
          }
        }
      }

      return { valid: true, data: parsed };
    } catch (e) {
      return { valid: false, error: `Invalid JSON format: ${e.message}` };
    }
  };

  const handleLoadJson = async () => {
    if (!jsonInput.trim()) {
      setError('Please enter or paste your quiz JSON data.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const validation = validateJson(jsonInput);
      
      if (!validation.valid) {
        setError(validation.error);
        setLoading(false);
        return;
      }

      // Add default config if not present
      const quizData = {
        ...validation.data,
        config: {
          immediateFeedback: validation.data.config?.immediateFeedback ?? true,
          timerEnabled: validation.data.config?.timerEnabled ?? false,
          totalTimer: validation.data.config?.totalTimer ?? 600,
          questionTimer: validation.data.config?.questionTimer ?? 0,
          difficulty: validation.data.config?.difficulty ?? 'medium',
          subject: validation.data.subject ?? 'Custom Quiz'
        }
      };

      // Add ID if not present
      if (!quizData.id) {
        quizData.id = `custom_quiz_${Date.now()}`;
      }

      // Set totalQuestions based on actual questions
      quizData.totalQuestions = quizData.questions.length;

      // Ensure timeLimit is set
      if (!quizData.timeLimit) {
        quizData.timeLimit = quizData.config.totalTimer;
      }

      console.log('DEBUG: Prepared quiz data for start:', quizData);

      // Save to history
      await saveQuizToHistory(quizData);

      // Start the quiz with the custom data
      await onStartQuiz({ quizData });
      onClose();
      setJsonInput('');
    } catch (err) {
      setError('Failed to process quiz data. Please check the format and try again.');
      console.error('Error processing custom quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setError('Please select a valid JSON file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        JSON.parse(content); // Validate it's valid JSON
        setJsonInput(content);
        setError('');
      } catch (err) {
        setError('File contains invalid JSON format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Load Custom Quiz"
      size="lg"
    >
      <div className="space-y-6">
        <div>
          <p className="text-slate-600 mb-4">
            Load your own quiz questions in JSON format. You can either paste JSON directly or upload a JSON file.
          </p>
          
          <div className="flex gap-3 mb-4">
            <Button
              onClick={() => downloadQuizSchema('quiz-schema-template')}
              variant="secondary"
              className="flex-1"
            >
              Download Schema Template
            </Button>
            <label className="flex-1 cursor-pointer">
              <div className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-center border border-slate-200 hover:border-slate-300 transition-colors">
                Upload JSON File
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="json-input" className="block text-sm font-medium text-slate-700 mb-2">
            Quiz JSON Data
          </label>
          <textarea
            id="json-input"
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              if (error) setError(''); // Clear error when user starts typing
            }}
            placeholder='Paste your quiz JSON here, e.g.:
{
  "title": "Sample Quiz",
  "questions": [
    {
      "id": "q1",
      "question": "What is 2+2?",
      "type": "MCQ",
      "options": [
        {"text": "3", "isCorrect": false},
        {"text": "4", "isCorrect": true}
      ],
      "correct_answer": 1
    }
  ]
}'
            rows={10}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono text-sm"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            onClick={onClose}
            variant="secondary"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleLoadJson}
            loading={loading}
            disabled={loading || !jsonInput.trim()}
            className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
          >
            {loading ? 'Loading Quiz...' : 'Start Quiz'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CustomJsonModal;
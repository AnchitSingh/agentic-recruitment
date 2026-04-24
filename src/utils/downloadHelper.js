/**
 * Helper functions for downloading files
 */

/**
 * Downloads JSON data as a file
 * @param {Object} data - The JSON data to download
 * @param {string} filename - The filename to use (without extension)
 */
export const downloadJson = (data, filename) => {
  try {
    // Convert the data to a formatted JSON string
    const jsonString = JSON.stringify(data, null, 2);
    
    // Create a blob with the JSON data
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create a download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    
    // Trigger the download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading JSON:', error);
    alert('Failed to download JSON file. Please try again.');
  }
};

/**
 * Downloads a JSON schema template for quiz creation
 * @param {string} filename - The filename to use (without extension)
 */
export const downloadQuizSchema = (filename = 'quiz-schema-template') => {
  const schema = {
    "id": "sample-quiz-1",
    "title": "Sample Quiz",
    "subject": "Sample Subject",
    "totalQuestions": 4,
    "config": {
      "immediateFeedback": true,
      "timerEnabled": false,
      "totalTimer": 600,
      "questionTimer": 0,
      "difficulty": "medium"
    },
    "timeLimit": 600,
    "questions": [
      {
        "id": "q1",
        "question": "What is the capital of France?",
        "type": "MCQ",
        "options": [
          {
            "text": "London",
            "isCorrect": false
          },
          {
            "text": "Berlin", 
            "isCorrect": false
          },
          {
            "text": "Paris",
            "isCorrect": true
          },
          {
            "text": "Madrid",
            "isCorrect": false
          }
        ],
        "correct_answer": 2,
        "explanation": "Paris is the capital and most populous city of France.",
        "tags": ["geography", "europe", "capital"],
        "difficulty": "easy"
      },
      {
        "id": "q2",
        "question": "The Earth is flat.",
        "type": "True/False",
        "options": [
          {
            "text": "True",
            "isCorrect": false
          },
          {
            "text": "False",
            "isCorrect": true
          }
        ],
        "correct_answer": 1,
        "explanation": "The Earth is an oblate spheroid, not flat.",
        "tags": ["science", "geography"],
        "difficulty": "easy"
      },
      {
        "id": "q3",
        "question": "The chemical symbol for gold is _____",
        "type": "Fill in Blank",
        "questionText": "The chemical symbol for gold is _____",
        "acceptableAnswers": [
          ["Au"],
          ["au"],
          ["AU"]
        ],
        "explanation": "The chemical symbol for gold in the periodic table is Au.",
        "tags": ["chemistry", "elements"],
        "difficulty": "medium"
      },
      {
        "id": "q4",
        "question": "Explain the theory of relativity in simple terms.",
        "type": "Short Answer",
        "explanation": "Einstein's theory of relativity consists of special relativity and general relativity, describing the relationship between space and time.",
        "tags": ["physics", "einstein", "relativity"],
        "difficulty": "hard"
      }
    ]
  };

  downloadJson(schema, filename);
};
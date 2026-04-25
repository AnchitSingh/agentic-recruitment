import { GoogleGenAI } from '@google/genai';

// Initialize the Google GenAI client for browser
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

/**
 * Generate embedding vector for a given text
 * @param {string} text - The text to generate embedding for
 * @returns {Promise<number[]>} - The embedding vector as an array of numbers
 */
export async function generateEmbedding(text) {
  if (!text) {
    throw new Error('Text is required for embedding generation');
  }

  try {
    console.log('Generating embedding for text...');
    
    // Call the Gemini embedding API
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: text,
    });

    // Extract the vector from the response
    const vector = response.embeddings[0].values;
    
    console.log('✅ Embedding generated successfully');
    return vector;
    
  } catch (error) {
    console.error('❌ Failed to generate embedding:', error.message);
    throw error;
  }
}

/**
 * Generate embedding for a job description object
 * @param {Object} jdData - The job description object containing meta.embedding_text
 * @returns {Promise<Object>} - The JD data with the embedding vector added
 */
export async function generateJDEmbedding(jdData) {
  if (!jdData?.meta?.embedding_text) {
    throw new Error('JD data must contain meta.embedding_text');
  }

  try {
    const vector = await generateEmbedding(jdData.meta.embedding_text);
    
    // Add the embedding vector to the JD data
    const jdWithEmbedding = {
      ...jdData,
      meta: {
        ...jdData.meta,
        embedding_vector: vector
      }
    };
    
    return jdWithEmbedding;
    
  } catch (error) {
    console.error('❌ Failed to generate JD embedding:', error.message);
    throw error;
  }
}

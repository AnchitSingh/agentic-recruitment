import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

// 1. Initialize the Google GenAI client (NEW SDK)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,   // ← Use environment variable!
});

// Helper function to delay execution (avoids rate limiting on free tier)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processEmbeddings() {
  console.log('Loading candidates from database...');
  
  // 2. Read your JSON file
  const rawData = fs.readFileSync('candidate_db.json', 'utf8');
  const candidates = JSON.parse(rawData);
  
  console.log(`Found ${candidates.length} candidates. Generating Google Embeddings...`);

  // 3. Loop through candidates and fetch vectors
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const textToEmbed = candidate.meta.embedding_text;

    try {
      console.log(`[${i + 1}/${candidates.length}] Embedding: ${candidate.candidate_id}...`);
      
      // NEW SDK call
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-2',           // ← Latest model (correct)
        contents: textToEmbed,
      });

      // Extract the vector (note the new response shape)
      const vector = response.embeddings[0].values;

      // Save the generated array of numbers into the candidate object
      candidate.meta.embedding_vector = vector;

      // Sleep for 1 second to respect free-tier rate limits
      await sleep(1000);

    } catch (error) {
      console.error(`❌ Failed to embed candidate ${candidate.candidate_id}:`, error.message);
    }
  }

  // 4. Save the updated candidates to a new file
  fs.writeFileSync(
    'candidate_db_with_vectors.json', 
    JSON.stringify(candidates, null, 2)
  );
  
  console.log('\n✅ Success! Saved to candidate_db_with_vectors.json');
  console.log('Your vector database is ready for the hackathon.');
}

processEmbeddings();
// src/utils/geminiAI.js
import { GoogleGenAI } from "@google/genai";
import { sanitizeJSON, repairJSON } from './jsonUtils';

// Initialize Gemini AI client
let aiClient = null;

// Job Description Schema for structured output
const jdSchema = {
  type: "object",
  properties: {
    jd_id: {
      type: "string",
      description: "Unique identifier for the job description"
    },
    parsed_at: {
      type: "string",
      description: "ISO timestamp when the job was parsed"
    },
    raw_title: {
      type: "string",
      description: "Original job title as seen in the posting"
    },
    role: {
      type: "object",
      properties: {
        title: { type: "string", description: "Clean role title" },
        seniority: { type: "string", description: "seniority level like junior, senior, lead" },
        employment_type: { type: "string", description: "full-time, part-time, contract" },
        location: {
          type: "object",
          properties: {
            type: { type: "string", description: "remote, hybrid, on-site" },
            city: { type: "string" },
            country: { type: "string" },
            remote_allowed: { type: "boolean" }
          }
        }
      }
    },
    experience: {
      type: "object",
      properties: {
        min_years: { type: "number" },
        max_years: { type: "number" },
        preferred_years: { type: "number" }
      }
    },
    skills: {
      type: "object",
      properties: {
        must_have: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              normalized: { type: "string" },
              weight: { type: "number" }
            }
          }
        },
        nice_to_have: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              normalized: { type: "string" },
              weight: { type: "number" }
            }
          }
        },
        domain_knowledge: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              weight: { type: "number" }
            }
          }
        }
      }
    },
    responsibilities: {
      type: "array",
      items: { type: "string" }
    },
    qualifications: {
      type: "object",
      properties: {
        education: {
          type: "object",
          properties: {
            degree: { type: "string" },
            required: { type: "boolean" }
          }
        },
        certifications: {
          type: "array",
          items: { type: "string" }
        }
      }
    },
    company: {
      type: "object",
      properties: {
        name: { type: "string" },
        industry: { type: "string" },
        size: { type: "string" },
        culture_tags: {
          type: "array",
          items: { type: "string" }
        }
      }
    },
    compensation: {
      type: "object",
      properties: {
        min_lpa: { type: "number" },
        max_lpa: { type: "number" },
        currency: { type: "string" },
        disclosed: { type: "boolean" }
      }
    },
    meta: {
      type: "object",
      properties: {
        search_blob: { type: "string" },
        embedding_text: { type: "string" },
        confidence_score: { type: "number" }
      }
    }
  },
  required: ["jd_id", "parsed_at", "raw_title", "role", "experience", "skills", "responsibilities", "qualifications", "company", "compensation", "meta"]
};

function initializeGeminiClient() {
  if (!aiClient) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY environment variable.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Extract JSON from images and text using Gemini API with structured output
 */
export async function extractJSONFromImages({ imageBlobs, schemaPrompt, onProgress }) {
  const ai = initializeGeminiClient();
  
  if (!imageBlobs || imageBlobs.length === 0) {
    throw new Error('No content provided for extraction');
  }
  
  console.log(`🔄 Processing ${imageBlobs.length} item(s) with Gemini...`);

  // Filter out any invalid items early
  const validItems = imageBlobs.filter(item => item && item.blob && item.blob.size > 0);
  if (validItems.length === 0) {
    throw new Error('All provided items are empty or invalid');
  }

  try {
    // Separate images and text content
    const imageItems = [];
    const textItems = [];
    
    for (const item of imageBlobs) {
      if (item.type === 'text') {
        textItems.push(item);
      } else {
        imageItems.push(item);
      }
    }
    
    // Upload images to Gemini
    const uploadedFiles = [];
    for (const [index, item] of imageItems.entries()) {
      const blob = item.blob;

      // Safety check
      if (!blob || blob.size === 0) {
        throw new Error(`Invalid or empty image blob at index ${index}`);
      }

      // Determine correct MIME type
      const mimeType = blob.type && blob.type.startsWith('image/')
        ? blob.type
        : 'image/png';

      console.log(`Uploading image ${index + 1} (${(blob.size / 1024).toFixed(1)} KB)...`);

      // Pass the Blob DIRECTLY with displayName
      const file = await ai.files.upload({
        file: blob,
        config: {
          mimeType: mimeType,
          displayName: item.name || `image-${index + 1}`
        }
      });

      uploadedFiles.push(file);
      console.log(`✅ Uploaded: ${file.name} (${file.sizeBytes} bytes)`);

      // Emit progress callback
      if (onProgress) {
        onProgress({ stage: 'upload', progress: ((index + 1) / imageItems.length) * 100, message: `Uploaded image ${index + 1}/${imageItems.length}` });
      }
    }
    
    // Create content parts with images
    const contentParts = uploadedFiles.map(file => ({
      fileData: {
        mimeType: file.mimeType,
        fileUri: file.uri
      }
    }));
    
    // Add text content if available
    let prompt = '';
    const contentType = imageItems.length > 0 && textItems.length > 0
      ? 'images and text content'
      : imageItems.length > 0 ? 'document image(s)' : 'text content';

    if (textItems.length > 0) {
      const allText = textItems.map(item => item.text).join('\n\n');
      prompt = schemaPrompt || `Extract structured job description data from the following ${contentType}:\n\n${allText}\n\nPlease analyze the job posting and extract all information according to the schema. Focus on:\n- Role details and requirements\n- Skills (both technical and domain knowledge)\n- Experience requirements\n- Responsibilities\n- Compensation information if available\n- Company details\n\nGenerate a unique jd_id using format "jd_" followed by random alphanumeric characters.\nUse current timestamp for parsed_at in ISO format.\nCreate appropriate search_blob and embedding_text for search/matching purposes.\nAssign confidence score based on clarity of information (0.0-1.0).`;
    } else {
      prompt = schemaPrompt || `Extract structured job description data from the provided ${contentType}.\n\nPlease analyze the job posting and extract all information according to the schema. Focus on:\n- Role details and requirements\n- Skills (both technical and domain knowledge)\n- Experience requirements\n- Responsibilities\n- Compensation information if available\n- Company details\n\nGenerate a unique jd_id using format "jd_" followed by random alphanumeric characters.\nUse current timestamp for parsed_at in ISO format.\nCreate appropriate search_blob and embedding_text for search/matching purposes.\nAssign confidence score based on clarity of information (0.0-1.0).`;
    }

    contentParts.push({ text: prompt });
    
    // Generate content with structured output
    if (onProgress) {
      onProgress({ stage: 'generating', progress: 0, message: 'Generating structured data...' });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: contentParts,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: jdSchema
      }
    });
    
    console.log('Raw Gemini response:', response.text);
    
    // Parse and validate the JSON response
    let parsedData;
    try {
      // First try direct parsing (Gemini should return valid JSON with structured output)
      parsedData = JSON.parse(response.text);
    } catch (parseError) {
      console.warn('Direct JSON parsing failed, attempting repair:', parseError.message);
      
      try {
        // Try to repair the JSON
        const jsonString = sanitizeJSON(response.text);
        parsedData = repairJSON(jsonString);
      } catch (repairError) {
        console.error('JSON repair failed:', repairError.message);
        throw new Error(`Failed to parse Gemini response as valid JSON: ${repairError.message}`);
      }
    }
    
    console.log('✅ Extraction successful with Gemini');
    
    // Clean up uploaded files
    for (const file of uploadedFiles) {
      try {
        await ai.files.delete(file.name);
      } catch (cleanupError) {
        console.warn('Failed to clean up file:', file.name, cleanupError.message);
      }
    }
    
    return parsedData;
    
  } catch (error) {
    console.error('Gemini extraction error:', error);
    
    // Provide more specific error messages
    if (error.message.includes('API key')) {
      throw new Error('Invalid Gemini API key. Please check your VITE_GEMINI_API_KEY environment variable.');
    }
    
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      throw new Error('Gemini API quota exceeded. Please try again later.');
    }
    
    if (error.message.includes('model')) {
      throw new Error('Gemini model unavailable. Please check the model name.');
    }
    
    throw new Error(`Gemini extraction failed: ${error.message}`);
  }
}

export default {
  extractJSONFromImages
};

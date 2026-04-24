import { GoogleGenAI } from "@google/genai";
import { sanitizeJSON, repairJSON } from './jsonUtils';

/**
 * Gemini AI Service for document processing
 */
export class GeminiAIService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Extract JSON from documents using Gemini API with structured output
   * @param {Array} items - Array of { blob: Blob, type: 'image'|'text', text?: string }
   * @param {Object} schema - JSON schema for structured output
   * @param {string} customPrompt - Optional custom prompt
   * @param {Function} onProgress - Progress callback function
   * @returns {Promise<Object>} - Extracted structured data
   */
  async extractStructuredData({ items, schema, customPrompt, onProgress }) {
    if (!items || items.length === 0) {
      throw new Error('No content provided for extraction');
    }
    
    console.log(`🔄 Processing ${items.length} item(s) with Gemini...`);
    
    // Progress callback: Started processing
    if (onProgress) {
      onProgress({
        stage: 'started',
        message: 'Starting document processing...',
        progress: 0,
        total: items.length
      });
    }
    
    try {
      // Separate images and text content
      const imageItems = [];
      const textItems = [];
      
      for (const item of items) {
        if (item.type === 'text') {
          textItems.push(item);
        } else {
          imageItems.push(item);
        }
      }
      
      // Progress callback: Content separated
      if (onProgress) {
        onProgress({
          stage: 'separated',
          message: `Separated ${imageItems.length} image(s) and ${textItems.length} text item(s)`,
          progress: 10,
          total: items.length
        });
      }
      
      // Upload images to Gemini
      const uploadedFiles = [];
      for (const [index, blob] of imageItems.entries()) {
        // Progress callback: Uploading image
        if (onProgress) {
          onProgress({
            stage: 'uploading',
            message: `Uploading image ${index + 1} of ${imageItems.length}...`,
            progress: 20 + (index * 30 / imageItems.length),
            total: items.length,
            current: index + 1,
            imageCount: imageItems.length
          });
        }
        
        const file = await this.ai.files.upload({
          file: blob,
          config: {
            mimeType: blob.type || 'image/jpeg'
          }
        });
        uploadedFiles.push(file);
        console.log(`Uploaded image ${index + 1}: ${file.name}`);
      }
      
      // Progress callback: Upload complete
      if (onProgress) {
        onProgress({
          stage: 'uploaded',
          message: `Successfully uploaded ${uploadedFiles.length} image(s) to Gemini`,
          progress: 50,
          total: items.length,
          uploadedCount: uploadedFiles.length
        });
      }
      
      // Create content parts with images
      const contentParts = uploadedFiles.map(file => ({
        fileData: {
          mimeType: file.mimeType,
          fileUri: file.uri
        }
      }));
      
      // Add text content if available
      let prompt = customPrompt || this.getDefaultPrompt();
      if (textItems.length > 0) {
        const allText = textItems.map(item => item.text).join('\n\n');
        prompt = `Extract structured data from the following text content:\n\n${allText}\n\n${prompt}`;
      }

      contentParts.push({ text: prompt });
      
      // Progress callback: Sending to Gemini
      if (onProgress) {
        onProgress({
          stage: 'processing',
          message: 'Sending content to Gemini AI for analysis...',
          progress: 60,
          total: items.length
        });
      }
      
      // Generate content with structured output
      const response = await this.ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: contentParts,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: schema
        }
      });
      
      // Progress callback: Gemini response received
      if (onProgress) {
        onProgress({
          stage: 'received',
          message: 'Received response from Gemini AI...',
          progress: 80,
          total: items.length
        });
      }
      
      console.log('Raw Gemini response:', response.text);
      
      // Progress callback: Parsing response
      if (onProgress) {
        onProgress({
          stage: 'parsing',
          message: 'Parsing and validating structured data...',
          progress: 85,
          total: items.length
        });
      }
      
      // Parse and validate the JSON response
      let parsedData;
      try {
        // First try direct parsing (Gemini should return valid JSON with structured output)
        parsedData = JSON.parse(response.text);
      } catch (parseError) {
        console.warn('Direct JSON parsing failed, attempting repair:', parseError.message);
        
        // Progress callback: Repairing JSON
        if (onProgress) {
          onProgress({
            stage: 'repairing',
            message: 'Repairing JSON structure...',
            progress: 90,
            total: items.length
          });
        }
        
        try {
          // Try to repair the JSON
          const jsonString = sanitizeJSON(response.text);
          parsedData = repairJSON(jsonString);
        } catch (repairError) {
          console.error('JSON repair failed:', repairError.message);
          throw new Error(`Failed to parse Gemini response as valid JSON: ${repairError.message}`);
        }
      }
      
      // Progress callback: Complete
      if (onProgress) {
        onProgress({
          stage: 'completed',
          message: 'Successfully extracted structured data!',
          progress: 100,
          total: items.length,
          result: parsedData
        });
      }
      
      console.log('✅ Extraction successful with Gemini');
      
      // Clean up uploaded files
      for (const file of uploadedFiles) {
        try {
          await this.ai.files.delete(file.name);
        } catch (cleanupError) {
          console.warn('Failed to clean up file:', file.name, cleanupError.message);
        }
      }
      
      return parsedData;
      
    } catch (error) {
      console.error('Gemini extraction error:', error);
      
      // Provide more specific error messages
      if (error.message.includes('API key')) {
        throw new Error('Invalid Gemini API key. Please check your API key configuration.');
      }
      
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new Error('Gemini API quota exceeded. Please try again later.');
      }
      
      if (error.message.includes('model')) {
        throw new Error('Gemini model unavailable. The model may not be accessible.');
      }
      
      throw new Error(`Gemini extraction failed: ${error.message}`);
    }
  }

  /**
   * Get default prompt for job description extraction
   */
  getDefaultPrompt() {
    return `Please analyze the job posting and extract all information according to the schema. Focus on:
- Role details and requirements
- Skills (both technical and domain knowledge)
- Experience requirements
- Responsibilities
- Compensation information if available
- Company details

Generate a unique jd_id using format "jd_" followed by random alphanumeric characters.
Use current timestamp for parsed_at in ISO format.
Create appropriate search_blob and embedding_text for search/matching purposes.
Assign confidence score based on clarity of information (0.0-1.0).`;
  }

  /**
   * Extract job description data using default schema
   * @param {Array} items - Array of document items
   * @param {Function} onProgress - Progress callback function
   * @returns {Promise<Object>} - Job description data
   */
  async extractJobDescription(items, onProgress) {
    const jobSchema = this.getJobDescriptionSchema();
    return this.extractStructuredData({ 
      items, 
      schema: jobSchema,
      customPrompt: this.getDefaultPrompt(),
      onProgress
    });
  }

  /**
   * Get job description schema
   */
  getJobDescriptionSchema() {
    return {
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
  }
}

export default GeminiAIService;

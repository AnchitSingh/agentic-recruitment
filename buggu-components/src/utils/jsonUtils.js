import { jsonrepair } from 'jsonrepair';

/**
 * Clean up AI-generated JSON string
 */
export function sanitizeJSON(rawText) {
    if (!rawText) {
        throw new Error('Empty response from AI model');
    }
    
    let cleaned = rawText;
    
    // Remove markdown code fences
    cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '');
    
    // Remove common AI response prefixes
    cleaned = cleaned.replace(/^(Here is|Here's|I have|The following is|Below is)\s+(the\s+)?(JSON|json)/gi, '');
    cleaned = cleaned.replace(/^The\s+extracted\s+(JSON|json)\s+(is|data|response)\s*[:]\s*/gi, '');
    
    // Remove explanatory text before JSON
    cleaned = cleaned.replace(/^[^{]*/gi, '');
    
    // Remove explanatory text after JSON
    cleaned = cleaned.replace(/[^}]*$/gi, '');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
}

/**
 * Attempt to repair malformed JSON using jsonrepair library
 */
export function repairJSON(jsonString) {
    try {
        // Try parsing as-is first
        return JSON.parse(jsonString);
    } catch (parseError) {
        // Use jsonrepair library to fix malformed JSON
        try {
            const repairedJson = jsonrepair(jsonString);
            return JSON.parse(repairedJson);
        } catch (repairError) {
            throw new Error('Unable to repair JSON automatically');
        }
    }
}

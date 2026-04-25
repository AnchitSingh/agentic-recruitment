import { useState, useCallback } from 'react';
import { processFiles, createPreviewURL, revokePreviewURL } from '../utils/buggu/pdfProcessor';

/**
 * useDocumentProcessor - Custom hook for document processing functionality.
 * Handles file uploads, text input, preview generation, and processing state management.
 *
 * @param {Object} options - Processing options
 * @param {Function} [options.onSuccess] - Callback when processing succeeds, receives processed items
 * @param {Function} [options.onError] - Callback when processing fails, receives error object
 * @returns {Object} Processing state and functions:
 *   - State: files, processedItems, previewUrls, loading, error
 *   - Actions: processUploadedFiles, processTextInput, clearAll
 *   - Getters: getImageBlobs, getTextContent, getProcessedItems
 *   - Computed: hasContent, imageCount, textCount, totalCount
 */
export function useDocumentProcessor(options = {}) {
	const [files, setFiles] = useState([]);
	const [processedItems, setProcessedItems] = useState([]);
	const [previewUrls, setPreviewUrls] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	/**
	 * processUploadedFiles - Processes uploaded files (PDFs, images, etc.).
	 * Generates processed items and preview URLs for images.
	 *
	 * @param {FileList|File[]} uploadedFiles - Files to process
	 */
	const processUploadedFiles = useCallback(async (uploadedFiles) => {
		if (!uploadedFiles || uploadedFiles.length === 0) {
			setError('No files provided');
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const filesArray = Array.isArray(uploadedFiles) ? uploadedFiles : Array.from(uploadedFiles);
			setFiles(filesArray);

			const processed = await processFiles(filesArray);
			setProcessedItems(processed);

			// Create preview URLs for images only
			const urls = processed
				.filter(item => item.type === 'image')
				.map(img => createPreviewURL(img.blob));
			setPreviewUrls(urls);

			// Call success callback if provided
			if (options.onSuccess) {
				options.onSuccess(processed);
			}
		} catch (err) {
			const errorMessage = err.message || 'Failed to process files';
			setError(errorMessage);

			// Call error callback if provided
			if (options.onError) {
				options.onError(err);
			}
		} finally {
			setLoading(false);
		}
	}, [options.onSuccess, options.onError]);

	/**
	 * processTextInput - Processes raw text input as a document.
	 * Creates a text blob and adds it to processed items.
	 *
	 * @param {string} text - Text content to process
	 */
	const processTextInput = useCallback(async (text) => {
		if (!text || !text.trim()) {
			setError('No text provided');
			return;
		}

		setLoading(true);
		setError(null);
		setFiles([]); // Clear any existing files

		try {
			// Create a text blob from the input
			const textBlob = new Blob([text], { type: 'text/plain' });
			const textItem = {
				blob: textBlob,
				type: 'text',
				name: 'text-input',
				text: text
			};

			setProcessedItems([textItem]);
			setPreviewUrls([]); // No preview URLs for text input

			// Call success callback if provided
			if (options.onSuccess) {
				options.onSuccess([textItem]);
			}
		} catch (err) {
			const errorMessage = err.message || 'Failed to process text';
			setError(errorMessage);

			// Call error callback if provided
			if (options.onError) {
				options.onError(err);
			}
		} finally {
			setLoading(false);
		}
	}, [options.onSuccess, options.onError]);

	/**
	 * clearAll - Clears all processed data and revokes preview URLs to free memory.
	 */
	const clearAll = useCallback(() => {
		setFiles([]);
		setProcessedItems([]);

		// Revoke preview URLs to free memory
		previewUrls.forEach(url => revokePreviewURL(url));
		setPreviewUrls([]);

		setError(null);
	}, [previewUrls]);

	/**
	 * getImageBlobs - Returns array of image blobs for AI processing.
	 * @returns {Blob[]} Array of image blobs
	 */
	const getImageBlobs = useCallback(() => {
		return processedItems.map(item => item.blob);
	}, [processedItems]);

	/**
	 * getTextContent - Returns concatenated text content from all text items.
	 * @returns {string} Combined text content
	 */
	const getTextContent = useCallback(() => {
		const textItems = processedItems.filter(item => item.type === 'text');
		return textItems.map(item => item.text).join('\n\n');
	}, [processedItems]);

	/**
	 * getProcessedItems - Returns all processed items (images and text).
	 * @returns {Object[]} Array of processed item objects
	 */
	const getProcessedItems = useCallback(() => {
		return processedItems;
	}, [processedItems]);

	return {
		// State
		files,
		processedItems,
		previewUrls,
		loading,
		error,

		// Actions
		processUploadedFiles,
		processTextInput,
		clearAll,

		// Getters
		getImageBlobs,
		getTextContent,
		getProcessedItems,

		// Computed
		hasContent: processedItems.length > 0,
		imageCount: processedItems.filter(item => item.type === 'image').length,
		textCount: processedItems.filter(item => item.type === 'text').length,
		totalCount: processedItems.length
	};
}

export default useDocumentProcessor;

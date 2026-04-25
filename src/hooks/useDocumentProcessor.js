import { useState, useCallback } from 'react';
import { processFiles, createPreviewURL, revokePreviewURL } from '../utils/buggu/pdfProcessor';

/**
 * Hook for document processing functionality
 * @param {Object} options - Processing options
 * @returns {Object} - Processing state and functions
 */
export function useDocumentProcessor(options = {}) {
	const [files, setFiles] = useState([]);
	const [processedItems, setProcessedItems] = useState([]);
	const [previewUrls, setPreviewUrls] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// Process uploaded files
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

	// Process text input
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

	// Clear all processed data
	const clearAll = useCallback(() => {
		setFiles([]);
		setProcessedItems([]);

		// Revoke preview URLs to free memory
		previewUrls.forEach(url => revokePreviewURL(url));
		setPreviewUrls([]);

		setError(null);
	}, [previewUrls]);

	// Get image blobs for AI processing
	const getImageBlobs = useCallback(() => {
		return processedItems.map(item => item.blob);
	}, [processedItems]);

	// Get text content for AI processing
	const getTextContent = useCallback(() => {
		const textItems = processedItems.filter(item => item.type === 'text');
		return textItems.map(item => item.text).join('\n\n');
	}, [processedItems]);

	// Get all items for AI processing
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

// src/hooks/useDocumentHead.js

import { useEffect } from 'react';

/**
 * useDocumentHead - Custom hook for managing document head metadata.
 * Updates the document title and meta description tag.
 *
 * @param {Object} params - Metadata parameters
 * @param {string} [params.title] - Document title to set
 * @param {string} [params.description] - Meta description to set
 */
export function useDocumentHead({ title, description }) {
	useEffect(() => {
		if (title) {
			document.title = title;
		}

		if (description) {
			let meta = document.querySelector('meta[name="description"]');
			if (!meta) {
				meta = document.createElement('meta');
				meta.name = 'description';
				document.head.appendChild(meta);
			}
			meta.setAttribute('content', description);
		}
	}, [title, description]);
}
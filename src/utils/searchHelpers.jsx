export const formatCount = (n) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${n}`;

export const difficultyClasses = (d) =>
    d === 'Easy'
        ? 'bg-green-50 text-green-600'
        : d === 'Medium'
        ? 'bg-amber-50 text-amber-600'
        : 'bg-red-50 text-red-600';

export const highlightText = (text, query) => {
    if (!query?.trim()) return text;
    try {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? (
                <span key={i} className="bg-amber-200/70 text-amber-900 rounded-sm font-semibold">
                    {part}
                </span>
            ) : (
                <span key={i}>{part}</span>
            )
        );
    } catch {
        return text;
    }
};

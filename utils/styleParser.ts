/**
 * Parses a raw style string from a StyleProfile into a structured array for display.
 * @param style - The multi-line string containing style characteristics.
 * @returns An array of key-value pairs representing the style preview.
 */
export const parseStylePreview = (style: string): { key: string, value: string }[] => {
    if (!style) return [];
    return style
        .split('\n')
        .map(line => {
            const parts = line.split(':');
            if (parts.length < 2) return null;
            const key = parts[0].trim().replace(/^- /, '');
            const value = parts.slice(1).join(':').trim();
            return { key, value };
        })
        .filter((item): item is { key: string, value: string } => item !== null)
        .slice(0, 3); // Show first 3 characteristics
};

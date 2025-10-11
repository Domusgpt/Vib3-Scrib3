const normalizeBaseUrl = (value: string | undefined) => {
    if (!value) {
        return '';
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

export const clientEnv = {
    API_BASE_URL: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
    RELEASE_CHANNEL: (import.meta.env.VITE_RELEASE_CHANNEL ?? 'development').trim() || 'development',
};

export type ClientEnv = typeof clientEnv;

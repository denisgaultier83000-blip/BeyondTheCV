export async function readApiErrorMessage(response: Response, fallbackMessage = 'Une erreur est survenue.'): Promise<string> {
  try {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();

      if (typeof data === 'string' && data.trim()) {
        return data;
      }

      if (data && typeof data === 'object') {
        const candidates = [
          data.detail,
          data.message,
          data.error,
          data.description,
          data.title
        ];

        for (const candidate of candidates) {
          if (typeof candidate === 'string' && candidate.trim()) {
            return candidate;
          }
        }
      }
    } else {
      const text = await response.text();
      if (text.trim()) return text;
    }
  } catch {
    // Ignore parsing errors and return fallback below.
  }

  return fallbackMessage;
}

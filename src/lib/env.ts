
export function getGeminiApiKey(): string {
  // Try to get from Vite define/process first
  try {
    if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
    }
  } catch (e) {
    // ignore
  }

  // Fallback to import.meta.env for standard Vite behavior
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }

  // Last resort: some environments might have it globally defined
  if (typeof (globalThis as any).GEMINI_API_KEY === 'string') {
    return (globalThis as any).GEMINI_API_KEY;
  }

  return '';
}

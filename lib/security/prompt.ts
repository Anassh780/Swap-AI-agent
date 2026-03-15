const MAX_PROMPT_LENGTH = 400;

export function sanitizePrompt(rawPrompt: string) {
  return rawPrompt
    .replace(/[`<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_PROMPT_LENGTH);
}

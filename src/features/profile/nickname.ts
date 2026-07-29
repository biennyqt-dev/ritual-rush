export const MAX_NICKNAME_LENGTH = 18;
export const NICKNAME_HELPER_TEXT =
  "Letters, numbers, spaces, emojis, and symbols are allowed.";

export interface NicknameResult {
  ok: boolean;
  value: string;
  error?: string;
}

export function validateNickname(input: string): NicknameResult {
  const value = input
    .trim()
    .replace(/\s+/g, " ");

  if (!value) {
    return { ok: false, value: "", error: "Choose a nickname to continue." };
  }
  if (value.length > MAX_NICKNAME_LENGTH) {
    return {
      ok: false,
      value: value.slice(0, MAX_NICKNAME_LENGTH),
      error: `Keep it to ${MAX_NICKNAME_LENGTH} characters.`,
    };
  }
  if (/[\p{Cc}]/u.test(value)) {
    return {
      ok: false,
      value,
      error: "Remove invisible control characters and try again.",
    };
  }
  return { ok: true, value };
}

export function generateGuestNickname(random = Math.random): string {
  return `Guest-${Math.floor(1000 + random() * 9000)}`;
}

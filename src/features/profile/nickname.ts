export const NICKNAME_HELPER_TEXT =
  "Letters, numbers, spaces, emojis, and symbols are allowed.";

export interface NicknameResult {
  ok: boolean;
  value: string;
  error?: string;
}

export function validateNickname(input: string): NicknameResult {
  const value = input.trim();

  if (!value) {
    return { ok: false, value: "", error: "Choose a nickname to continue." };
  }
  if (/[\p{Cc}]/u.test(value)) {
    return {
      ok: false,
      value,
      error: "Remove invisible control characters and try again.",
    };
  }
  return { ok: true, value: value.replace(/ {2,}/g, " ") };
}

export function generateGuestNickname(random = Math.random): string {
  return `Guest-${Math.floor(1000 + random() * 9000)}`;
}

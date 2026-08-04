export interface ShareScoreInput {
  score: number;
  origin: string;
}

export function makeShareText({ score, origin }: ShareScoreInput): string {
  return [
    `I survived the Ritual network and scored ${Math.floor(score).toLocaleString("en-US")} in Ritual Dash.`,
    "",
    "Can you beat my score?",
    "",
    origin,
  ].join("\n");
}

export function makeXIntent(input: ShareScoreInput): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(makeShareText(input))}`;
}

export function shareOnX(score: number): boolean {
  if (typeof window === "undefined") return false;
  const url = makeXIntent({ score, origin: window.location.origin });
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (!popup) {
    window.location.assign(url);
    return false;
  }
  return true;
}

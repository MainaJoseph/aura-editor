const USER_COLORS = [
  "#E06C75", // red
  "#E5C07B", // yellow
  "#61AFEF", // blue
  "#98C379", // green
  "#C678DD", // purple
  "#56B6C2", // cyan
  "#D19A66", // orange
  "#BE5046", // dark red
  "#7EC8E3", // light blue
  "#B8BB26", // lime
  "#FB4934", // bright red
  "#83A598", // teal
  "#D3869B", // pink
  "#FABD2F", // gold
  "#8EC07C", // mint
  "#FE8019", // bright orange
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

export function getUserColor(userId: string): string {
  const index = hashString(userId) % USER_COLORS.length;
  return USER_COLORS[index];
}

export function getUserColorLight(userId: string): string {
  const color = getUserColor(userId);
  // Return with 25% opacity for selection highlights
  return color + "40"; // 40 hex = ~25% opacity
}

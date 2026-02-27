export interface Lock {
  id: string;
  appName: string;
  appIcon: string;
  timeRemaining: string;
  size: "small" | "large";
}

export const mockLocks: Lock[] = [
  // { id: "l1", appName: "Instagram", appIcon: "InstagramLogo", timeRemaining: "28:00", size: "small" },
  // { id: "l2", appName: "TikTok", appIcon: "TiktokLogo", timeRemaining: "2:33", size: "small" },
];

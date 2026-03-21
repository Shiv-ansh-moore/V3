export interface Lock {
  id: string;
  appName: string;
  appIcon: string;
  timeLimit: number;
  timeUsed: number;
}

export const mockLocks: Lock[] = [
  {
    id: "l1",
    appName: "Instagram",
    appIcon: "InstagramLogoIcon",
    timeLimit: 36,
    timeUsed: 8,
  },
  // {
  //   id: "l2",
  //   appName: "TikTok",
  //   appIcon: "TiktokLogoIcon",
  //   timeLimit: 13,
  //   timeUsed: 10.5,
  // },
];

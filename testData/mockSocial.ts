// ─── Types ────────────────────────────────────────────────

export interface SocialUser {
  id: string;
  name: string;
  hasNewContent: boolean;
  color: string;
}


export interface Reaction {
  userId: string;
  emoji: string;
}

export interface Reply {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
  reactions?: Reaction[];
}

export interface ChatMessage {
  kind: "message";
  id: string;
  userId: string;
  text: string;
  timestamp: string;
  reactions?: Reaction[];
  replies?: Reply[];
}

export interface ActivityEvent {
  kind: "activity";
  id: string;
  userId: string;
  type: "unlock" | "lock";
  app: string;
  duration: string;
  reason?: string;
  totalTime?: string;
  reactions?: Reaction[];
  replies?: Reply[];
}

export interface CompletedGoal {
  kind: "completed";
  id: string;
  userId: string;
  goalTitle: string;
  photoUri: string | null;
  timestamp: string;
  reactions?: Reaction[];
  replies?: Reply[];
}

export type FeedItem = ChatMessage | ActivityEvent | CompletedGoal;

// ─── Users ────────────────────────────────────────────────

export const socialUsers: SocialUser[] = [
  { id: "u6", name: "Jamal", hasNewContent: true, color: "#FF6B6B" },
  { id: "u1", name: "Kevin", hasNewContent: true, color: "#4ECDC4" },
  { id: "u2", name: "Ben", hasNewContent: true, color: "#A78BFA" },
  { id: "u3", name: "Sarah", hasNewContent: true, color: "#F778BA" },
  { id: "u4", name: "Sloggo", hasNewContent: false, color: "#FFCA28" },
  { id: "u5", name: "Pierce", hasNewContent: false, color: "#69F0AE" },
];


// ─── Feed ─────────────────────────────────────────────────

export const socialFeed: FeedItem[] = [
  // Kevin wakes up and immediately needs attention
  {
    kind: "message",
    id: "m1",
    userId: "u1",
    text: "Rise and grind kings 💪",
    timestamp: "08:12",
    reactions: [
      { userId: "u2", emoji: "💀" },
    ],
  },
  {
    kind: "message",
    id: "m2",
    userId: "u1",
    text: "Who's hitting the gym today",
    timestamp: "08:13",
  },

  // Ben responds
  {
    kind: "message",
    id: "m3",
    userId: "u2",
    text: "Bro it's 8am",
    timestamp: "08:20",
    reactions: [
      { userId: "u3", emoji: "😂" },
      { userId: "u5", emoji: "😂" },
    ],
  },

  // Kevin unlocks Instagram immediately
  {
    kind: "activity",
    id: "a1",
    userId: "u1",
    type: "unlock",
    app: "Instagram",
    duration: "15 mins",
    reason: "Checking DM's",
    reactions: [
      { userId: "u2", emoji: "👀" },
    ],
  },

  // Sarah calls it out
  {
    kind: "message",
    id: "m4",
    userId: "u3",
    text: "What DMs Kevin",
    timestamp: "08:25",
    replies: [
      {
        id: "r1",
        userId: "u1",
        text: "Business inquiries 😤",
        timestamp: "08:26",
        reactions: [
          { userId: "u3", emoji: "🤥" },
          { userId: "u2", emoji: "💀" },
        ],
      },
    ],
  },

  // Kevin locks Instagram
  {
    kind: "activity",
    id: "a2",
    userId: "u1",
    type: "lock",
    app: "Instagram",
    duration: "22 mins",
    totalTime: "22 mins total time",
    reactions: [
      { userId: "u3", emoji: "😬" },
    ],
  },

  // Kevin tries to save face
  {
    kind: "message",
    id: "m5",
    userId: "u1",
    text: "That didn't count I was replying to a story",
    timestamp: "08:50",
  },

  // Ben actually does something
  {
    kind: "completed",
    id: "c1",
    userId: "u2",
    goalTitle: "GYM",
    photoUri: null,
    timestamp: "09:30",
    reactions: [
      { userId: "u1", emoji: "🔥" },
      { userId: "u3", emoji: "💪" },
      { userId: "u5", emoji: "👏" },
    ],
    replies: [
      {
        id: "r2",
        userId: "u1",
        text: "Lets gooo I'm heading now too",
        timestamp: "09:32",
      },
      {
        id: "r3",
        userId: "u2",
        text: "Sure you are",
        timestamp: "09:33",
        reactions: [
          { userId: "u3", emoji: "😂" },
        ],
      },
    ],
  },

  // Sarah completes reading
  {
    kind: "completed",
    id: "c2",
    userId: "u3",
    goalTitle: "Read 30 mins",
    photoUri: null,
    timestamp: "10:00",
    reactions: [
      { userId: "u2", emoji: "📚" },
    ],
  },

  // Kevin unlocks TikTok
  {
    kind: "activity",
    id: "a3",
    userId: "u1",
    type: "unlock",
    app: "TikTok",
    duration: "10 mins",
    reason: "Need a recipe",
  },

  {
    kind: "activity",
    id: "a4",
    userId: "u1",
    type: "lock",
    app: "TikTok",
    duration: "45 mins",
    totalTime: "45 mins total time",
    reactions: [
      { userId: "u2", emoji: "💀" },
      { userId: "u3", emoji: "💀" },
      { userId: "u5", emoji: "🤡" },
    ],
    replies: [
      {
        id: "r4",
        userId: "u3",
        text: "A recipe 😭",
        timestamp: "11:50",
      },
      {
        id: "r5",
        userId: "u1",
        text: "I got distracted ok",
        timestamp: "11:52",
      },
    ],
  },

  // Ben drops wisdom
  {
    kind: "message",
    id: "m6",
    userId: "u2",
    text: "Kevin you've been on your phone more than off it today",
    timestamp: "12:00",
    reactions: [
      { userId: "u3", emoji: "📠" },
    ],
  },

  // Kevin with the cope
  {
    kind: "message",
    id: "m7",
    userId: "u1",
    text: "Tomorrow is my day I can feel it",
    timestamp: "12:05",
    reactions: [
      { userId: "u2", emoji: "🫡" },
      { userId: "u4", emoji: "😂" },
    ],
  },
];

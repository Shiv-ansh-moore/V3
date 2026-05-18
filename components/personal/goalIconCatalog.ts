import {
  AirplaneTakeoffIcon,
  BankIcon,
  BarbellIcon,
  BasketballIcon,
  BathtubIcon,
  BedIcon,
  BicycleIcon,
  BookOpenIcon,
  BooksIcon,
  BowlFoodIcon,
  BrainIcon,
  BriefcaseIcon,
  BroomIcon,
  CalendarCheckIcon,
  CameraIcon,
  CarIcon,
  ChartLineUpIcon,
  ChatCircleIcon,
  ClipboardTextIcon,
  CodeIcon,
  CoffeeIcon,
  CookingPotIcon,
  CreditCardIcon,
  DropIcon,
  FilmSlateIcon,
  FirstAidKitIcon,
  FlowerIcon,
  FlowerLotusIcon,
  ForkKnifeIcon,
  GameControllerIcon,
  GlobeIcon,
  GraduationCapIcon,
  GuitarIcon,
  HammerIcon,
  HeartbeatIcon,
  HeartIcon,
  HouseIcon,
  InstagramLogoIcon,
  LaptopIcon,
  LeafIcon,
  ListChecksIcon,
  MapPinIcon,
  MedalIcon,
  MicrophoneStageIcon,
  MoneyIcon,
  MoonIcon,
  MusicNoteIcon,
  NotebookIcon,
  OrangeIcon,
  OrangeSliceIcon,
  PaintBrushIcon,
  PaletteIcon,
  PenNibIcon,
  PencilSimpleIcon,
  PersonSimpleBikeIcon,
  PersonSimpleRunIcon,
  PersonSimpleSwimIcon,
  PersonSimpleWalkIcon,
  PiggyBankIcon,
  PillIcon,
  PianoKeysIcon,
  PlantIcon,
  PresentationChartIcon,
  PuzzlePieceIcon,
  ShoppingCartIcon,
  ShowerIcon,
  SneakerMoveIcon,
  SoccerBallIcon,
  SparkleIcon,
  StarIcon,
  SunIcon,
  TargetIcon,
  TennisBallIcon,
  TiktokLogoIcon,
  TrashIcon,
  TrophyIcon,
  UsersThreeIcon,
  WalletIcon,
  WashingMachineIcon,
  WrenchIcon,
} from "phosphor-react-native";
import type { Icon } from "phosphor-react-native";

export interface GoalIconCatalogEntry {
  name: string;
  label: string;
  aliases: readonly string[];
  Icon: Icon;
}

export const fallbackGoalIconName = "TargetIcon";

export const goalIconCatalog = [
  {
    name: "TargetIcon",
    label: "Goal",
    aliases: ["target", "objective", "aim", "goal", "habit", "task"],
    Icon: TargetIcon,
  },
  {
    name: "BarbellIcon",
    label: "Gym",
    aliases: ["barbell", "lift", "lifting", "weights", "workout", "fitness"],
    Icon: BarbellIcon,
  },
  {
    name: "PersonSimpleRunIcon",
    label: "Run",
    aliases: ["running", "runner", "jog", "jogging", "cardio"],
    Icon: PersonSimpleRunIcon,
  },
  {
    name: "SneakerMoveIcon",
    label: "Steps",
    aliases: ["sneakers", "steps", "walk", "walking", "shoes"],
    Icon: SneakerMoveIcon,
  },
  {
    name: "PersonSimpleWalkIcon",
    label: "Walk",
    aliases: ["walking", "stroll", "outside", "movement"],
    Icon: PersonSimpleWalkIcon,
  },
  {
    name: "BicycleIcon",
    label: "Cycling",
    aliases: ["bike", "bicycle", "cycling", "cycle"],
    Icon: BicycleIcon,
  },
  {
    name: "PersonSimpleBikeIcon",
    label: "Bike Ride",
    aliases: ["bike", "cycling", "ride", "commute"],
    Icon: PersonSimpleBikeIcon,
  },
  {
    name: "PersonSimpleSwimIcon",
    label: "Swim",
    aliases: ["swimming", "pool", "laps", "water"],
    Icon: PersonSimpleSwimIcon,
  },
  {
    name: "BasketballIcon",
    label: "Basketball",
    aliases: ["basketball", "sport", "sports", "hoops"],
    Icon: BasketballIcon,
  },
  {
    name: "SoccerBallIcon",
    label: "Football",
    aliases: ["soccer", "football", "sport", "sports"],
    Icon: SoccerBallIcon,
  },
  {
    name: "TennisBallIcon",
    label: "Tennis",
    aliases: ["tennis", "sport", "sports", "racket"],
    Icon: TennisBallIcon,
  },
  {
    name: "TrophyIcon",
    label: "Win",
    aliases: ["trophy", "win", "award", "competition", "achievement"],
    Icon: TrophyIcon,
  },
  {
    name: "MedalIcon",
    label: "Award",
    aliases: ["medal", "award", "prize", "achievement"],
    Icon: MedalIcon,
  },
  {
    name: "HeartbeatIcon",
    label: "Health",
    aliases: ["health", "heart", "heartbeat", "doctor", "medical"],
    Icon: HeartbeatIcon,
  },
  {
    name: "HeartIcon",
    label: "Care",
    aliases: ["heart", "love", "care", "relationship", "kindness"],
    Icon: HeartIcon,
  },
  {
    name: "BrainIcon",
    label: "Mind",
    aliases: ["brain", "mind", "mental", "focus", "therapy"],
    Icon: BrainIcon,
  },
  {
    name: "FlowerLotusIcon",
    label: "Meditate",
    aliases: ["meditate", "meditation", "yoga", "breathe", "mindfulness"],
    Icon: FlowerLotusIcon,
  },
  {
    name: "MoonIcon",
    label: "Sleep",
    aliases: ["sleep", "bedtime", "night", "rest"],
    Icon: MoonIcon,
  },
  {
    name: "BedIcon",
    label: "Bed",
    aliases: ["bed", "sleep", "nap", "rest"],
    Icon: BedIcon,
  },
  {
    name: "FirstAidKitIcon",
    label: "First Aid",
    aliases: ["first aid", "medicine", "medical", "doctor", "health"],
    Icon: FirstAidKitIcon,
  },
  {
    name: "PillIcon",
    label: "Medicine",
    aliases: ["pill", "medicine", "meds", "vitamins", "supplement"],
    Icon: PillIcon,
  },
  {
    name: "DropIcon",
    label: "Hydrate",
    aliases: ["water", "hydrate", "hydration", "drink"],
    Icon: DropIcon,
  },
  {
    name: "ShowerIcon",
    label: "Shower",
    aliases: ["shower", "cold shower", "wash", "rinse"],
    Icon: ShowerIcon,
  },
  {
    name: "BathtubIcon",
    label: "Bath",
    aliases: ["bath", "bathtub", "spa", "relax"],
    Icon: BathtubIcon,
  },
  {
    name: "SunIcon",
    label: "Sunlight",
    aliases: ["sun", "sunlight", "morning", "outside"],
    Icon: SunIcon,
  },
  {
    name: "LeafIcon",
    label: "Nature",
    aliases: ["leaf", "nature", "outside", "fresh air"],
    Icon: LeafIcon,
  },
  {
    name: "FlowerIcon",
    label: "Flower",
    aliases: ["flower", "garden", "plants", "nature"],
    Icon: FlowerIcon,
  },
  {
    name: "PlantIcon",
    label: "Plants",
    aliases: ["plant", "plants", "garden", "gardening"],
    Icon: PlantIcon,
  },
  {
    name: "BowlFoodIcon",
    label: "Meal",
    aliases: ["meal", "food", "eat", "dinner", "lunch", "breakfast"],
    Icon: BowlFoodIcon,
  },
  {
    name: "ForkKnifeIcon",
    label: "Eat",
    aliases: ["eat", "food", "restaurant", "meal", "dinner"],
    Icon: ForkKnifeIcon,
  },
  {
    name: "CookingPotIcon",
    label: "Cook",
    aliases: ["cook", "cooking", "meal prep", "recipe", "dinner"],
    Icon: CookingPotIcon,
  },
  {
    name: "CoffeeIcon",
    label: "Coffee",
    aliases: ["coffee", "cafe", "tea", "caffeine"],
    Icon: CoffeeIcon,
  },
  {
    name: "OrangeSliceIcon",
    label: "Fruit",
    aliases: ["fruit", "orange", "snack", "nutrition"],
    Icon: OrangeSliceIcon,
  },
  {
    name: "OrangeIcon",
    label: "Nutrition",
    aliases: ["nutrition", "fruit", "orange", "healthy food"],
    Icon: OrangeIcon,
  },
  {
    name: "BookOpenIcon",
    label: "Read",
    aliases: ["read", "reading", "book", "books", "study"],
    Icon: BookOpenIcon,
  },
  {
    name: "BooksIcon",
    label: "Books",
    aliases: ["books", "reading", "library", "study"],
    Icon: BooksIcon,
  },
  {
    name: "NotebookIcon",
    label: "Journal",
    aliases: ["journal", "notebook", "notes", "diary"],
    Icon: NotebookIcon,
  },
  {
    name: "GraduationCapIcon",
    label: "Study",
    aliases: ["study", "school", "course", "class", "learn", "exam"],
    Icon: GraduationCapIcon,
  },
  {
    name: "PencilSimpleIcon",
    label: "Write",
    aliases: ["write", "writing", "pencil", "notes", "homework"],
    Icon: PencilSimpleIcon,
  },
  {
    name: "PenNibIcon",
    label: "Create",
    aliases: ["create", "creative", "design", "draw", "writing"],
    Icon: PenNibIcon,
  },
  {
    name: "CodeIcon",
    label: "Code",
    aliases: ["code", "coding", "program", "programming", "app", "dev"],
    Icon: CodeIcon,
  },
  {
    name: "LaptopIcon",
    label: "Laptop",
    aliases: ["laptop", "computer", "work", "online"],
    Icon: LaptopIcon,
  },
  {
    name: "BriefcaseIcon",
    label: "Work",
    aliases: ["work", "job", "career", "business", "office"],
    Icon: BriefcaseIcon,
  },
  {
    name: "ChartLineUpIcon",
    label: "Progress",
    aliases: ["progress", "growth", "sales", "chart", "analytics"],
    Icon: ChartLineUpIcon,
  },
  {
    name: "PresentationChartIcon",
    label: "Presentation",
    aliases: ["presentation", "meeting", "pitch", "slides"],
    Icon: PresentationChartIcon,
  },
  {
    name: "CalendarCheckIcon",
    label: "Schedule",
    aliases: ["calendar", "schedule", "routine", "appointment", "plan"],
    Icon: CalendarCheckIcon,
  },
  {
    name: "ClipboardTextIcon",
    label: "Plan",
    aliases: ["plan", "checklist", "clipboard", "tasks", "todo"],
    Icon: ClipboardTextIcon,
  },
  {
    name: "ListChecksIcon",
    label: "Checklist",
    aliases: ["checklist", "tasks", "todo", "chores", "list"],
    Icon: ListChecksIcon,
  },
  {
    name: "StarIcon",
    label: "Star",
    aliases: ["star", "favorite", "best", "priority"],
    Icon: StarIcon,
  },
  {
    name: "SparkleIcon",
    label: "Sparkle",
    aliases: ["sparkle", "clean", "shine", "polish", "reset"],
    Icon: SparkleIcon,
  },
  {
    name: "PaletteIcon",
    label: "Art",
    aliases: ["art", "paint", "drawing", "creative", "design"],
    Icon: PaletteIcon,
  },
  {
    name: "PaintBrushIcon",
    label: "Paint",
    aliases: ["paint", "brush", "art", "creative", "draw"],
    Icon: PaintBrushIcon,
  },
  {
    name: "CameraIcon",
    label: "Photo",
    aliases: ["photo", "camera", "photography", "picture"],
    Icon: CameraIcon,
  },
  {
    name: "FilmSlateIcon",
    label: "Film",
    aliases: ["film", "movie", "cinema", "video", "watch"],
    Icon: FilmSlateIcon,
  },
  {
    name: "MusicNoteIcon",
    label: "Music",
    aliases: ["music", "song", "sing", "practice"],
    Icon: MusicNoteIcon,
  },
  {
    name: "MicrophoneStageIcon",
    label: "Voice",
    aliases: ["voice", "sing", "singing", "podcast", "speech"],
    Icon: MicrophoneStageIcon,
  },
  {
    name: "PianoKeysIcon",
    label: "Piano",
    aliases: ["piano", "keys", "music", "practice"],
    Icon: PianoKeysIcon,
  },
  {
    name: "GuitarIcon",
    label: "Guitar",
    aliases: ["guitar", "music", "practice", "instrument"],
    Icon: GuitarIcon,
  },
  {
    name: "GameControllerIcon",
    label: "Games",
    aliases: ["games", "gaming", "controller", "play"],
    Icon: GameControllerIcon,
  },
  {
    name: "PuzzlePieceIcon",
    label: "Puzzle",
    aliases: ["puzzle", "brain", "problem", "solve"],
    Icon: PuzzlePieceIcon,
  },
  {
    name: "HammerIcon",
    label: "Build",
    aliases: ["build", "fix", "repair", "make", "diy"],
    Icon: HammerIcon,
  },
  {
    name: "WrenchIcon",
    label: "Fix",
    aliases: ["fix", "repair", "maintenance", "tool"],
    Icon: WrenchIcon,
  },
  {
    name: "HouseIcon",
    label: "Home",
    aliases: ["home", "house", "room", "family"],
    Icon: HouseIcon,
  },
  {
    name: "BroomIcon",
    label: "Clean",
    aliases: ["clean", "cleaning", "tidy", "chores", "sweep"],
    Icon: BroomIcon,
  },
  {
    name: "WashingMachineIcon",
    label: "Laundry",
    aliases: ["laundry", "washing", "clothes", "wash"],
    Icon: WashingMachineIcon,
  },
  {
    name: "TrashIcon",
    label: "Declutter",
    aliases: ["trash", "declutter", "delete", "clear", "rubbish"],
    Icon: TrashIcon,
  },
  {
    name: "PiggyBankIcon",
    label: "Savings",
    aliases: ["money", "save", "saving", "savings", "budget", "cash"],
    Icon: PiggyBankIcon,
  },
  {
    name: "MoneyIcon",
    label: "Money",
    aliases: ["money", "cash", "income", "pay", "finance"],
    Icon: MoneyIcon,
  },
  {
    name: "WalletIcon",
    label: "Wallet",
    aliases: ["wallet", "spending", "budget", "cash"],
    Icon: WalletIcon,
  },
  {
    name: "BankIcon",
    label: "Bank",
    aliases: ["bank", "finance", "account", "savings"],
    Icon: BankIcon,
  },
  {
    name: "CreditCardIcon",
    label: "Card",
    aliases: ["card", "credit", "payment", "spend"],
    Icon: CreditCardIcon,
  },
  {
    name: "ShoppingCartIcon",
    label: "Shopping",
    aliases: ["shopping", "buy", "cart", "groceries", "errands"],
    Icon: ShoppingCartIcon,
  },
  {
    name: "AirplaneTakeoffIcon",
    label: "Travel",
    aliases: ["travel", "trip", "flight", "holiday", "vacation"],
    Icon: AirplaneTakeoffIcon,
  },
  {
    name: "CarIcon",
    label: "Drive",
    aliases: ["drive", "car", "commute", "road"],
    Icon: CarIcon,
  },
  {
    name: "MapPinIcon",
    label: "Place",
    aliases: ["place", "location", "map", "visit"],
    Icon: MapPinIcon,
  },
  {
    name: "GlobeIcon",
    label: "World",
    aliases: ["world", "global", "language", "travel"],
    Icon: GlobeIcon,
  },
  {
    name: "UsersThreeIcon",
    label: "Friends",
    aliases: ["friends", "family", "social", "people", "group"],
    Icon: UsersThreeIcon,
  },
  {
    name: "ChatCircleIcon",
    label: "Chat",
    aliases: ["chat", "message", "text", "call", "conversation"],
    Icon: ChatCircleIcon,
  },
  {
    name: "InstagramLogoIcon",
    label: "Instagram",
    aliases: ["instagram", "insta", "social media", "scroll"],
    Icon: InstagramLogoIcon,
  },
  {
    name: "TiktokLogoIcon",
    label: "TikTok",
    aliases: ["tiktok", "tik tok", "social media", "scrolling", "reels"],
    Icon: TiktokLogoIcon,
  },
] as const satisfies readonly GoalIconCatalogEntry[];

export const iconMap = Object.fromEntries(
  goalIconCatalog.map((entry) => [entry.name, entry.Icon]),
) as Record<string, Icon>;

export const goalIconTitleRules = [
  ["ShowerIcon", ["cold shower", "ice bath"]],
  ["TiktokLogoIcon", ["social media", "doomscroll", "scrolling", "reels"]],
  ["InstagramLogoIcon", ["instagram", "insta"]],
  ["TiktokLogoIcon", ["tiktok", "tik tok"]],
  ["BarbellIcon", ["gym", "lift", "lifting", "weights", "workout", "fitness"]],
  ["PersonSimpleRunIcon", ["run", "running", "jog", "jogging", "cardio"]],
  ["SneakerMoveIcon", ["steps", "step goal", "walk steps"]],
  ["PersonSimpleWalkIcon", ["walk", "walking", "stroll"]],
  ["PersonSimpleSwimIcon", ["swim", "swimming", "pool"]],
  ["PersonSimpleBikeIcon", ["bike ride", "cycling", "cycle"]],
  ["BicycleIcon", ["bike", "bicycle"]],
  ["BasketballIcon", ["basketball", "hoops"]],
  ["SoccerBallIcon", ["football", "soccer"]],
  ["TennisBallIcon", ["tennis"]],
  [
    "FlowerLotusIcon",
    ["meditate", "meditation", "yoga", "breathe", "mindfulness"],
  ],
  ["MoonIcon", ["sleep", "bedtime", "early night"]],
  ["BedIcon", ["bed", "nap", "rest"]],
  ["DropIcon", ["water", "hydrate", "hydration", "drink water"]],
  ["PillIcon", ["pill", "meds", "medicine", "vitamin", "supplement"]],
  ["FirstAidKitIcon", ["doctor", "medical", "health check"]],
  ["HeartbeatIcon", ["health", "heartbeat", "heart rate"]],
  ["BrainIcon", ["focus", "mind", "mental", "therapy"]],
  ["HeartIcon", ["relationship", "love", "care"]],
  ["BathtubIcon", ["bath", "spa"]],
  ["ShowerIcon", ["shower", "wash"]],
  ["SunIcon", ["sunlight", "sun", "morning light"]],
  ["PlantIcon", ["gardening", "plants", "plant"]],
  ["LeafIcon", ["nature", "fresh air", "outside"]],
  ["CookingPotIcon", ["meal prep", "cook", "cooking", "recipe"]],
  ["BowlFoodIcon", ["breakfast", "lunch", "dinner", "meal"]],
  ["ForkKnifeIcon", ["eat", "restaurant", "food"]],
  ["CoffeeIcon", ["coffee", "tea", "cafe"]],
  ["OrangeSliceIcon", ["fruit", "snack"]],
  ["OrangeIcon", ["nutrition", "healthy food"]],
  ["BookOpenIcon", ["read", "reading", "book"]],
  ["BooksIcon", ["books", "library"]],
  ["GraduationCapIcon", ["study", "learn", "course", "class", "exam", "school"]],
  ["NotebookIcon", ["journal", "diary", "notebook", "notes"]],
  ["PencilSimpleIcon", ["write", "writing", "homework"]],
  ["PenNibIcon", ["draw", "design", "creative"]],
  ["CodeIcon", ["app dev", "code", "coding", "programming", "dev"]],
  ["LaptopIcon", ["laptop", "computer", "online"]],
  ["PresentationChartIcon", ["presentation", "meeting", "pitch", "slides"]],
  ["ChartLineUpIcon", ["progress", "growth", "analytics"]],
  ["BriefcaseIcon", ["work", "job", "career", "office", "business"]],
  ["CalendarCheckIcon", ["calendar", "schedule", "routine", "appointment"]],
  ["ClipboardTextIcon", ["plan", "planning"]],
  ["ListChecksIcon", ["checklist", "todo", "tasks"]],
  ["SparkleIcon", ["deep clean", "reset", "polish"]],
  ["BroomIcon", ["clean", "cleaning", "tidy", "chores", "sweep"]],
  ["WashingMachineIcon", ["laundry", "washing clothes"]],
  ["TrashIcon", ["declutter", "trash", "clear out"]],
  ["HouseIcon", ["home", "house", "room"]],
  ["HammerIcon", ["build", "diy", "make"]],
  ["WrenchIcon", ["fix", "repair", "maintenance"]],
  ["PiggyBankIcon", ["save money", "money", "savings", "saving", "budget"]],
  ["MoneyIcon", ["cash", "income", "pay"]],
  ["WalletIcon", ["wallet", "spending"]],
  ["BankIcon", ["bank", "finance", "account"]],
  ["CreditCardIcon", ["credit card", "payment", "card"]],
  ["ShoppingCartIcon", ["shopping", "groceries", "errands", "buy"]],
  ["AirplaneTakeoffIcon", ["travel", "trip", "flight", "holiday", "vacation"]],
  ["CarIcon", ["drive", "car", "commute"]],
  ["MapPinIcon", ["place", "location", "visit"]],
  ["GlobeIcon", ["language", "world", "global"]],
  ["CameraIcon", ["photo", "photography", "picture", "camera"]],
  ["FilmSlateIcon", ["movie", "film", "video", "watch"]],
  ["GuitarIcon", ["guitar"]],
  ["PianoKeysIcon", ["piano", "keys"]],
  ["MicrophoneStageIcon", ["sing", "singing", "voice", "podcast", "speech"]],
  ["MusicNoteIcon", ["music", "song", "practice"]],
  ["PaletteIcon", ["art", "paint", "drawing"]],
  ["PaintBrushIcon", ["paint", "brush"]],
  ["GameControllerIcon", ["games", "gaming", "play"]],
  ["PuzzlePieceIcon", ["puzzle", "problem solve"]],
  ["TrophyIcon", ["win", "competition", "achievement"]],
  ["MedalIcon", ["award", "medal", "prize"]],
  ["UsersThreeIcon", ["friends", "family", "social", "people", "group"]],
  ["ChatCircleIcon", ["chat", "message", "text", "call", "conversation"]],
  ["StarIcon", ["priority", "favorite", "star"]],
] as const;

export function getGoalIconForTitle(title: string) {
  const normalizedTitle = normalizeGoalIconText(title);

  for (const [iconName, keywords] of goalIconTitleRules) {
    if (
      keywords.some((keyword) => titleMatchesKeyword(normalizedTitle, keyword))
    ) {
      return iconMap[iconName] ? iconName : fallbackGoalIconName;
    }
  }

  return fallbackGoalIconName;
}

export function goalIconMatchesSearch(
  entry: GoalIconCatalogEntry,
  search: string,
) {
  const normalizedSearch = normalizeGoalIconText(search);
  if (!normalizedSearch) return true;

  const searchText = normalizeGoalIconText(
    [entry.name, entry.label, ...entry.aliases].join(" "),
  );

  return searchText.includes(normalizedSearch);
}

function titleMatchesKeyword(normalizedTitle: string, keyword: string) {
  const normalizedKeyword = normalizeGoalIconText(keyword);
  if (!normalizedKeyword) return false;

  if (normalizedKeyword.includes(" ")) {
    return normalizedTitle.includes(normalizedKeyword);
  }

  return new RegExp(`\\b${escapeRegExp(normalizedKeyword)}\\b`).test(
    normalizedTitle,
  );
}

function normalizeGoalIconText(value: string) {
  return value
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

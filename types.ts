
export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  avatar: string;
  isAdmin: boolean;
  isBanned: boolean;
  isVip: boolean;
  vipUntil?: string; // ISO string timestamp
  bio?: string;
  profileBackground?: string; 
  libraryGameIds: string[];
  favoriteGameIds: string[];
  friendIds: string[];
  ownedItemIds: string[]; // IDs dos itens comprados na loja
  balance: number;
  xp: number;
  steamId?: string;
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  banner: string;
  startDate: string;
  endDate: string;
  rewardXp: number;
  rewardBalance: number;
  isActive: boolean;
  status: 'ACTIVE' | 'UPCOMING' | 'FINISHED';
}

export interface RewardRoomSettings {
  rewardAmount: number;
  adDuration: number;
  adTitle: string;
  adDescription: string;
  isActive: boolean;
  videoUrl?: string;
  showAds?: boolean; // Nova flag para anúncios
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  participants: string[]; // [senderId, receiverId]
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'ADMIN_ADD' | 'REWARD' | 'PURCHASE';
  description: string;
  timestamp: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  participants: string[]; // [senderId, receiverId]
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: string;
}

export interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  ownerUserId: string;
  imageUrl?: string;
  createdAt: string;
  status: 'active' | 'deleted';
}

export interface CommunityMember {
  groupId: string;
  userId: string;
  role: 'member' | 'admin';
  isBanned: boolean;
  bannedAt?: string;
  bannedBy?: string;
}

export interface CommunityPost {
  id: string;
  groupId: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GeneralNotification {
  id: string;
  title: string;
  message: string;
  link?: string;
  imageUrl?: string;
  createdAt: string;
  createdByAdminId: string;
}

export interface GeneralNotificationRead {
  notificationId: string;
  userId: string;
  readAt: string;
}

export interface StoreItem {
  id: string;
  name: string;
  type: 'WALLPAPER' | 'AVATAR' | 'BOOSTER';
  price: number;
  rarity: 'COMUM' | 'RARO' | 'ÉPICO' | 'LENDÁRIO';
  image: string; // URL da imagem ou vídeo (para animados)
  isActive: boolean;
}

export interface SystemSettings {
  isCatalogEnabled: boolean;
  isLibraryEnabled: boolean;
  isStoreEnabled: boolean;
  isLivesEnabled: boolean;
  isFavoritesEnabled: boolean;
  isEventsEnabled: boolean;
  isExtrasEnabled: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  borderRadius?: string;
  fontFamily?: string;
  customFonts?: { name: string; url: string }[];
}

export interface ProfileWallpaper {
  id: string;
  title: string;
  url: string;
  category: string;
  thumbnail: string;
}

export interface LevelConfig {
  id: string;
  name: string;
  minXp: number;
  createdAt: string;
  updatedAt?: string;
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface Viewport {
  width: number;
  height: number;
}

export enum AchievementStatus {
  LOCKED = 'LOCKED',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_ANALYSIS = 'IN_ANALYSIS',
  COMPLETED = 'COMPLETED',
}

export type Difficulty = 'Fácil' | 'Médio' | 'Difícil' | 'Extremo';

export interface Achievement {
  id: string;
  gameId: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  isHidden: boolean;
  difficulty: Difficulty;
  steamApiName?: string;
  globalUnlockPercent?: number;
  platform?: 'steam' | 'xbox' | 'psn' | 'epic';
  updatedAt?: string;
}

export interface UserAchievementProgress {
  achievementId: string;
  status: AchievementStatus;
  currentValue?: number;
  targetValue?: number;
  notes?: string;
  proofUrl?: string;
  validatedMethod?: 'manual' | 'visual_steam';
  validatedAt?: string;
}

export interface Feedback {
  id: string;
  achievementId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  comment: string;
  timestamp: string;
}

export interface PendingValidation {
  id: string;
  userId: string;
  userName: string;
  gameId: string;
  achievementId: string;
  achievementName: string;
  proofUrl: string;
  timestamp: string;
  confidence: string;
}

export interface ValidationLog {
  id: string;
  userId: string;
  gameId: string;
  achievementId: string;
  achievementName: string;
  status: 'APPROVED' | 'REJECTED' | 'SUBMITTED';
  timestamp: string;
  adminNote?: string;
}

export interface UserGoal {
  id: string;
  userId: string;
  description: string;
  isCompleted: boolean;
  createdAt: string;
}

export type ContentType = 'video' | 'image' | 'text' | 'tip' | 'list' | 'alert' | 'button' | 'interactive-image' | 'interactive-map';

export interface MapHotspot {
  id: string;
  x: number; // 0-1 relative to image width
  y: number; // 0-1 relative to image height
  name: string;
  label?: string; // Alias for name
  action: 'open_page' | 'create_page';
  targetPageId?: string;
  icon?: string;
  iconType?: 'lucide' | 'image';
  size?: number;
}

export interface ButtonConfig {
  id: string;
  text: string;
  icon?: string;
  iconType?: 'lucide' | 'image';
  action: 'create_page' | 'open_page';
  targetPageId?: string;
  size: 'S' | 'M' | 'L';
  bgColor: string;
  textColor: string;
  fontStyle: 'normal' | 'bold' | 'uppercase';
  alignment: 'left' | 'center' | 'right';
  width: 'auto' | '100%';
  noBackground?: boolean;
  iconSize?: number;
}

export interface Hotspot {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  name: string;
  label?: string; // Alias for name
  action: 'open_page' | 'create_page';
  targetPageId?: string;
  iconType?: 'lucide' | 'image';
  icon?: string;
  size?: number;
}

export interface SubPage {
  id: string;
  gameId: string;
  title: string;
  category?: string;
  order: number;
  parentContentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Content {
  id: string;
  gameId: string;
  achievementId?: string;
  subPageId?: string; // Se este bloco pertence a uma sub-página
  category: string;
  title: string;
  type: ContentType;
  content: string;
  synopsis?: string;
  author: string;
  order: number;
  width?: '25%' | '33%' | '50%' | '66%' | '75%' | '100%';
  alignment?: 'left' | 'right' | 'center' | 'top' | 'bottom';
  updatedAt?: string;
  buttons?: ButtonConfig[];
  hotspots?: Hotspot[];
  mapHotspots?: MapHotspot[];
  zoom?: number; // Para imagem interativa
  mapBaseUrl?: string;
  mapMaxZoom?: number;
  mapFilters?: { key: string; label: string }[];
  mapWidth?: number;
  mapHeight?: number;
}

export interface Game {
  id: string;
  title: string;
  publisher: string;
  coverUrl: string;
  bannerUrl: string;
  totalAchievements: number;
  isActive: boolean;
  steamAppId?: string;
  coverPosition?: string;
  bannerPosition?: string;
  platform?: 'steam' | 'xbox' | 'psn' | 'epic';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  onClick?: () => void;
}

export interface GameContextType {
  games: Game[];
  achievements: Achievement[];
  contents: Content[];
  subPages: SubPage[];
  users: User[];
  wallpapers: ProfileWallpaper[];
  storeItems: StoreItem[];
  events: GameEvent[];
  currentUser: User | null;
  onlineUsers: string[];
  userProgress: Record<string, UserAchievementProgress>;
  pendingValidations: PendingValidation[];
  validationLogs: ValidationLog[];
  userGoals: UserGoal[];
  feedbacks: Feedback[];
  rewardSettings: RewardRoomSettings;
  systemSettings: SystemSettings;
  messages: Message[];
  unreadCounts: Record<string, number>; // receiverId -> count
  friendRequests: FriendRequest[];
  communityGroups: CommunityGroup[];
  communityPosts: CommunityPost[];
  myCommunityMemberships: CommunityMember[];
  generalNotifications: GeneralNotification[];
  myReadNotifications: string[]; // IDs of read notifications
  isAuthReady: boolean;
  
  // Device Detection
  deviceType: DeviceType;
  isTouch: boolean;
  viewport: Viewport;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;

  // Levels
  levels: LevelConfig[];
  addLevel: (level: Omit<LevelConfig, 'id' | 'createdAt'>) => Promise<void>;
  updateLevel: (level: LevelConfig) => Promise<void>;
  deleteLevel: (levelId: string) => Promise<void>;

  login: (email: string, password: string) => void;
  loginWithOAuth: (userData: User | null, oauthData: { email?: string, name?: string, avatar?: string, steamId?: string }) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userId: string, data: Partial<User>) => void;
  addBalance: (amount: number, description?: string, type?: Transaction['type']) => void;
  adminAddBalance: (userId: string, amount: number) => void;
  updateRewardSettings: (settings: Partial<RewardRoomSettings>) => void;
  updateSystemSettings: (settings: Partial<SystemSettings>) => void;
  
  sendMessage: (receiverId: string, text: string) => void;
  markMessagesAsRead: (senderId: string) => void;
  
  updateProgress: (achievementId: string, status: AchievementStatus, proofUrl?: string, method?: 'manual' | 'visual_steam') => void;
  syncSteamAchievements: (steamId: string, gameId: string) => Promise<any[]>;
  importAchievementsFromSteam: (gameId: string) => Promise<void>;
  syncSteamLibrary: () => Promise<void>;
  getSteamAuthUrl: () => Promise<{ url: string }>;
  submitForAnalysis: (gameId: string, achievementId: string, proofUrl: string, confidence: string) => void;
  validateWithImage: (gameId: string, imageBase64: string, mimeType: string) => Promise<any[]>;
  addUserGoal: (description: string) => void;
  toggleUserGoal: (goalId: string) => void;
  deleteUserGoal: (goalId: string) => void;
  addFeedback: (achievementId: string, comment: string) => void;
  deleteFeedback: (feedbackId: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info', onClick?: () => void) => void;
  
  approveValidation: (validationId: string) => void;
  rejectValidation: (validationId: string) => void;

  addGame: (game: Game) => void;
  updateGame: (game: Game) => void;
  deleteGame: (gameId: string) => void;
  
  addAchievement: (achievement: Achievement) => void;
  updateAchievement: (achievement: Achievement) => void;
  deleteAchievement: (achievementId: string) => void;
  
  addContent: (content: Content) => void;
  updateContent: (content: Content) => void;
  deleteContent: (contentId: string) => void;

  addSubPage: (subPage: SubPage) => Promise<void>;
  updateSubPage: (subPage: SubPage) => Promise<void>;
  deleteSubPage: (subPageId: string) => Promise<void>;

  addWallpaper: (wp: ProfileWallpaper) => void;
  deleteWallpaper: (id: string) => void;

  addStoreItem: (item: StoreItem) => void;
  updateStoreItem: (item: StoreItem) => void;
  deleteStoreItem: (itemId: string) => void;

  addEvent: (event: GameEvent) => void;
  updateEvent: (event: GameEvent) => void;
  deleteEvent: (eventId: string) => void;

  toggleBanUser: (userId: string) => void;
  toggleAdminUser: (userId: string) => void;
  toggleVipUser: (userId: string, months?: number) => void; 
  toggleFriend: (friendId: string) => void;
  sendFriendRequest: (receiverId: string) => void;
  respondToFriendRequest: (requestId: string, status: 'accepted' | 'rejected') => void;
  
  // Communities
  createCommunityGroup: (name: string, description: string, imageUrl?: string) => Promise<void>;
  joinCommunityGroup: (groupId: string) => Promise<void>;
  leaveCommunityGroup: (groupId: string) => Promise<void>;
  banUserFromGroup: (groupId: string, userId: string) => Promise<void>;
  unbanUserFromGroup: (groupId: string, userId: string) => Promise<void>;
  deleteCommunityGroup: (groupId: string) => Promise<void>;
  createCommunityPost: (groupId: string, title: string, content: string) => Promise<void>;
  getCommunityMembers: (groupId: string) => Promise<CommunityMember[]>;
  
  // General Notifications
  createGeneralNotification: (title: string, message: string, link?: string, imageUrl?: string) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;

  // Auth
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  completeRegistration: (nickname: string) => Promise<void>;
  pendingUser: { uid: string; email: string | null; photoURL: string | null; displayName: string | null } | null;
  
  toggleLibrary: (gameId: string) => void;
  toggleFavorite: (gameId: string) => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
}

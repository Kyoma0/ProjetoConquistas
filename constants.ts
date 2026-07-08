
import { Game, Achievement, Content, UserAchievementProgress, User, ProfileWallpaper, LevelConfig } from './types';

export const ADMIN_EMAIL = "ga.albergoni@gmail.com";

// O sistema inicia sem usuários. O primeiro a se cadastrar com o ADMIN_EMAIL ganha poderes de Admin.
export const INITIAL_USERS: User[] = [];

export const AVAILABLE_ICONS = [
  'Globe', 'Trophy', 'Video', 'ImageIcon', 'BookOpen', 'Lightbulb', 'PlayCircle', 'Camera', 'Target', 'Info', 'MessageSquare', 'Zap', 'RefreshCw', 'Layers', 'ShieldCheck', 'Heart', 'Star', 'Gamepad2', 'Sword', 'Map', 'Compass', 'Flag', 'Key', 'Lock', 'Unlock', 'Settings', 'User', 'Users', 'Home', 'Search', 'Bell', 'Mail', 'Calendar', 'Clock', 'CheckCircle2', 'AlertTriangle', 'AlertCircle', 'HelpCircle', 'ExternalLink', 'Plus', 'Minus', 'X', 'ChevronRight', 'ChevronLeft', 'ArrowRight', 'ArrowLeft', 'Download', 'Upload', 'Share2', 'Trash2', 'Edit3', 'Save'
];

export const INITIAL_WALLPAPERS: ProfileWallpaper[] = [
  {
    id: 'wp_001',
    title: 'Cidade Neon 2077',
    url: 'https://cdn.pixabay.com/video/2023/10/24/186358-877960714_tiny.mp4',
    category: 'Cyberpunk',
    thumbnail: 'https://images.unsplash.com/photo-1605142859862-978be7eba909?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'wp_002',
    title: 'Nebulosa Infinita',
    url: 'https://cdn.pixabay.com/video/2021/07/28/83134-582531980_tiny.mp4',
    category: 'Espaço',
    thumbnail: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'wp_003',
    title: 'Floresta de Névoa',
    url: 'https://cdn.pixabay.com/video/2024/05/13/211756-943003273_tiny.mp4',
    category: 'Natureza',
    thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071&auto=format&fit=crop'
  },
  {
    id: 'wp_004',
    title: 'Ondas Sintéticas',
    url: 'https://cdn.pixabay.com/video/2023/11/05/187933-881515286_tiny.mp4',
    category: 'Retrowave',
    thumbnail: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'wp_005',
    title: 'Chuva no Templo',
    url: 'https://cdn.pixabay.com/video/2024/02/19/201089-914368940_tiny.mp4',
    category: 'Zen',
    thumbnail: 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'wp_006',
    title: 'Matriz Digital',
    url: 'https://cdn.pixabay.com/video/2023/04/10/158313-816434471_tiny.mp4',
    category: 'Hacker',
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'wp_007',
    title: 'Abstrato Fluido',
    url: 'https://cdn.pixabay.com/video/2020/09/23/50868-463878198_tiny.mp4',
    category: 'Arte',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop'
  },
  {
    id: 'wp_008',
    title: 'Fogo Eterno',
    url: 'https://cdn.pixabay.com/video/2020/06/15/42079-431102434_tiny.mp4',
    category: 'Épico',
    thumbnail: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=2070&auto=format&fit=crop'
  }
];

export const getLevelInfo = (xp: number, levels: LevelConfig[] = []) => {
  if (levels && levels.length > 0) {
    const sortedLevels = [...levels].sort((a, b) => b.minXp - a.minXp);
    const currentLevel = sortedLevels.find(l => xp >= l.minXp) || sortedLevels[sortedLevels.length - 1];
    const levelIndex = [...levels].sort((a, b) => a.minXp - b.minXp).findIndex(l => l.id === currentLevel.id) + 1;
    
    return { 
      level: levelIndex, 
      title: currentLevel.name, 
      color: 'text-steam-highlight' 
    };
  }

  if (xp >= 1500) return { level: 5, title: 'Lenda Viva', color: 'text-purple-400' };
  if (xp >= 700) return { level: 4, title: 'Mestre das Conquistas', color: 'text-red-400' };
  if (xp >= 300) return { level: 3, title: 'Explorador Determinado', color: 'text-orange-400' };
  if (xp >= 100) return { level: 2, title: 'Jovem Padawan', color: 'text-green-400' };
  return { level: 1, title: 'Caçador de Conquistas', color: 'text-steam-highlight' };
};

export const INITIAL_ACHIEVEMENTS: Achievement[] = [];
export const INITIAL_GAMES: Game[] = [];
export const INITIAL_CONTENTS: Content[] = [];
export const MOCK_PROGRESS: Record<string, UserAchievementProgress> = {};

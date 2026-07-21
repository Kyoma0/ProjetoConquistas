
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import ErrorBoundary from './src/components/ErrorBoundary';
import { AppProvider, useApp, useDevice } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { GameDetail } from './components/GameDetail';
import { AdminPanel } from './components/AdminPanel';
import { Profile } from './components/Profile';
import { Lives } from './components/Lives';
import { FriendsView } from './components/FriendsView';
import { ChatView } from './components/ChatView';
import { StoreView } from './components/StoreView';
import { AdsView } from './components/AdsView';
import { EventsView } from './components/EventsView';
import { CommunitiesView } from './components/CommunitiesView';
import { Trophy, ArrowRight, CheckCircle2, AlertCircle, Info, Medal, Crown, TrendingUp, Users as UsersIcon, Star, Ghost, Clock, UserPlus, LogIn, Lock, Mail, User, Calendar, X, Database, Shield, Check, Gamepad2 } from 'lucide-react';
import { AchievementStatus, UserAchievementProgress } from './types';
import { getLevelInfo } from './constants';

const GameGrid = ({ title, games, onSelectGame }: { title: string, games: any[], onSelectGame: (id: string) => void }) => {
    return (
        <div className="p-8 md:p-12 animate-fade-in">
            <header className="mb-12">
                <h1 className="text-4xl font-black text-white mb-2 tracking-tighter italic">{title}</h1>
                <p className="text-gray-400 font-medium">Coleção com {games.length} título(s).</p>
            </header>

            {games.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {games.map(game => (
                        <div key={game.id} onClick={() => onSelectGame(game.id)} className="cursor-pointer group relative">
                            <div className="relative overflow-hidden rounded-xl shadow-2xl aspect-[2/3] border border-transparent group-hover:border-steam-highlight/50 transition-all">
                                <img 
                                  src={game.coverUrl || undefined} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                  style={{ objectPosition: game.coverPosition || 'center' }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-10 transition-opacity flex items-end p-4">
                                    <span className="text-[10px] font-black text-steam-highlight uppercase tracking-[0.2em]">Ver Central</span>
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="text-[11px] font-black text-white truncate group-hover:text-steam-highlight transition-colors uppercase tracking-tight">{game.title}</div>
                                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{game.publisher}</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-40 flex flex-col items-center justify-center text-center opacity-20">
                    <Ghost className="w-20 h-20 mb-6" />
                    <p className="text-sm font-black uppercase tracking-[0.4em]">Biblioteca Vazia</p>
                    <p className="text-xs mt-2">Nenhum jogo encontrado nesta categoria.</p>
                </div>
            )}
        </div>
    );
}

const AppContent: React.FC = () => {
  const { 
    games, currentUser, login, loginWithOAuth, register, logout, users, achievements, 
    userProgress, validationLogs, generalNotifications, myReadNotifications, 
    markNotificationAsRead, forgotPassword, resetPassword, completeRegistration,
    pendingUser, levels, systemSettings,
    showToast, isAuthReady
  } = useApp();
  const { isMobile } = useDevice();
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [chatWithUserId, setChatWithUserId] = useState<string | null>(null);
  const [view, setView] = useState<'home' | 'game' | 'admin' | 'profile' | 'library' | 'favorites' | 'lives' | 'friends' | 'chat' | 'store' | 'ads' | 'events' | 'communities' | 'catalog'>('home');
  
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');

  // Injetar estilos dinâmicos (cores e fontes)
  useEffect(() => {
    const root = document.documentElement;
    if (systemSettings.primaryColor) root.style.setProperty('--steam-highlight', systemSettings.primaryColor);
    if (systemSettings.secondaryColor) root.style.setProperty('--steam-dark', systemSettings.secondaryColor);
    if (systemSettings.accentColor) root.style.setProperty('--steam-green', systemSettings.accentColor);
    if (systemSettings.borderRadius) root.style.setProperty('--steam-radius', systemSettings.borderRadius);
    if (systemSettings.fontFamily) root.style.setProperty('--font-sans', systemSettings.fontFamily);

    // Injetar fontes customizadas
    const styleId = 'custom-fonts-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    if (systemSettings.customFonts && systemSettings.customFonts.length > 0) {
      const fontFaces = systemSettings.customFonts.map(font => `
        @font-face {
          font-family: '${font.name}';
          src: url('${font.url}') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
      `).join('\n');
      styleElement.textContent = fontFaces;
    } else {
      styleElement.textContent = '';
    }
  }, [systemSettings]);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [resetToken, setResetToken] = useState('');

  const unreadNotifications = useMemo(() => {
    return generalNotifications.filter(n => !myReadNotifications.includes(n.id));
  }, [generalNotifications, myReadNotifications]);

  const [activeNotification, setActiveNotification] = useState<any>(null);

  useEffect(() => {
    const handleOpenChatEvent = (e: any) => {
      const { userId } = e.detail;
      setChatWithUserId(userId);
      setView('chat');
    };
    window.addEventListener('open-chat', handleOpenChatEvent);
    return () => window.removeEventListener('open-chat', handleOpenChatEvent);
  }, []);

  useEffect(() => {
    if (unreadNotifications.length > 0 && !activeNotification) {
      setActiveNotification(unreadNotifications[0]);
    }
  }, [unreadNotifications, activeNotification]);

  const handleCloseNotification = async () => {
    if (activeNotification) {
      await markNotificationAsRead(activeNotification.id);
      setActiveNotification(null);
    }
  };

  const selectedGame = games.find(g => g.id === selectedGameId);

  const libraryGames = useMemo(() => {
    return games.filter(g => currentUser?.libraryGameIds.includes(g.id));
  }, [games, currentUser?.libraryGameIds]);

  const favoriteGames = useMemo(() => {
    return games.filter(g => currentUser?.favoriteGameIds.includes(g.id));
  }, [games, currentUser?.favoriteGameIds]);

  const activeGames = useMemo(() => {
    return games.filter(g => g.isActive);
  }, [games]);

  const globalStats = useMemo(() => {
    const totalAch = achievements.length;
    const completedByMe = totalAch > 0 ? (Object.values(userProgress) as UserAchievementProgress[])
        .filter(p => p.status === AchievementStatus.COMPLETED && achievements.some(a => a.id === p.achievementId)).length : 0;
    const completionRate = totalAch > 0 ? Math.round((completedByMe / totalAch) * 100) : 0;
    const platGamesCount = games.filter(game => {
        const gameAchs = achievements.filter(a => a.gameId === game.id);
        if (gameAchs.length === 0) return false;
        return gameAchs.every(a => (userProgress[a.id] as UserAchievementProgress)?.status === AchievementStatus.COMPLETED);
    }).length;
    return {
        totalAch,
        completionRate,
        platGames: platGamesCount,
        activeUsers: users.filter(u => !u.isBanned).length 
    };
  }, [achievements, userProgress, games, users]);

  const recentActivity = useMemo(() => {
    return (validationLogs || [])
        .filter(log => log.status === 'APPROVED')
        .slice(0, 3)
        .map(log => {
            const game = games.find(g => g.id === log.gameId);
            return { ...log, gameTitle: game?.title || 'Jogo Desconhecido' };
        });
  }, [validationLogs, games]);

  const leaderboardData = useMemo(() => {
    return users
      .filter(u => !u.isBanned)
      .map(user => {
        const isMe = user.id === currentUser?.id;
        const realXP = isMe 
            ? achievements
                .filter(a => (userProgress[a.id] as UserAchievementProgress)?.status === AchievementStatus.COMPLETED)
                .reduce((acc, curr) => acc + curr.xp, 0)
            : (validationLogs || [])
                .filter(log => log.userId === user.id && log.status === 'APPROVED')
                .reduce((acc, curr) => {
                    const ach = achievements.find(a => a.id === curr.achievementId);
                    return acc + (ach?.xp || 0);
                }, 0);
        const levelInfo = getLevelInfo(realXP, levels);
        return {
            ...user,
            totalXP: realXP,
            levelInfo,
            unlockedCount: isMe 
                ? (Object.values(userProgress) as UserAchievementProgress[]).filter(p => p.status === AchievementStatus.COMPLETED && achievements.some(a => a.id === p.achievementId)).length 
                : (validationLogs || []).filter(log => log.userId === user.id && log.status === 'APPROVED').length
        };
      })
      .sort((a, b) => b.totalXP - a.totalXP);
  }, [users, achievements, userProgress, currentUser, validationLogs]);

  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthLoading) return;

    const email = emailInput.trim();
    const name = nameInput.trim();
    const password = passwordInput;

    if (authMode === 'register' && password !== confirmPasswordInput) {
        showToast("As senhas não coincidem.", "error");
        setIsAuthLoading(false);
        return;
    }

    setIsAuthLoading(true);
    try {
        if (authMode === 'login') {
            await login(email, password);
        } else if (authMode === 'register') {
            await register(email, name, password);
        } else if (authMode === 'forgot') {
            await forgotPassword(email);
            setAuthMode('login');
        } else if (authMode === 'reset') {
            await resetPassword(resetToken, password);
            setAuthMode('login');
        }
    } finally {
        setIsAuthLoading(false);
    }
  };

  const navigateToProfile = (userId?: string) => {
    setSelectedUserId(userId || currentUser?.id || null);
    setView('profile');
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'STEAM_AUTH_SUCCESS') {
        loginWithOAuth(event.data.user, { steamId: event.data.steamId });
      }
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        loginWithOAuth(event.data.user, { 
          email: event.data.email, 
          name: event.data.name, 
          avatar: event.data.avatar 
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loginWithOAuth]);

  const handleOAuthLogin = async (provider: 'steam' | 'google') => {
    if (provider === 'google') {
      await loginWithOAuth(null, {});
      return;
    }
    try {
      const endpoint = '/api/auth/steam/url';
      const response = await fetch(endpoint);
      const { url } = await response.json();
      window.open(url, `steam_auth`, 'width=600,height=700');
    } catch (err) {
      showToast(`Erro ao iniciar login via ${provider}`, "error");
    }
  };

  const handleOpenChat = (userId: string) => {
    setChatWithUserId(userId);
    setView('chat');
  };

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 450) {
        setSidebarWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-steam-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-steam-highlight"></div>
      </div>
    );
  }

  if (!currentUser) {
    if (pendingUser) {
        return (
            <div className="min-h-screen bg-[#0b0e14] flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-y-auto font-sans">
                {/* Background Elements */}
                <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(102,192,244,0.08),transparent_70%)] pointer-events-none"></div>
                <div className="fixed top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none"></div>
                
                <div className="w-full max-w-[460px] relative z-10 py-8">
                    <div className="bg-[#1b2838]/40 backdrop-blur-2xl p-1 rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border border-white/5 animate-scale-in">
                        <div className="bg-[#1b2838]/60 p-8 sm:p-10 rounded-[36px] border border-white/5">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-black text-white uppercase italic mb-2">Quase lá!</h2>
                                <p className="text-gray-400 text-sm">Escolha um nickname para sua jornada.</p>
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); setIsAuthLoading(true); completeRegistration(nameInput).finally(() => setIsAuthLoading(false)); }} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] uppercase font-black text-gray-500 ml-1 tracking-widest">Seu Nickname</label>
                                    <div className="relative group">
                                        <input 
                                            type="text" 
                                            required 
                                            placeholder="Ex: HunterMaster" 
                                            value={nameInput} 
                                            onChange={(e) => setNameInput(e.target.value)} 
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 text-white focus:border-steam-highlight focus:ring-1 focus:ring-steam-highlight/50 focus:outline-none transition-all font-bold placeholder:text-gray-700" 
                                        />
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-steam-highlight transition-colors" />
                                    </div>
                                </div>
                                <button 
                                    disabled={isAuthLoading}
                                    className={`w-full bg-gradient-to-r from-steam-highlight to-blue-600 hover:from-blue-500 hover:to-blue-400 text-steam-dark font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 transform active:scale-95 text-xs group ${isAuthLoading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1'}`}
                                >
                                    {isAuthLoading ? (
                                        <div className="w-4 h-4 border-2 border-steam-dark border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <><Check className="w-4 h-4" /> Concluir Cadastro</>
                                    )}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => logout()}
                                    className="w-full py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors"
                                >
                                    Cancelar e Sair
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
      <div className="min-h-screen bg-[#0b0e14] flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-y-auto font-sans">
        {/* Background Elements - More subtle and atmospheric */}
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(102,192,244,0.08),transparent_70%)] pointer-events-none"></div>
        <div className="fixed top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none"></div>
        
        {/* Animated Orbs */}
        <div className="fixed -top-48 -left-48 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
        <div className="fixed -bottom-48 -right-48 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

        <div className="w-full max-w-[460px] relative z-10 py-8">
          {/* Logo Section - More refined */}
          <div className="text-center mb-10 animate-fade-in">
            <div className="relative inline-block group">
              <div className="absolute inset-0 bg-steam-highlight/20 blur-2xl rounded-full group-hover:bg-steam-highlight/40 transition-all duration-500"></div>
              <div className="relative inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#1b2838] to-[#0b0e14] border border-white/10 rounded-[2rem] shadow-2xl mb-6 transform hover:scale-105 transition-all duration-500">
                <Trophy className="w-12 h-12 text-steam-highlight" />
              </div>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic mb-2 drop-shadow-lg">
              Master <span className="text-steam-highlight">Achievement</span>
            </h1>
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/20"></div>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em]">Hunter Hub</p>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/20"></div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity duration-300">
              <Database className="w-3 h-3 text-orange-500" />
              <span className="text-[9px] font-bold text-white uppercase tracking-widest">Powered by Firebase</span>
            </div>
          </div>

          <div className="bg-[#1b2838]/40 backdrop-blur-2xl p-1 rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border border-white/5 animate-scale-in">
            <div className="bg-[#1b2838]/60 p-8 sm:p-10 rounded-[36px] border border-white/5">
              {/* Auth Mode Switcher - Custom Pill Design */}
              <div className="flex bg-black/40 p-1.5 rounded-2xl mb-10 border border-white/5 relative">
                <div 
                  className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-steam-highlight rounded-xl transition-all duration-500 ease-out shadow-lg shadow-steam-highlight/20 ${authMode === 'register' ? 'left-[calc(50%+3px)]' : 'left-1.5'}`}
                ></div>
                <button 
                    onClick={() => setAuthMode('login')}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3.5 text-[11px] font-black uppercase tracking-widest transition-colors duration-300 ${authMode === 'login' || authMode === 'forgot' || authMode === 'reset' ? 'text-steam-dark' : 'text-gray-500 hover:text-white'}`}
                >
                    <LogIn className="w-4 h-4" /> Entrar
                </button>
                <button 
                    onClick={() => setAuthMode('register')}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3.5 text-[11px] font-black uppercase tracking-widest transition-colors duration-300 ${authMode === 'register' ? 'text-steam-dark' : 'text-gray-500 hover:text-white'}`}
                >
                    <UserPlus className="w-4 h-4" /> Cadastro
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-6">
                {authMode === 'register' && (
                    <div className="animate-fade-in space-y-2">
                        <label className="block text-[10px] uppercase font-black text-gray-500 ml-1 tracking-widest">Nome do Caçador</label>
                        <div className="relative group">
                            <input type="text" required placeholder="Ex: Nathan Drake" value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 text-white focus:border-steam-highlight focus:ring-1 focus:ring-steam-highlight/50 focus:outline-none transition-all font-bold placeholder:text-gray-700" />
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-steam-highlight transition-colors" />
                        </div>
                    </div>
                )}

                {authMode === 'reset' && (
                    <div className="animate-fade-in space-y-2">
                        <label className="block text-[10px] uppercase font-black text-gray-500 ml-1 tracking-widest">Token de Recuperação</label>
                        <div className="relative group">
                            <input type="text" required placeholder="Cole o token aqui..." value={resetToken} onChange={(e) => setResetToken(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 text-white focus:border-steam-highlight focus:ring-1 focus:ring-steam-highlight/50 focus:outline-none transition-all font-bold placeholder:text-gray-700" />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-steam-highlight transition-colors" />
                        </div>
                    </div>
                )}

                {(authMode === 'login' || authMode === 'register' || authMode === 'forgot') && (
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase font-black text-gray-500 ml-1 tracking-widest">E-mail de Sincronia</label>
                    <div className="relative group">
                      <input type="email" required placeholder="seu@email.com" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 text-white focus:border-steam-highlight focus:ring-1 focus:ring-steam-highlight/50 focus:outline-none transition-all font-bold placeholder:text-gray-700" />
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-steam-highlight transition-colors" />
                    </div>
                  </div>
                )}

                {(authMode === 'login' || authMode === 'register' || authMode === 'reset') && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="block text-[10px] uppercase font-black text-gray-500 tracking-widest">
                        {authMode === 'reset' ? 'Nova Senha' : 'Senha'}
                      </label>
                      {authMode === 'login' && (
                        <button type="button" onClick={() => setAuthMode('forgot')} className="text-[9px] font-black text-steam-highlight uppercase tracking-widest hover:text-white transition-colors">Esqueci a senha</button>
                      )}
                    </div>
                    <div className="relative group">
                      <input 
                        type="password" 
                        required 
                        minLength={authMode === 'register' || authMode === 'reset' ? 8 : undefined}
                        placeholder="••••••••" 
                        value={passwordInput} 
                        onChange={(e) => setPasswordInput(e.target.value)} 
                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 text-white focus:border-steam-highlight focus:ring-1 focus:ring-steam-highlight/50 focus:outline-none transition-all font-bold placeholder:text-gray-700" 
                      />
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-steam-highlight transition-colors" />
                    </div>
                  </div>
                )}

                {authMode === 'register' && (
                  <div className="animate-fade-in space-y-2">
                    <label className="block text-[10px] uppercase font-black text-gray-500 ml-1 tracking-widest">Confirmar Senha</label>
                    <div className="relative group">
                      <input 
                        type="password" 
                        required 
                        minLength={8}
                        placeholder="••••••••" 
                        value={confirmPasswordInput} 
                        onChange={(e) => setConfirmPasswordInput(e.target.value)} 
                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 text-white focus:border-steam-highlight focus:ring-1 focus:ring-steam-highlight/50 focus:outline-none transition-all font-bold placeholder:text-gray-700" 
                      />
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-steam-highlight transition-colors" />
                    </div>
                  </div>
                )}
                
                <button 
                  disabled={isAuthLoading}
                  className={`w-full bg-gradient-to-r from-steam-highlight to-blue-600 hover:from-blue-500 hover:to-blue-400 text-steam-dark font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 transform active:scale-95 text-xs group ${isAuthLoading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1'}`}
                >
                    {isAuthLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-steam-dark/30 border-t-steam-dark rounded-full animate-spin"></div>
                        <span>Processando...</span>
                      </div>
                    ) : (
                      <>
                        {authMode === 'login' ? 'Entrar Agora' : authMode === 'register' ? 'Criar Minha Conta' : authMode === 'forgot' ? 'Recuperar Acesso' : 'Salvar Nova Senha'}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                </button>

                {(authMode === 'login' || authMode === 'register') && (
                  <div className="space-y-6 pt-4">
                    <div className="relative flex items-center">
                      <div className="flex-grow border-t border-white/5"></div>
                      <span className="flex-shrink mx-4 text-[9px] text-gray-600 font-black uppercase tracking-widest">Ou continue com</span>
                      <div className="flex-grow border-t border-white/5"></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        type="button"
                        onClick={() => handleOAuthLogin('google')}
                        className="flex items-center justify-center gap-3 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 active:scale-[0.98] group"
                      >
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Google
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => handleOAuthLogin('steam')}
                        className="flex items-center justify-center gap-3 py-4 bg-[#171a21] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#2a475e] transition-all border border-white/5 active:scale-[0.98] group"
                      >
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 1.25.19 2.45.54 3.58l5.25 2.16c.3-.1.6-.16.92-.16.2 0 .39.03.58.07l2.42-3.49c0-.02 0-.04-.01-.06 0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5c-.02 0-.04 0-.06-.01l-3.49 2.42c.04.19.07.38.07.58 0 1.66-1.34 3-3 3-.32 0-.62-.06-.92-.16l-5.25 2.16C2.45 23.81 3.65 24 4.9 24c6.627 0 12-5.373 12-12s-5.373-12-12-12zm-6.5 18.5c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm1.5-1.5c0 .828-.672 1.5-1.5 1.5s-1.5-.672-1.5-1.5.672-1.5 1.5-1.5 1.5.672 1.5 1.5z"/>
                        </svg>
                        Steam
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Footer Info - More prominent Firebase integration */}
          <div className="mt-10 text-center space-y-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4 bg-black/30 px-5 py-2.5 rounded-full border border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Servidores Online</span>
                </div>
                <div className="w-px h-3 bg-white/10"></div>
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Firebase Real-time</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <Shield className="w-3 h-3" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Conexão Segura SSL/TLS</span>
              </div>
            </div>
            
            <p className="text-[9px] text-gray-700 font-bold uppercase tracking-[0.3em]">© 2026 Master Achievement Hub • v2.6.0</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-[100dvh] overflow-hidden bg-steam-dark text-steam-accent ${isMobile ? 'flex-col' : ''}`}>
      <style>{`
        :root {
          --steam-highlight: ${systemSettings.primaryColor || '#66c0f4'};
          --steam-base: ${systemSettings.secondaryColor || '#1b2838'};
          --steam-accent: ${systemSettings.accentColor || '#c7d5e0'};
          --border-radius-custom: ${systemSettings.borderRadius || '12px'};
          --font-family-custom: ${systemSettings.fontFamily || 'Inter'}, sans-serif;
        }
        body {
          font-family: var(--font-family-custom) !important;
          background-color: var(--steam-dark) !important;
        }
        .rounded-2xl, .rounded-3xl, .rounded-xl, .rounded-lg {
          border-radius: var(--border-radius-custom) !important;
        }
      `}</style>
      {!isMobile && (
        <div className="relative flex shrink-0" style={{ width: sidebarWidth }}>
          <Sidebar 
            onSelectGame={(id) => { setSelectedGameId(id); setView('game'); }} 
            selectedGameId={selectedGameId} 
            onNavigateHome={() => setView('home')} 
            onNavigateCatalog={() => setView('catalog')}
            onNavigateAdmin={() => setView('admin')} 
            onNavigateLibrary={() => setView('library')}
            onNavigateFavorites={() => setView('favorites')}
            onNavigateLives={() => setView('lives')}
            onNavigateFriends={() => setView('friends')}
            onNavigateStore={() => setView('store')}
            onNavigateEvents={() => setView('events')}
            onNavigateCommunities={() => setView('communities')}
          />
          <div 
            onMouseDown={startResizing}
            className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-steam-highlight/50 transition-colors z-[60] ${isResizing ? 'bg-steam-highlight' : 'bg-transparent'}`}
          />
        </div>
      )}
      <main className="flex-1 h-full flex flex-col relative overflow-hidden bg-steam-base">
        <Header 
          onNavigateProfile={() => navigateToProfile()} 
          onSelectGame={(id) => { setSelectedGameId(id); setView('game'); }}
        />
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={view + (selectedGameId || '') + (selectedUserId || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="min-h-full"
            >
              {view === 'home' && (
              <div className="p-8 md:p-12 min-h-full bg-gradient-to-br from-steam-base to-steam-dark">
                <div className="max-w-7xl mx-auto">
                    <header className="mb-12">
                        <h1 className="text-5xl font-black text-white mb-2 tracking-tighter italic">Catálogo de Desafios</h1>
                        <p className="text-lg text-gray-400 font-medium italic opacity-60">Visualizando dados originais do servidor local.</p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <div className="bg-steam-dark p-6 rounded-xl border border-transparent hover:border-steam-highlight/20 transition-all group">
                            <div className="flex justify-between items-start mb-4"><Trophy className="text-steam-highlight w-6 h-6" /></div>
                            <div className="text-4xl font-black text-white mb-1">{globalStats.totalAch}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Conquistas no Banco</div>
                        </div>
                        <div className="bg-steam-dark p-6 rounded-xl border border-transparent hover:border-purple-500/20 transition-all group">
                            <div className="flex justify-between items-start mb-4"><TrendingUp className="text-purple-400 w-6 h-6" /></div>
                            <div className="text-4xl font-black text-white mb-1">{globalStats.completionRate}%</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Sua Taxa de Conclusão</div>
                        </div>
                        <div className="bg-steam-dark p-6 rounded-lg border border-transparent hover:border-green-500/20 transition-all group">
                            <div className="flex justify-between items-start mb-4"><CheckCircle2 className="text-steam-green w-6 h-6" /></div>
                            <div className="text-4xl font-black text-white mb-1">{globalStats.platGames}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Jogos 100% Completos</div>
                        </div>
                        <div className="bg-steam-dark p-6 rounded-xl border border-transparent hover:border-red-500/20 transition-all group">
                            <div className="flex justify-between items-start mb-4"><UsersIcon className="text-red-400 w-6 h-6" /></div>
                            <div className="text-4xl font-black text-white mb-1">{globalStats.activeUsers}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Membros</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2 space-y-8">
                            <section>
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tight"><Medal className="text-yellow-500" /> Ranking Global</h2>
                                    <button onClick={() => navigateToProfile()} className="text-[10px] font-black text-steam-highlight uppercase tracking-widest hover:underline">Ver seu Perfil</button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    {leaderboardData.slice(0, 3).map((player, idx) => (
                                        <div 
                                          key={player.id} 
                                          onClick={() => navigateToProfile(player.id)}
                                          className={`relative p-6 rounded-2xl border flex flex-col items-center text-center transition-all hover:-translate-y-2 cursor-pointer group
                                            ${idx === 0 ? 'bg-gradient-to-b from-yellow-500/10 to-steam-dark border-yellow-500/30' : 
                                              idx === 1 ? 'bg-gradient-to-b from-gray-400/10 to-steam-dark border-gray-400/30' : 
                                              'bg-gradient-to-b from-orange-600/10 to-steam-dark border-orange-600/30'}
                                        `}>
                                            <div className="absolute top-4 left-4 font-black text-2xl italic opacity-20 group-hover:opacity-40 transition-opacity">#{idx + 1}</div>
                                            <img src={player.avatar || undefined} className="w-20 h-20 rounded-xl mb-4 border-2 border-transparent object-cover group-hover:border-steam-highlight transition-colors" alt={player.name} />
                                            <div className="font-black text-white text-lg truncate w-full mb-1 group-hover:text-steam-highlight transition-colors">{player.name}</div>
                                            <div className={`text-[10px] font-bold uppercase mb-4 ${player.levelInfo.color}`}>{player.levelInfo.title}</div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {view === 'game' && selectedGame && <GameDetail game={selectedGame} onNavigateProfile={navigateToProfile} />}
            {view === 'admin' && <AdminPanel onViewUserProfile={navigateToProfile} />}
            {view === 'profile' && <Profile userId={selectedUserId || currentUser.id} />}
            {view === 'library' && <GameGrid title="Sua Biblioteca" games={libraryGames} onSelectGame={(id) => { setSelectedGameId(id); setView('game'); }} />}
            {view === 'favorites' && <GameGrid title="Favoritos" games={favoriteGames} onSelectGame={(id) => { setSelectedGameId(id); setView('game'); }} />}
            {view === 'catalog' && <GameGrid title="Catálogo Global" games={activeGames} onSelectGame={(id) => { setSelectedGameId(id); setView('game'); }} />}
            {view === 'lives' && <Lives />}
            {view === 'friends' && <FriendsView onNavigateProfile={navigateToProfile} onOpenChat={handleOpenChat} />}
            {view === 'chat' && chatWithUserId && <ChatView userId={chatWithUserId} onBack={() => setView('friends')} />}
            {view === 'store' && <StoreView onNavigateAds={() => setView('ads')} />}
            {view === 'events' && <EventsView />}
            {view === 'communities' && <CommunitiesView />}
            {view === 'ads' && <AdsView onBack={() => setView('store')} />}
          </motion.div>
        </AnimatePresence>
        </div>
        <Toaster position="bottom-right" theme="dark" richColors offset={24} style={{ right: '24px', bottom: '24px' }} />

        {activeNotification && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#1b2838] p-10 rounded-[40px] border border-transparent shadow-5xl max-w-lg w-full relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-steam-highlight"></div>
              <button onClick={handleCloseNotification} className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-steam-highlight/20 rounded-2xl flex items-center justify-center text-steam-highlight">
                  <Info className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight italic">Notificação Geral</h3>
              </div>

              {activeNotification.imageUrl && (
                <img src={activeNotification.imageUrl || undefined} className="w-full h-48 object-cover rounded-2xl mb-6 border border-transparent" alt="Notification" />
              )}

              <h4 className="text-xl font-black text-white mb-4">{activeNotification.title}</h4>
              <p className="text-gray-400 leading-relaxed mb-8">{activeNotification.message}</p>

              {activeNotification.link && (
                <a 
                  href={activeNotification.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full py-4 bg-steam-highlight text-steam-dark font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  Saber Mais <ArrowRight className="w-4 h-4" />
                </a>
              )}
              
              <button onClick={handleCloseNotification} className="w-full mt-4 py-4 bg-white/5 text-gray-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/10 transition-all">
                Fechar
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};


const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;

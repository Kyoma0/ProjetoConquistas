
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { chunkedUpload } from '../services/uploadService';
import { Edit2, Save, Trophy, Calendar, CheckCircle2, Gamepad2, TrendingUp, History, ListTodo, Plus, Trash2, Clock, AlertTriangle, CheckCircle, Home, Star, Medal, Camera, MessageSquare, Image as ImageIcon, Shield, Play, X, Sparkles, Filter, Send, PlusCircle, Upload, Link as LinkIcon, Loader2, Video as VideoIcon, Gem, Lock, UserPlus, UserMinus, ShoppingBag, Target, Quote, Globe, RefreshCw } from 'lucide-react';
import { AchievementStatus, UserAchievementProgress, ValidationLog, User, ProfileWallpaper } from '../types';
import { getLevelInfo } from '../constants';

interface ProfileProps {
  userId?: string;
}

export const Profile: React.FC<ProfileProps> = ({ userId }) => {
    const { currentUser, users, userProgress, achievements, games, updateUser, validationLogs, userGoals, addUserGoal, toggleUserGoal, deleteUserGoal, feedbacks, deleteFeedback, showToast, wallpapers, addWallpaper, deleteWallpaper, toggleFriend, storeItems, showConfirm, getSteamAuthUrl, syncSteamLibrary } = useApp();
    const [isEditing, setIsEditing] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isLinkingSteam, setIsLinkingSteam] = useState(false);
    const [isSyncingLibrary, setIsSyncingLibrary] = useState(false);
    const [isAddWpOpen, setIsAddWpOpen] = useState(false);
    const [isUploadingWp, setIsUploadingWp] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [videoError, setVideoError] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    
    const targetUser = useMemo(() => {
        if (!userId) return currentUser;
        return users.find(u => u.id === userId) || currentUser;
    }, [userId, users, currentUser]);

    const isOwnProfile = targetUser?.id === currentUser?.id;
    const isAlreadyFriend = currentUser?.friendIds?.includes(targetUser?.id || '');
    
    // VERIFICAÇÃO DE PERMISSÃO PARA WALLPAPERS
    const hasWallpaperPermission = currentUser?.isAdmin || currentUser?.isVip;

    const [editData, setEditData] = useState({ 
        avatar: targetUser?.avatar || '', 
        bio: targetUser?.bio || '',
        profileBackground: targetUser?.profileBackground || ''
    });

    const [newWpData, setNewWpData] = useState<Partial<ProfileWallpaper>>({
        title: '',
        url: '',
        category: 'Cyberpunk',
        thumbnail: ''
    });

    const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'history' | 'goals' | 'feedbacks'>('overview');
    const [newGoalText, setNewGoalText] = useState('');
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const wpFileInputRef = useRef<HTMLInputElement>(null);

    const handleSyncLibrary = async () => {
        setIsSyncingLibrary(true);
        await syncSteamLibrary();
        setIsSyncingLibrary(false);
    };

    useEffect(() => {
        if (targetUser) {
            setEditData({ 
                avatar: targetUser.avatar || '', 
                bio: targetUser.bio || '',
                profileBackground: targetUser.profileBackground || ''
            });
            setIsEditing(false);
            setVideoError(false);
        }
    }, [targetUser]);

    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === 'STEAM_AUTH_SUCCESS') {
                const sid = event.data.steamId;
                if (currentUser && sid) {
                    updateUser(currentUser.id, { steamId: sid });
                    showToast("Conta Steam vinculada com sucesso!", "success");
                }
                setIsLinkingSteam(false);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [currentUser, updateUser]);

    if (!targetUser) return null;

    const handleLinkSteam = async () => {
        try {
            setIsLinkingSteam(true);
            const { url } = await getSteamAuthUrl();
            
            const width = 600;
            const height = 700;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            
            const authWindow = window.open(
                url,
                'steam_auth_popup',
                `width=${width},height=${height},left=${left},top=${top}`
            );

            if (!authWindow) {
                showToast("O popup foi bloqueado pelo navegador. Por favor, permita popups.", "error");
                setIsLinkingSteam(false);
                return;
            }

            const checkPopup = setInterval(() => {
                if (authWindow.closed) {
                    clearInterval(checkPopup);
                    setIsLinkingSteam(false);
                }
            }, 1000);
        } catch (err) {
            showToast("Falha ao iniciar autenticação Steam.", "error");
            setIsLinkingSteam(false);
        }
    };

    const handleSave = () => {
        if (!currentUser) return;

        // Safety check: prevent sending massive base64 strings to the API
        if (editData.avatar && editData.avatar.length > 1024 * 1024 * 2 && editData.avatar.startsWith('data:')) {
            showToast("Erro: Avatar muito grande. Use um arquivo menor ou aguarde o Turbo Upload.", "error");
            return;
        }

        updateUser(currentUser.id, editData);
        setIsEditing(false);
        showToast("Perfil atualizado!", "success");
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 900 * 1024 * 1024) { // 900MB limit for avatar
                showToast("Avatar muito grande! O limite é 900MB.", "error");
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                setUploadProgress(0);
                try {
                    const url = await chunkedUpload(file, (p) => setUploadProgress(p));
                    setEditData(prev => ({ ...prev, avatar: url }));
                    showToast("Avatar carregado via Turbo Upload!", "success");
                } catch (err) {
                    showToast("Erro no upload do avatar.", "error");
                } finally {
                    setUploadProgress(null);
                }
            } else {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setEditData(prev => ({ ...prev, avatar: reader.result as string }));
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleWpFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 900 * 1024 * 1024) { // 900MB Limit
                showToast("Arquivo muito grande! O limite é 900MB.", "error");
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                setIsUploadingWp(true);
                setUploadProgress(0);
                try {
                    const url = await chunkedUpload(file, (p) => setUploadProgress(p));
                    setNewWpData(prev => ({ ...prev, url: url }));
                    showToast("Wallpaper carregado via Turbo Upload!", "success");
                } catch (err) {
                    showToast("Erro no upload do wallpaper.", "error");
                } finally {
                    setIsUploadingWp(false);
                    setUploadProgress(null);
                }
            } else {
                setIsUploadingWp(true);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setNewWpData(prev => ({ ...prev, url: reader.result as string }));
                    setIsUploadingWp(false);
                    showToast("Arquivo carregado com sucesso!", "success");
                };
                reader.onerror = () => {
                    setIsUploadingWp(false);
                    showToast("Erro ao ler arquivo.", "error");
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const selectWallpaper = (url: string) => {
        if (!hasWallpaperPermission) {
            showToast("Acesso negado. Apenas Admins ou VIPs podem alterar o fundo.", "error");
            return;
        }
        setEditData(prev => ({ ...prev, profileBackground: url }));
        setVideoError(false);
        setIsGalleryOpen(false);
        showToast("Fundo ativado!", "info");
    };

    const handleAddWallpaperSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWpData.title || !newWpData.url) {
            showToast("Preencha o título e selecione um arquivo ou URL!", "error");
            return;
        }

        // Safety check: prevent sending massive base64 strings to the API
        if (newWpData.url && newWpData.url.length > 1024 * 1024 * 2 && newWpData.url.startsWith('data:')) {
            showToast("Erro: Wallpaper muito grande. Use um arquivo menor ou aguarde o Turbo Upload.", "error");
            return;
        }

        const wp: ProfileWallpaper = {
            id: `wp_${Date.now()}`,
            title: newWpData.title!,
            url: newWpData.url!,
            category: newWpData.category || 'Outros',
            thumbnail: newWpData.thumbnail || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop'
        };
        addWallpaper(wp);
        setIsAddWpOpen(false);
        setNewWpData({ title: '', url: '', category: 'Cyberpunk', thumbnail: '' });
    };

    const handleAddGoal = (e: React.FormEvent) => {
        e.preventDefault();
        if(newGoalText.trim()){
            addUserGoal(newGoalText);
            setNewGoalText('');
        }
    };

    const unlockedAchievements = achievements.filter(a => {
        if (isOwnProfile) {
            return (userProgress[a.id] as UserAchievementProgress)?.status === AchievementStatus.COMPLETED;
        } else {
            return validationLogs.some(log => log.userId === targetUser.id && log.achievementId === a.id && log.status === 'APPROVED');
        }
    }).sort((a, b) => b.xp - a.xp);

    const unlockedCount = unlockedAchievements.length;
    const totalAchievementsCount = achievements.length;
    const totalXP = unlockedAchievements.reduce((acc, curr) => acc + curr.xp, 0);
    const levelInfo = getLevelInfo(totalXP);
    const currentLevelXP = totalXP % 100;

    const globalPercentage = totalAchievementsCount > 0 
        ? Math.round((unlockedCount / totalAchievementsCount) * 100) 
        : 0;
    
    const timelineEvents = validationLogs
        .filter(log => log.userId === targetUser.id && log.status === 'APPROVED')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

    const userGameStats = games.map(game => {
        const gameAchs = achievements.filter(a => a.gameId === game.id);
        const userGameUnlocked = gameAchs.filter(a => {
            if (isOwnProfile) {
                return (userProgress[a.id] as UserAchievementProgress)?.status === AchievementStatus.COMPLETED;
            } else {
                return validationLogs.some(log => log.userId === targetUser.id && log.achievementId === a.id && log.status === 'APPROVED');
            }
        }).length;
        const progress = gameAchs.length > 0 ? Math.round((userGameUnlocked / gameAchs.length) * 100) : 0;
        return { game, total: gameAchs.length, unlocked: userGameUnlocked, progress };
    }).filter(stat => stat.total > 0).sort((a, b) => b.progress - a.progress); 

    const bestOngoingGame = userGameStats.find(g => g.progress < 100 && g.progress > 0);
    const userFeedbacks = feedbacks.filter(f => f.userId === targetUser.id);

    const isVideoBackground = (url: string) => {
        if (!url || typeof url !== 'string') return false;
        const lowercaseUrl = url.toLowerCase();
        return lowercaseUrl.includes('.mp4') || 
               lowercaseUrl.includes('.webm') || 
               lowercaseUrl.startsWith('data:video/mp4') || 
               lowercaseUrl.startsWith('data:video/webm') || 
               lowercaseUrl.includes('tiny.mp4');
    };

    const renderBackground = (url: string) => {
        const fallbackGradient = <div className="w-full h-full bg-gradient-to-br from-steam-dark via-steam-light to-blue-900/30"></div>;
        if (!url || typeof url !== 'string') return fallbackGradient;
        
        if (isVideoBackground(url) && !videoError) {
            return (
                <video 
                    key={`bg-${url}`} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    preload="auto"
                    onError={() => setVideoError(true)}
                    className="w-full h-full object-cover"
                    src={url || undefined}
                    onCanPlay={e => {
                        const playPromise = e.currentTarget.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(() => {});
                        }
                    }}
                />
            );
        }
        
        return <img key={`img-${url}`} src={url || undefined} onError={() => setVideoError(true)} className="w-full h-full object-cover transition-all" alt="Background" />;
    };

    const renderOverview = () => (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-steam-dark to-steam-light/10 p-6 rounded-2xl border border-white/5 relative overflow-hidden group shadow-2xl">
                     <div className="absolute right-[-10%] top-[-10%] p-4 opacity-5 group-hover:opacity-10 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-12"><Trophy className="w-24 h-24 text-steam-highlight" /></div>
                     <div className="text-4xl font-black text-white mb-1 group-hover:text-steam-highlight transition-colors">{unlockedCount}</div>
                     <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Conquistas Coletadas</div>
                </div>
                <div className="bg-gradient-to-br from-steam-dark to-steam-light/10 p-6 rounded-2xl border border-white/5 shadow-2xl group">
                     <div className="text-4xl font-black text-steam-highlight mb-1 group-hover:scale-110 transition-transform origin-left">{globalPercentage}%</div>
                     <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Conclusão Real</div>
                </div>
                <div className="bg-gradient-to-br from-steam-dark to-steam-light/10 p-6 rounded-2xl border border-white/5 shadow-2xl group">
                     <div className="text-4xl font-black text-blue-300 mb-1 group-hover:text-blue-400 transition-colors">{totalXP}</div>
                     <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Pontos de Caça</div>
                </div>
                <div className="bg-gradient-to-br from-steam-dark to-steam-light/10 p-6 rounded-2xl border border-white/5 flex flex-col justify-center shadow-2xl">
                    <div className="text-[10px] text-gray-400 mb-2 uppercase tracking-widest font-black flex justify-between">
                        <span>Nível {levelInfo.level}</span>
                        <span className="text-steam-highlight">{currentLevelXP}/100</span>
                    </div>
                    <div className="w-full bg-black/50 h-2.5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                         <div className={`bg-gradient-to-r from-steam-highlight via-blue-500 to-purple-500 h-full animate-pulse-slow`} style={{ width: `${currentLevelXP}%`}}></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-steam-dark/80 backdrop-blur-sm p-8 rounded-[32px] border border-white/5 shadow-4xl">
                    <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3 border-b border-white/5 pb-5 uppercase tracking-widest">
                        <History className="text-steam-highlight w-5 h-5" /> Linha do Tempo
                    </h3>
                    <div className="space-y-6">
                        {timelineEvents.map((log) => (
                            <div key={log.id} className="flex justify-between items-center bg-white/[0.03] p-5 rounded-2xl border border-white/5 hover:border-steam-highlight/20 hover:bg-white/[0.07] transition-all group/item">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-steam-highlight/10 flex items-center justify-center border border-steam-highlight/20 group-hover/item:scale-110 transition-transform">
                                        <Trophy className="w-5 h-5 text-steam-highlight" />
                                    </div>
                                    <div>
                                        <div className="font-black text-white uppercase text-sm group-hover/item:text-steam-highlight transition-colors">{log.achievementName}</div>
                                        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{new Date(log.timestamp).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] font-black text-steam-highlight/40 uppercase tracking-widest group-hover/item:text-steam-highlight transition-colors">Confirmado</div>
                            </div>
                        ))}
                        {timelineEvents.length === 0 && (
                            <div className="py-24 text-center">
                                <History className="w-12 h-12 text-white/5 mx-auto mb-4" />
                                <div className="opacity-20 uppercase font-black text-[10px] tracking-widest">Nenhuma atividade registrada</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    {bestOngoingGame ? (
                        <div className="bg-gradient-to-br from-steam-dark to-steam-light/5 p-8 rounded-[32px] border border-white/5 shadow-4xl group/ongoing">
                            <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-8">Foco Atual</h3>
                            <div className="flex gap-6 items-center mb-8">
                                <div className="relative">
                                    <img src={bestOngoingGame.game.coverUrl || undefined} className="w-16 h-24 object-cover rounded-xl shadow-2xl border border-white/10 group-hover/ongoing:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"></div>
                                </div>
                                <div className="flex-1">
                                    <div className="font-black text-white text-base uppercase leading-tight mb-2 group-hover/ongoing:text-steam-highlight transition-colors">{bestOngoingGame.game.title}</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-steam-highlight font-black text-3xl">{bestOngoingGame.progress}</span>
                                        <span className="text-steam-highlight/50 font-black text-sm">%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full bg-black/50 h-3 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                <div className="bg-gradient-to-r from-steam-highlight to-blue-400 h-full shadow-[0_0_10px_rgba(102,192,244,0.3)]" style={{ width: `${bestOngoingGame.progress}%` }}></div>
                            </div>
                        </div>
                    ) : (
                         <div className="bg-steam-dark/40 p-12 rounded-[32px] border border-white/5 text-center opacity-30 backdrop-blur-sm">
                             <Gamepad2 className="w-12 h-12 mx-auto mb-6 text-white/20" />
                             <p className="text-[10px] font-black uppercase tracking-[0.3em]">Foco indefinido</p>
                         </div>
                    )}

                    {/* Destaque de Conquista Rara */}
                    {unlockedAchievements.length > 0 && (
                        <div className="bg-gradient-to-br from-steam-dark to-steam-light/20 p-6 rounded-lg border border-steam-highlight/30 relative overflow-hidden group/featured">
                            <div className="absolute -right-4 -top-4 opacity-10 group-hover/featured:opacity-20 transition-opacity duration-500"><Medal className="w-24 h-24 text-steam-highlight rotate-12 group-hover/featured:rotate-0 transition-transform duration-700" /></div>
                            <div className="absolute inset-0 bg-steam-highlight/5 opacity-0 group-hover/featured:opacity-100 transition-opacity duration-500"></div>
                            
                            <h3 className="text-[10px] font-black text-steam-highlight uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                                <Star className="w-3 h-3 fill-current animate-pulse" /> Destaque Master
                            </h3>
                            
                            <div className="flex gap-4 items-center relative z-10">
                                <div className="w-14 h-14 bg-steam-highlight/20 rounded-xl flex items-center justify-center border border-steam-highlight/50 shadow-[0_0_20px_rgba(102,192,244,0.2)] group-hover/featured:shadow-[0_0_30px_rgba(102,192,244,0.4)] transition-all duration-500">
                                    <Trophy className="w-7 h-7 text-steam-highlight" />
                                </div>
                                <div>
                                    <div className="font-black text-white text-sm uppercase tracking-tight group-hover/featured:text-steam-highlight transition-colors">{unlockedAchievements[0].name}</div>
                                    <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Conquista Rara Desbloqueada</div>
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center relative z-10">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-steam-highlight animate-ping"></div>
                                    <span className="text-[8px] font-black text-steam-highlight uppercase tracking-widest">Raridade Extrema</span>
                                </div>
                                <span className="text-[10px] font-black text-white/40 uppercase">#{unlockedAchievements[0].id.slice(-4)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderGames = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
             {userGameStats.map(stat => (
                <div key={stat.game.id} className="bg-gradient-to-br from-steam-dark to-steam-light/5 p-6 rounded-2xl border border-white/5 hover:border-steam-highlight/20 transition-all group relative overflow-hidden shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex gap-6 items-center relative z-10">
                        <div className="relative shrink-0">
                            <img src={stat.game.coverUrl || undefined} className="w-16 h-24 object-cover rounded-xl shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"></div>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-end mb-3">
                                 <div>
                                     <h3 className="text-base font-black text-white uppercase tracking-tight group-hover:text-steam-highlight transition-colors">{stat.game.title}</h3>
                                     <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">{stat.game.publisher}</div>
                                 </div>
                                 <div className="text-2xl font-black text-steam-highlight drop-shadow-[0_0_10px_rgba(102,192,244,0.3)]">{stat.progress}%</div>
                            </div>
                            <div className="w-full bg-black/60 h-3 rounded-full border border-white/5 relative overflow-hidden shadow-inner">
                                <div className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-white z-10 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                    {stat.unlocked} / {stat.total}
                                </div>
                                <div className="h-full bg-gradient-to-r from-steam-highlight to-blue-500 transition-all duration-1000 shadow-[0_0_10px_rgba(102,192,244,0.3)]" style={{ width: `${stat.progress}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            {userGameStats.length === 0 && (
                <div className="col-span-full py-32 text-center bg-steam-dark/40 rounded-[32px] border border-white/5 backdrop-blur-sm">
                    <Gamepad2 className="w-16 h-16 text-white/5 mx-auto mb-4" />
                    <div className="opacity-20 uppercase font-black text-[10px] tracking-[0.3em]">Nenhum jogo na biblioteca</div>
                </div>
            )}
        </div>
    );

    function renderHistory() {
        const myLogs = (validationLogs || []).filter(log => log.userId === targetUser?.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return (
            <div className="bg-steam-dark/80 backdrop-blur-sm rounded-[32px] border border-white/5 overflow-hidden shadow-4xl">
                <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                    <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <History className="w-5 h-5 text-steam-highlight" /> Registro de Atividades
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-black/40 text-gray-500 border-b border-white/5 uppercase font-black tracking-widest">
                            <tr>
                                <th className="p-6">Conquista</th>
                                <th className="p-6">Data</th>
                                <th className="p-6 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {myLogs.map(log => (
                                <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-6">
                                        <div className="font-black text-white group-hover:text-steam-highlight transition-colors uppercase tracking-tight">{log.achievementName}</div>
                                        <div className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">ID: {log.id.slice(-8)}</div>
                                    </td>
                                    <td className="p-6 text-gray-400 font-bold">{new Date(log.timestamp).toLocaleDateString()}</td>
                                    <td className="p-6 text-right">
                                        <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg ${log.status === 'APPROVED' ? 'bg-steam-green/10 text-steam-green border border-steam-green/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                            {log.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {myLogs.length === 0 && (
                    <div className="py-32 text-center">
                        <History className="w-12 h-12 text-white/5 mx-auto mb-4" />
                        <div className="opacity-20 uppercase font-black text-[10px] tracking-widest">Nenhum log encontrado</div>
                    </div>
                )}
            </div>
        );
    }

    const renderGoals = () => (
        <div className="space-y-8 animate-fade-in">
            {isOwnProfile && (
                <div className="bg-gradient-to-r from-steam-dark to-steam-light/5 p-8 rounded-[32px] border border-white/5 shadow-2xl relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                         <ListTodo className="w-20 h-20 text-white" />
                     </div>
                     <form onSubmit={handleAddGoal} className="flex gap-4 relative z-10">
                         <input 
                            type="text" 
                            placeholder="Próxima meta master..."
                            className="flex-1 bg-black/60 border border-white/5 rounded-2xl p-5 text-white focus:border-steam-highlight outline-none transition-all text-sm font-bold shadow-inner"
                            value={newGoalText}
                            onChange={(e) => setNewGoalText(e.target.value)}
                         />
                         <button className="bg-steam-highlight text-steam-dark font-black uppercase tracking-widest px-10 rounded-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-xs shadow-xl shadow-steam-highlight/20">
                             <Plus className="w-4 h-4" /> Adicionar
                         </button>
                     </form>
                </div>
            )}

            <div className="grid gap-4">
                <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter italic flex items-center gap-3">
                    <Target className="w-6 h-6 text-steam-highlight" /> Objetivos de Caça
                </h2>
                {userGoals.filter(g => g.userId === targetUser?.id).map(goal => (
                    <div key={goal.id} className={`p-6 rounded-2xl border flex items-center justify-between group transition-all duration-500 shadow-lg ${goal.isCompleted ? 'bg-steam-green/5 border-steam-green/30' : 'bg-steam-dark/60 border-white/5 hover:border-steam-highlight/20 hover:bg-white/[0.02]'}`}>
                         <div className="flex items-center gap-6">
                             <button 
                                onClick={() => isOwnProfile && toggleUserGoal(goal.id)}
                                disabled={!isOwnProfile}
                                className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all shadow-md ${goal.isCompleted ? 'bg-steam-green border-steam-green text-steam-dark scale-110' : 'border-steam-accent/30 hover:border-steam-highlight hover:scale-110'} ${!isOwnProfile ? 'cursor-not-allowed' : ''}`}
                             >
                                 {goal.isCompleted && <CheckCircle2 className="w-5 h-5" />}
                             </button>
                             <div>
                                 <span className={`font-black text-lg tracking-tight transition-all ${goal.isCompleted ? 'text-gray-600 line-through italic' : 'text-white'}`}>{goal.description}</span>
                                 {goal.isCompleted && <div className="text-[8px] font-black text-steam-green uppercase tracking-widest mt-1">Meta Concluída</div>}
                             </div>
                         </div>
                         {isOwnProfile && (
                            <button 
                                onClick={() => {
                                    showConfirm('Deseja excluir esta meta?', () => {
                                        deleteUserGoal(goal.id);
                                    });
                                }} 
                                className="text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer p-3 hover:bg-red-500/10 rounded-xl"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                         )}
                    </div>
                ))}
                {userGoals.filter(g => g.userId === targetUser?.id).length === 0 && (
                    <div className="py-24 text-center bg-steam-dark/20 rounded-[32px] border border-dashed border-white/5">
                        <Target className="w-12 h-12 text-white/5 mx-auto mb-4" />
                        <div className="opacity-20 uppercase font-black text-[10px] tracking-widest italic">Nenhuma meta definida</div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderFeedbacks = () => (
        <div className="space-y-8 animate-fade-in">
            <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-tighter italic flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-steam-highlight" /> Contribuições da Comunidade
            </h2>
            <div className="grid gap-6">
                {userFeedbacks.length > 0 ? userFeedbacks.map(fb => {
                    const ach = achievements.find(a => a.id === fb.achievementId);
                    return (
                        <div key={fb.id} className="bg-gradient-to-br from-steam-dark to-steam-light/5 p-8 rounded-[32px] border border-white/5 flex gap-8 group relative hover:border-steam-highlight/20 transition-all shadow-xl overflow-hidden">
                             <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                 <Quote className="w-24 h-24 text-white" />
                             </div>
                             <div className="flex-1 relative z-10">
                                 <div className="flex justify-between items-start mb-4">
                                     <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 rounded-xl bg-steam-highlight/10 flex items-center justify-center border border-steam-highlight/20">
                                             <Trophy className="w-5 h-5 text-steam-highlight" />
                                         </div>
                                         <div>
                                             <div className="font-black text-steam-highlight text-sm uppercase tracking-tight">{ach?.name || 'Conquista'}</div>
                                             <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Comentário Master</div>
                                         </div>
                                     </div>
                                     <div className="text-[10px] text-gray-600 font-black uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full">{new Date(fb.timestamp).toLocaleDateString()}</div>
                                 </div>
                                 <p className="text-gray-300 text-lg font-medium leading-relaxed italic pl-4 border-l-2 border-white/10">"{fb.comment}"</p>
                             </div>
                             {isOwnProfile && (
                                <button 
                                    onClick={() => {
                                        showConfirm('Deseja excluir seu comentário?', () => {
                                            deleteFeedback(fb.id);
                                        });
                                    }} 
                                    className="text-red-500 opacity-0 group-hover:opacity-100 transition-all p-3 hover:bg-red-500/10 rounded-2xl cursor-pointer self-start relative z-10"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                             )}
                        </div>
                    );
                }) : (
                    <div className="py-32 text-center bg-steam-dark/20 rounded-[40px] border border-dashed border-white/5">
                        <MessageSquare className="w-16 h-16 text-white/5 mx-auto mb-4" />
                        <div className="opacity-20 uppercase font-black text-[10px] tracking-widest italic">Nenhuma contribuição ainda</div>
                    </div>
                )}
            </div>
        </div>
    );

    // Combinar wallpapers iniciais com os adquiridos na loja
    const masterWallpapers = useMemo(() => {
        const ownedItems = targetUser?.ownedItemIds || [];
        const shopWps = storeItems
            .filter(item => item.type === 'WALLPAPER' && ownedItems.includes(item.id))
            .map(item => ({
                id: item.id,
                title: item.name,
                url: item.image,
                category: 'Adquirido na Loja',
                thumbnail: item.image // Use image as thumb for simplified preview
            }));
        
        return [...wallpapers, ...shopWps];
    }, [wallpapers, storeItems, targetUser?.ownedItemIds]);

    const categories = ['Todos', ...Array.from(new Set(masterWallpapers.map(w => w.category)))];
    const filteredWallpapers = selectedCategory === 'Todos' 
        ? masterWallpapers 
        : masterWallpapers.filter(w => w.category === selectedCategory);

    return (
        <div className="overflow-y-auto h-full bg-steam-base bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-steam-light/10 via-steam-base to-black text-white custom-scrollbar pb-20 relative">
            {/* Noise Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay z-[1]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
            
            {/* Elementos Decorativos de Fundo */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 z-0">
                <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] bg-steam-highlight/10 blur-[180px] rounded-full animate-pulse-slow"></div>
                <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-[40%] right-[10%] w-[40%] h-[40%] bg-purple-600/5 blur-[120px] rounded-full animate-pulse-slow" style={{ animationDelay: '4s' }}></div>
                <div className="absolute top-[60%] left-[10%] w-[35%] h-[35%] bg-steam-green/5 blur-[100px] rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
                <div className="absolute bottom-[5%] left-[30%] w-[25%] h-[25%] bg-steam-highlight/5 blur-[90px] rounded-full animate-pulse-slow" style={{ animationDelay: '3s' }}></div>
            </div>

            {/* Header Section com Background de Perfil Dinâmico */}
            <div className="relative group/bg mb-20 z-10">
                        <div className="h-64 md:h-80 w-full overflow-hidden relative bg-black shadow-inner border-b border-white/5">
                            <div className="w-full h-full relative">
                                {isEditing ? (
                                    renderBackground(editData.profileBackground || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop")
                                ) : (
                                    renderBackground(targetUser.profileBackground || '')
                                )}
                                
                                <div className="absolute inset-0 bg-gradient-to-t from-steam-base via-transparent to-black/40"></div>
                                
                                {!isEditing && targetUser.profileBackground && isVideoBackground(targetUser.profileBackground) && !videoError && (
                                    <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md border border-steam-highlight/20 p-2 rounded-lg flex items-center gap-2 opacity-0 group-hover/bg:opacity-100 transition-opacity">
                                        <Play className="w-3 h-3 text-steam-highlight fill-current" />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Master Animado</span>
                                    </div>
                                )}
                            </div>
                            
                            {isEditing && isOwnProfile && (
                                <button 
                                    onClick={() => setIsGalleryOpen(true)} 
                                    className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 hover:bg-black/80 transition-all border-4 border-dashed border-steam-highlight/30 m-4 rounded-3xl group/btn"
                                >
                                    <Sparkles className="w-10 h-10 text-steam-highlight group-hover/btn:scale-125 transition-transform" />
                                    <div className="text-center">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white block mb-1">Galeria Master</span>
                                        <span className="text-[8px] font-bold text-steam-highlight uppercase tracking-widest">
                                            {hasWallpaperPermission ? 'Escolha fundos gratuitos ou adquiridos na loja' : 'Recurso Exclusivo Administrador/VIP'}
                                        </span>
                                    </div>
                                </button>
                            )}
                        </div>

                <div className="max-w-7xl mx-auto px-8 md:px-12 relative z-10 -mt-24 md:-mt-20">
                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-end">
                        <div className="relative group shrink-0">
                            <img 
                                src={(isEditing ? editData.avatar : targetUser.avatar) || undefined} 
                                className="w-32 h-32 md:w-40 md:h-40 rounded-3xl border-4 border-steam-base shadow-[0_15px_50px_rgba(0,0,0,0.7)] object-cover bg-steam-dark" 
                            />
                            {isEditing && isOwnProfile && (
                                <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black/70 rounded-3xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all border-2 border-steam-highlight animate-pulse-fast">
                                    <Camera className="w-6 h-6 text-white mb-1" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-white">Alterar Foto</span>
                                </button>
                            )}
                            <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </div>

                        <div className="flex-1 text-center md:text-left mb-4">
                            <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6">
                                <div>
                                    <div className="flex items-center gap-3 justify-center md:justify-start">
                                        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">{targetUser.name}</h1>
                                        <div className="flex gap-2">
                                            {targetUser.isAdmin && <Shield className="w-6 h-6 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />}
                                            {targetUser.isVip && <Gem className="w-6 h-6 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />}
                                        </div>
                                    </div>
                                    <div className={`text-xs md:text-sm font-black uppercase tracking-[0.3em] mt-2 ${levelInfo.color} drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`}>
                                        {levelInfo.title} • {totalXP} XP ACUMULADO
                                    </div>
                                    
                                    {/* Steam Link Status */}
                                    <div className="mt-4 flex flex-wrap gap-3 justify-center md:justify-start">
                                        {targetUser.steamId ? (
                                            <div className="flex flex-wrap gap-3">
                                                <div className="flex items-center gap-2 bg-steam-highlight/10 border border-steam-highlight/30 px-4 py-1.5 rounded-full shadow-lg backdrop-blur-sm group/steam">
                                                    <Globe className="w-3.5 h-3.5 text-steam-highlight animate-pulse" />
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Steam Vinculada</span>
                                                    <span className="text-[9px] text-steam-highlight/60 font-mono group-hover:text-steam-highlight transition-colors">ID: {targetUser.steamId}</span>
                                                </div>
                                                
                                                {isOwnProfile && (
                                                    <button 
                                                        onClick={handleSyncLibrary}
                                                        disabled={isSyncingLibrary}
                                                        className="flex items-center gap-2 bg-steam-green/10 hover:bg-steam-green border border-steam-green/30 hover:border-steam-green px-4 py-1.5 rounded-full transition-all group/sync shadow-lg backdrop-blur-sm"
                                                    >
                                                        {isSyncingLibrary ? (
                                                            <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="w-3.5 h-3.5 text-steam-green group-hover:text-steam-dark transition-colors" />
                                                        )}
                                                        <span className="text-[10px] font-black text-steam-green group-hover:text-steam-dark uppercase tracking-widest transition-colors">
                                                            {isSyncingLibrary ? 'Sincronizando...' : 'Sincronizar Biblioteca'}
                                                        </span>
                                                    </button>
                                                )}
                                            </div>
                                        ) : isOwnProfile && (
                                            <button 
                                                onClick={handleLinkSteam}
                                                disabled={isLinkingSteam}
                                                className="flex items-center gap-2 bg-steam-dark/60 hover:bg-steam-highlight border border-white/10 hover:border-steam-highlight px-4 py-1.5 rounded-full transition-all group/link shadow-xl"
                                            >
                                                {isLinkingSteam ? (
                                                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                                                ) : (
                                                    <Globe className="w-3.5 h-3.5 text-gray-400 group-hover:text-steam-dark transition-colors" />
                                                )}
                                                <span className="text-[10px] font-black text-gray-400 group-hover:text-steam-dark uppercase tracking-widest transition-colors">
                                                    {isLinkingSteam ? 'Vinculando...' : 'Vincular Steam'}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    {!isOwnProfile && currentUser && (
                                        <button 
                                            onClick={() => toggleFriend(targetUser.id)}
                                            className={`flex items-center gap-3 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all shadow-2xl ${isAlreadyFriend ? 'bg-red-600/10 border border-white/5 text-red-500 hover:bg-red-600 hover:text-white' : 'bg-white text-steam-dark hover:bg-steam-highlight'}`}
                                        >
                                            {isAlreadyFriend ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                            {isAlreadyFriend ? 'Remover Amigo' : 'Adicionar Amigo'}
                                        </button>
                                    )}

                                    {isOwnProfile && (
                                        <button 
                                            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                            className={`flex items-center gap-3 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all shadow-2xl ${isEditing ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-steam-highlight text-steam-dark hover:bg-white'}`}
                                        >
                                            {isEditing ? <CheckCircle className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                                            {isEditing ? 'Confirmar Mudanças' : 'Personalizar Perfil'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 md:px-12 z-10 relative">
                <div className="mb-10">
                    {isEditing ? (
                        <div className="animate-fade-in bg-steam-dark/60 p-6 rounded-2xl border border-white/5 backdrop-blur-md shadow-2xl">
                            <label className="text-[10px] text-gray-500 font-black uppercase mb-3 block tracking-widest">Sua Biografia de Caçador</label>
                            <textarea 
                                className="w-full bg-black/60 p-5 rounded-xl text-gray-300 border border-white/5 h-32 resize-none focus:border-steam-highlight outline-none font-bold text-base shadow-inner transition-all"
                                value={editData.bio}
                                onChange={(e) => setEditData({...editData, bio: e.target.value})}
                                placeholder="Diga algo sobre sua jornada épica..."
                            />
                        </div>
                    ) : (
                        <div className="bg-gradient-to-r from-steam-dark/80 to-steam-light/10 p-10 rounded-[40px] border border-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden group/bio">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-steam-highlight to-blue-600"></div>
                            <div className="absolute -right-10 -bottom-10 opacity-5 group-hover/bio:opacity-10 transition-opacity duration-700">
                                <MessageSquare className="w-40 h-40 text-white" />
                            </div>
                            <p className="text-gray-200 text-2xl italic font-medium leading-relaxed opacity-90 relative z-10 drop-shadow-sm">
                                "{targetUser.bio || "Explorando o banco de dados Master Achievement em busca de glória eterna."}"
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex gap-6 mb-10 border-b border-white/5 h-16 overflow-x-auto custom-scrollbar items-center bg-black/20 px-6 rounded-2xl backdrop-blur-sm">
                    {(['overview', 'games', 'history', 'goals', 'feedbacks'] as const).map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)} 
                            className={`h-full px-6 text-[11px] font-black uppercase tracking-[0.2em] border-b-4 transition-all shrink-0 flex items-center gap-2
                                ${activeTab === tab ? 'border-steam-highlight text-white bg-white/5' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'} transition-all duration-300`}
                        >
                            {tab === 'overview' && <Home className="w-3.5 h-3.5" />}
                            {tab === 'games' && <Gamepad2 className="w-3.5 h-3.5" />}
                            {tab === 'history' && <History className="w-3.5 h-3.5" />}
                            {tab === 'goals' && <ListTodo className="w-3.5 h-3.5" />}
                            {tab === 'feedbacks' && <MessageSquare className="w-3.5 h-3.5" />}
                            {tab === 'overview' ? 'Visão Geral' : tab === 'games' ? 'Biblioteca' : tab === 'history' ? 'Histórico' : tab === 'goals' ? 'Objetivos' : 'Contribuições'}
                        </button>
                    ))}
                </div>

                <div className="min-h-[400px]">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'games' && renderGames()}
                    {activeTab === 'history' && <div className="animate-fade-in"><h2 className="text-2xl font-black text-white mb-8 uppercase tracking-tighter italic">Logs de Sincronia Real</h2>{renderHistory()}</div>}
                    {activeTab === 'goals' && renderGoals()}
                    {activeTab === 'feedbacks' && renderFeedbacks()}
                </div>
            </div>

            {/* MODAL GALERIA MASTER */}
            {isGalleryOpen && (
                <div className="fixed inset-0 bg-black/95 z-[150] flex items-center justify-center p-4 backdrop-blur-xl animate-scale-in">
                    <div className="bg-steam-base w-full max-w-6xl rounded-[40px] border border-white/10 shadow-5xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-[#171d25]">
                             <div className="flex items-center gap-5">
                                 <div className="p-3 bg-steam-highlight/10 rounded-2xl border border-steam-highlight/20">
                                     <Sparkles className="w-8 h-8 text-steam-highlight" />
                                 </div>
                                 <div>
                                     <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Galeria Master</h2>
                                     <p className="text-[10px] text-steam-highlight font-black uppercase tracking-[0.3em]">
                                        {hasWallpaperPermission ? 'Escolha fundos gratuitos ou adquiridos na loja' : 'Galeria bloqueada para membros comuns'}
                                     </p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-4">
                                 {currentUser?.isAdmin && (
                                     <button 
                                        onClick={() => setIsAddWpOpen(true)}
                                        className="bg-steam-highlight text-steam-dark px-6 py-2 rounded-full font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:scale-105 transition-all shadow-xl"
                                     >
                                         <PlusCircle className="w-4 h-4" /> Adicionar Wallpaper
                                     </button>
                                 )}
                                 <button onClick={() => setIsGalleryOpen(false)} className="p-4 bg-white/5 hover:bg-red-500/20 rounded-full transition-all group">
                                     <X className="w-8 h-8 text-gray-500 group-hover:text-red-500" />
                                 </button>
                             </div>
                        </div>

                        {!hasWallpaperPermission ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-[#0d0f13]">
                                <div className="p-10 rounded-full bg-red-500/10 border-2 border-dashed border-red-500/20 mb-8 animate-pulse">
                                    <Lock className="w-20 h-20 text-red-500" />
                                </div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4 italic">Recurso de Elite</h3>
                                <p className="text-gray-400 max-w-md leading-relaxed font-medium italic">
                                    A troca de fundos de perfil é permitida apenas para <span className="text-red-500 font-bold">Administradores</span> ou membros com status <span className="text-yellow-500 font-bold">VIP</span>. 
                                    Entre em contato com o suporte ou torne-se um VIP para desbloquear.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="px-10 py-6 bg-black/20 flex items-center gap-6 overflow-x-auto custom-scrollbar border-b border-white/5">
                                    <Filter className="w-4 h-4 text-gray-500 shrink-0" />
                                    {categories.map(cat => (
                                        <button 
                                            key={cat} 
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                                                ${selectedCategory === cat ? 'bg-steam-highlight text-steam-dark shadow-xl' : 'bg-white/5 text-gray-400 hover:text-white'}
                                            `}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                <div className="p-10 overflow-y-auto flex-1 custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 bg-[#0d0f13]">
                                    {filteredWallpapers.map(wp => (
                                        <div 
                                            key={wp.id} 
                                            onClick={() => selectWallpaper(wp.url)}
                                            className="group relative rounded-3xl overflow-hidden border-2 border-white/5 hover:border-steam-highlight/50 transition-all cursor-pointer aspect-video shadow-2xl"
                                        >
                                            {isVideoBackground(wp.url) ? (
                                                <video 
                                                    key={`gallery-${wp.url}`}
                                                    src={wp.url || undefined} 
                                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all" 
                                                    muted 
                                                    loop 
                                                    playsInline
                                                    preload="metadata"
                                                    onMouseOver={e => {
                                                        const playPromise = e.currentTarget.play();
                                                        if (playPromise !== undefined) {
                                                            playPromise.catch(() => {});
                                                        }
                                                    }} 
                                                    onMouseOut={e => { 
                                                        e.currentTarget.pause(); 
                                                        e.currentTarget.currentTime = 0; 
                                                    }}
                                                />
                                            ) : (
                                                <img 
                                                    key={`gallery-img-${wp.url}`}
                                                    src={wp.url || undefined} 
                                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all" 
                                                    alt={wp.title}
                                                />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                                            <div className="absolute bottom-6 left-6 right-6 pointer-events-none">
                                                <div className="text-[9px] text-steam-highlight font-black uppercase tracking-widest mb-1">{wp.category}</div>
                                                <div className="text-lg font-black text-white uppercase tracking-tight">{wp.title}</div>
                                            </div>
                                            
                                            <div className="absolute top-6 right-6 flex items-center gap-2">
                                                {wp.category === 'Adquirido na Loja' && <ShoppingBag className="w-5 h-5 text-yellow-500 drop-shadow-lg" />}
                                                {currentUser?.isAdmin && wp.category !== 'Adquirido na Loja' && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); if(window.confirm('Excluir este wallpaper?')) deleteWallpaper(wp.id); }}
                                                        className="bg-red-600 text-white p-2 rounded-xl shadow-xl hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <div className="bg-steam-highlight text-steam-dark p-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-8 bg-[#171d25] border-t border-white/5 text-center">
                                     <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Visite a Loja para desbloquear fundos exclusivos e animados</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL ADICIONAR WALLPAPER (ADMIN APENAS) */}
            {isAddWpOpen && currentUser?.isAdmin && (
                <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in">
                    <div className="bg-steam-base w-full max-w-lg rounded-3xl border border-white/10 p-8 relative overflow-hidden shadow-4xl">
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex items-center gap-4">
                                <PlusCircle className="w-8 h-8 text-steam-highlight" />
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Novo Wallpaper Global</h3>
                            </div>
                            <button onClick={() => setIsAddWpOpen(false)} className="text-gray-500 hover:text-white"><X className="w-6 h-6"/></button>
                        </div>

                        <form onSubmit={handleAddWallpaperSubmit} className="space-y-6">
                            <div>
                                <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Nome do Wallpaper</label>
                                <input 
                                    className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white font-bold outline-none focus:border-steam-highlight transition-all"
                                    placeholder="Ex: Cyberpunk Night"
                                    value={newWpData.title}
                                    onChange={e => setNewWpData({...newWpData, title: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Fonte do Fundo (URL)</label>
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-2">
                                        <input 
                                            className="flex-1 bg-black/40 border border-white/5 rounded-xl p-4 text-white font-bold outline-none focus:border-steam-highlight transition-all text-xs"
                                            placeholder="https://exemplo.com/video.mp4"
                                            value={newWpData.url}
                                            onChange={e => setNewWpData({...newWpData, url: e.target.value})}
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => wpFileInputRef.current?.click()}
                                            className="bg-steam-highlight text-steam-dark p-4 rounded-xl flex items-center justify-center hover:scale-105 transition-all shadow-lg disabled:opacity-50"
                                            disabled={isUploadingWp || uploadProgress !== null}
                                        >
                                            {isUploadingWp || uploadProgress !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        </button>
                                        <input 
                                            type="file" 
                                            ref={wpFileInputRef} 
                                            className="hidden" 
                                            accept="video/mp4,video/webm,image/*" 
                                            onChange={handleWpFileUpload} 
                                        />
                                    </div>
                                    {uploadProgress !== null && (
                                        <div className="bg-black/40 rounded-full h-2 overflow-hidden border border-white/5">
                                            <div 
                                                className="bg-steam-highlight h-full transition-all duration-300" 
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    )}
                                    <p className="text-[8px] text-gray-500 uppercase font-black italic">
                                        <span className="text-steam-highlight">Turbo Upload:</span> Ativado para arquivos grandes. Suporta até 900MB.
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Categoria</label>
                                    <select 
                                        className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white font-bold outline-none focus:border-steam-highlight transition-all text-xs"
                                        value={newWpData.category}
                                        onChange={e => setNewWpData({...newWpData, category: e.target.value})}
                                    >
                                        <option value="Cyberpunk">Cyberpunk</option>
                                        <option value="Espaço">Espaço</option>
                                        <option value="Natureza">Natureza</option>
                                        <option value="Arte">Arte</option>
                                        <option value="Zen">Zen</option>
                                        <option value="Hacker">Hacker</option>
                                        <option value="Retrowave">Retrowave</option>
                                        <option value="Épico">Épico</option>
                                        <option value="Jogos">Jogos</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button type="button" onClick={() => setIsAddWpOpen(false)} className="flex-1 bg-white/5 text-gray-400 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                                <button type="submit" className="flex-1 bg-steam-highlight text-steam-dark py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20">Publicar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

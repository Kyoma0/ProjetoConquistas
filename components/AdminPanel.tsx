
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../backend';
import { chunkedUpload } from '../services/uploadService';
import { db, doc, collection, writeBatch } from '../firebase';
import { Game, Achievement, Content, Difficulty, ContentType, AchievementStatus, UserAchievementProgress, Feedback, RewardRoomSettings, SystemSettings, StoreItem, GameEvent, Transaction, LevelConfig } from '../types';
import { Shield, Plus, Save, Trash2, Edit2, Gamepad2, Trophy, Video, ArrowLeft, Image as ImageIcon, BookOpen, Lightbulb, Users, BarChart2, EyeOff, FolderOpen, CheckCircle2, XCircle, Clock, Settings, Layout, ExternalLink, MessageSquare, History, PlayCircle, Zap, Upload, Download, Database, RotateCcw, Ban, UserCheck, Loader2, UserMinus, ShieldAlert, Gem, Eye, Tv, Coins, Settings2, Power, Receipt, Percent, ShieldBan, Search, MonitorCheck, Library, Heart, Radio, ShoppingBag, Star, Info, EyeIcon, EyeOffIcon, Copy, X, Calendar, Mail, Send } from 'lucide-react';

type ViewState = 
  | { type: 'rewards_control' }
  | { type: 'dashboard' }
  | { type: 'games' }
  | { type: 'achievements'; gameId: string }
  | { type: 'users' }
  | { type: 'feedbacks' }
  | { type: 'database' }
  | { type: 'events_management' }
  | { type: 'notifications' }
  | { type: 'levels' }
  | { type: 'design' };

export const RenderAchIcon = ({ icon, className = "w-12 h-12" }: { icon: string, className?: string }) => {
  const isImage = icon?.startsWith('http') || icon?.startsWith('data:image');
  return (
    <div className={`${className} flex items-center justify-center bg-black/40 rounded border border-transparent shadow-inner overflow-hidden shrink-0`}>
      {isImage ? (
        <img src={icon || undefined} className="w-full h-full object-cover" alt="Icon" />
      ) : (
        <span className="text-2xl">{icon || '🏆'}</span>
      )}
    </div>
  );
};

export const AdminPanel: React.FC<{ onViewUserProfile: (userId: string) => void }> = ({ onViewUserProfile }) => {
  const { games, achievements, users, pendingValidations, feedbacks, storeItems, events, levels, addLevel, updateLevel, deleteLevel, deleteFeedback, addGame, updateGame, deleteGame, addAchievement, updateAchievement, deleteAchievement, importAchievementsFromSteam, addStoreItem, updateStoreItem, deleteStoreItem, addEvent, updateEvent, deleteEvent, toggleBanUser, toggleAdminUser, toggleVipUser, adminAddBalance, showToast, rewardSettings, updateRewardSettings, systemSettings, updateSystemSettings, showConfirm, createGeneralNotification } = useApp();
  const [view, setView] = useState<ViewState>({ type: 'rewards_control' });
  const [rewardsSubTab, setRewardsSubTab] = useState<'control' | 'reward_room' | 'store'>('control');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [editingGame, setEditingGame] = useState<Partial<Game> | null>(null);
  const [showGameModal, setShowGameModal] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Partial<Achievement> | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);

  const [editingStoreItem, setEditingStoreItem] = useState<Partial<StoreItem> | null>(null);
  const [showStoreModal, setShowStoreModal] = useState(false);
  
  const [editingEv, setEditingEv] = useState<Partial<GameEvent> | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  const [pendingSettings, setPendingSettings] = useState<Partial<SystemSettings> | null>(null);

  const [editingLevel, setEditingLevel] = useState<Partial<LevelConfig> | null>(null);
  const [showLevelModal, setShowLevelModal] = useState(false);

  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceTargetUserId, setBalanceTargetUserId] = useState<string | null>(null);

  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifLink, setNotifLink] = useState('');
  const [notifImage, setNotifImage] = useState('');
  const [vipSelectionUserId, setVipSelectionUserId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const storeFileInputRef = useRef<HTMLInputElement>(null);
  const eventBannerRef = useRef<HTMLInputElement>(null);
  const gameCoverFileInputRef = useRef<HTMLInputElement>(null);
  const gameBannerFileInputRef = useRef<HTMLInputElement>(null);
  const achIconFileInputRef = useRef<HTMLInputElement>(null);
  const fontFileInputRef = useRef<HTMLInputElement>(null);

  // Configurações locais para formulário de recompensas
  const [localRewardSettings, setLocalRewardSettings] = useState<RewardRoomSettings>(rewardSettings);

  const filteredStoreItems = useMemo(() => {
    if (!searchTerm.trim()) return storeItems;
    return storeItems.filter(i => 
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [storeItems, searchTerm]);

  const handleSaveRewardSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateRewardSettings(localRewardSettings);
  };

  const handleStoreFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 900 * 1024 * 1024) { // 900MB limit
        showToast("Arquivo muito grande! O limite é 900MB.", "error");
        return;
      }

      // Use chunked upload for files larger than 1MB
      if (file.size > 1 * 1024 * 1024) {
        setUploadProgress(0);
        try {
          const url = await chunkedUpload(file, (progress) => {
            setUploadProgress(progress);
          });
          setEditingStoreItem(prev => prev ? { ...prev, image: url } : null);
          showToast("Vídeo pesado carregado via Turbo Upload!", "success");
        } catch (err) {
          console.error("Upload error:", err);
          showToast("Falha no Turbo Upload. Tente um arquivo menor ou use uma URL.", "error");
        } finally {
          setUploadProgress(null);
        }
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditingStoreItem(prev => prev ? { ...prev, image: reader.result as string } : null);
          showToast("Arquivo carregado com sucesso!", "success");
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleEventFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 900 * 1024 * 1024) { // 900MB limit
        showToast("Banner muito grande! O limite é 900MB.", "error");
        return;
      }

      if (file.size > 1 * 1024 * 1024) {
        setUploadProgress(0);
        try {
          const url = await chunkedUpload(file, (progress) => {
            setUploadProgress(progress);
          });
          setEditingEv(prev => prev ? { ...prev, banner: url } : null);
          showToast("Banner pesado carregado com sucesso!", "success");
        } catch (err) {
          console.error("Upload error:", err);
          showToast("Erro no upload do banner.", "error");
        } finally {
          setUploadProgress(null);
        }
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditingEv(prev => prev ? { ...prev, banner: reader.result as string } : null);
          showToast("Banner pronto para lançamento!", "success");
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleGameFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'coverUrl' | 'bannerUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 1 * 1024 * 1024) {
      setUploadProgress(0);
      try {
        const url = await chunkedUpload(file, (progress) => setUploadProgress(progress));
        setEditingGame(prev => prev ? { ...prev, [field]: url } : null);
        showToast("Imagem carregada via Turbo Upload!", "success");
      } catch (err) {
        showToast("Erro no upload.", "error");
      } finally {
        setUploadProgress(null);
      }
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingGame(prev => prev ? { ...prev, [field]: reader.result as string } : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAchFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 1 * 1024 * 1024) {
      setUploadProgress(0);
      try {
        const url = await chunkedUpload(file, (progress) => setUploadProgress(progress));
        setEditingAchievement(prev => prev ? { ...prev, icon: url } : null);
        showToast("Ícone carregado!", "success");
      } catch (err) {
        showToast("Erro no upload.", "error");
      } finally {
        setUploadProgress(null);
      }
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingAchievement(prev => prev ? { ...prev, icon: reader.result as string } : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadProgress(0);
    try {
      const url = await chunkedUpload(file, (progress) => setUploadProgress(progress));
      const fontName = file.name.split('.')[0];
      const newFont = { name: fontName, url };
      
      const currentFonts = pendingSettings?.customFonts || systemSettings.customFonts || [];
      setPendingSettings({
        ...pendingSettings,
        customFonts: [...currentFonts, newFont]
      });
      showToast(`Fonte "${fontName}" carregada!`, "success");
    } catch (err) {
      showToast("Erro no upload da fonte.", "error");
    } finally {
      setUploadProgress(null);
    }
  };

  const handleAddFunds = (userId: string) => {
    setBalanceTargetUserId(userId);
    setShowBalanceModal(true);
  };

  const confirmAddFunds = async (amount: number) => {
    if (!balanceTargetUserId) return;
    try {
      await adminAddBalance(balanceTargetUserId, amount);
      setShowBalanceModal(false);
      setBalanceTargetUserId(null);
    } catch (err) {
      showToast("Erro ao adicionar fundos.", "error");
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle || !notifMessage) return;
    setIsSaving(true);
    try {
      await createGeneralNotification(notifTitle, notifMessage, notifLink, notifImage);
      setShowNotificationModal(false);
      setNotifTitle('');
      setNotifMessage('');
      setNotifLink('');
      setNotifImage('');
    } catch (err) {
      showToast("Erro ao enviar notificação.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportDB = () => {
    const data = { games, achievements, users, feedbacks, storeItems, events };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hub_db_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showToast("Backup gerado!", "success");
  };

  const handleImportDB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          setIsSaving(true);
          
          const batch = writeBatch(db);
          
          if (data.games && Array.isArray(data.games)) {
            data.games.forEach((g: any) => {
              const { id, ...rest } = g;
              batch.set(doc(db, 'games', id || doc(collection(db, 'games')).id), rest);
            });
          }
          
          if (data.achievements && Array.isArray(data.achievements)) {
            data.achievements.forEach((a: any) => {
              const { id, ...rest } = a;
              batch.set(doc(db, 'achievements', id || doc(collection(db, 'achievements')).id), rest);
            });
          }

          if (data.storeItems && Array.isArray(data.storeItems)) {
            data.storeItems.forEach((s: any) => {
              const { id, ...rest } = s;
              batch.set(doc(db, 'storeItems', id || doc(collection(db, 'storeItems')).id), rest);
            });
          }

          if (data.events && Array.isArray(data.events)) {
            data.events.forEach((ev: any) => {
              const { id, ...rest } = ev;
              batch.set(doc(db, 'events', id || doc(collection(db, 'events')).id), rest);
            });
          }

          await batch.commit();
          showToast("Dados importados para o Firebase com sucesso!", "success");
        } catch (err) {
          console.error("Erro na importação:", err);
          showToast("Erro no arquivo JSON ou permissão negada.", "error");
        } finally {
          setIsSaving(false);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSeedDB = async () => {
    showConfirm("Deseja popular o banco de dados com dados de exemplo?", async () => {
      setIsSaving(true);
      try {
        const batch = writeBatch(db);
        
        const sampleGames = [
          {
            id: 'sample-game-1',
            title: 'Cyberpunk 2077',
            description: 'Um RPG de ação e aventura em mundo aberto ambientado em Night City.',
            coverUrl: 'https://picsum.photos/seed/cyberpunk/400/600',
            bannerUrl: 'https://picsum.photos/seed/cyberpunk-banner/1920/1080',
            developer: 'CD Projekt Red',
            releaseDate: '2020-12-10',
            genres: ['RPG', 'Ação', 'Ficção Científica'],
            platforms: ['PC', 'PS5', 'Xbox Series X'],
            steamAppId: '1091500',
            rating: 4.5,
            playTime: 100
          },
          {
            id: 'sample-game-2',
            title: 'Elden Ring',
            description: 'Levante-se, Maculado, e seja guiado pela graça para empunhar o poder do Anel Prístino.',
            coverUrl: 'https://picsum.photos/seed/elden/400/600',
            bannerUrl: 'https://picsum.photos/seed/elden-banner/1920/1080',
            developer: 'FromSoftware',
            releaseDate: '2022-02-25',
            genres: ['RPG', 'Ação', 'Souls-like'],
            platforms: ['PC', 'PS5', 'Xbox Series X'],
            steamAppId: '1245620',
            rating: 4.9,
            playTime: 150
          }
        ];

        const sampleAchievements = [
          {
            id: 'ach-1',
            gameId: 'sample-game-1',
            name: 'O Louco',
            description: 'Torne-se um mercenário de Night City.',
            icon: '🏆',
            points: 10,
            rarity: 'COMUM',
            difficulty: 'EASY',
            order: 1
          },
          {
            id: 'ach-2',
            gameId: 'sample-game-2',
            name: 'Lorde Prístino',
            description: 'Alcance o final "Lorde Prístino".',
            icon: '👑',
            points: 100,
            rarity: 'LENDÁRIO',
            difficulty: 'HARD',
            order: 1
          }
        ];

        sampleGames.forEach(g => batch.set(doc(db, 'games', g.id), g));
        sampleAchievements.forEach(a => batch.set(doc(db, 'achievements', a.id), a));

        await batch.commit();
        showToast("Banco de dados populado com sucesso!", "success");
      } catch (err) {
        console.error("Erro ao semear banco:", err);
        showToast("Erro ao semear banco de dados.", "error");
      } finally {
        setIsSaving(false);
      }
    });
  };

  const FeatureToggle = ({ label, icon, enabled, onToggle }: { label: string, icon: React.ReactNode, enabled: boolean, onToggle: () => void }) => (
    <div className="bg-black/30 p-6 rounded-3xl border border-transparent flex items-center justify-between group hover:border-transparent transition-all">
       <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl transition-all ${enabled ? 'bg-steam-highlight/10 text-steam-highlight' : 'bg-gray-500/10 text-gray-500'}`}>
             {icon}
          </div>
          <div>
             <div className="text-sm font-black text-white uppercase tracking-tight">{label}</div>
             <div className={`text-[9px] font-black uppercase tracking-widest ${enabled ? 'text-steam-green' : 'text-red-500'}`}>
                {enabled ? 'Módulo Ativo' : 'Módulo Oculto'}
             </div>
          </div>
       </div>
       <button 
          onClick={onToggle}
          className={`w-14 h-8 rounded-full relative transition-all duration-300 ${enabled ? 'bg-steam-highlight shadow-[0_0_15px_rgba(102,192,244,0.4)]' : 'bg-white/10'}`}
       >
          <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-xl transition-all duration-300 ${enabled ? 'left-7' : 'left-1'}`}></div>
       </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-steam-base text-steam-accent overflow-hidden font-sans">
      {/* HEADER ADMIN */}
      <div className="p-6 bg-steam-dark border-b border-transparent flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
           <div className="p-2 bg-red-600/10 rounded-lg"><Shield className="w-6 h-6 text-red-600" /></div>
           <div>
             <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none mb-1">Painel Admin</h1>
             <p className="text-[10px] opacity-60 uppercase font-black tracking-widest text-red-500">Controle Mestre do Servidor</p>
           </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setView({ type: 'rewards_control' })} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view.type === 'rewards_control' ? 'bg-steam-highlight text-steam-dark' : 'bg-steam-light/20'}`}><Tv className="w-3.5 h-3.5" /> Gestão</button>
           <button onClick={() => setView({ type: 'notifications' })} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view.type === 'notifications' ? 'bg-steam-highlight text-steam-dark' : 'bg-steam-light/20'}`}><Mail className="w-3.5 h-3.5" /> Notificação Geral</button>
           <button onClick={() => setView({ type: 'dashboard' })} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all ${view.type === 'dashboard' ? 'bg-steam-highlight text-steam-dark' : 'bg-steam-light/20'}`}>Geral</button>
           <button onClick={() => setView({ type: 'levels' })} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view.type === 'levels' ? 'bg-steam-highlight text-steam-dark' : 'bg-steam-light/20'}`}><BarChart2 className="w-3.5 h-3.5" /> Níveis</button>
           <button onClick={() => setView({ type: 'games' })} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all ${['games', 'achievements'].includes(view.type) ? 'bg-steam-highlight text-steam-dark' : 'bg-steam-light/20'}`}>Jogos</button>
           <button onClick={() => setView({ type: 'events_management' })} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view.type === 'events_management' ? 'bg-steam-highlight text-steam-dark' : 'bg-steam-light/20'}`}><Calendar className="w-3.5 h-3.5" /> Eventos</button>
           <button onClick={() => setView({ type: 'feedbacks' })} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view.type === 'feedbacks' ? 'bg-steam-highlight text-steam-dark' : 'bg-steam-light/20'}`}><MessageSquare className="w-3.5 h-3.5" /> Comentários</button>
                       <button onClick={() => setView({ type: 'users' })} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all ${view.type === 'users' ? 'bg-steam-highlight text-steam-dark' : 'bg-steam-light/20'}`}>Users</button>
            <button onClick={() => setView({ type: 'design' })} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view.type === 'design' ? 'bg-steam-highlight text-steam-dark' : 'bg-steam-light/20'}`}><Layout className="w-3.5 h-3.5" /> Design</button>

           <button onClick={() => setView({ type: 'database' })} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view.type === 'database' ? 'bg-steam-highlight text-steam-dark' : 'bg-steam-light/20'}`}><Database className="w-3 h-3"/> Banco</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {view.type === 'rewards_control' && (
           <div className="animate-fade-in max-w-6xl">
              <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between border-b border-transparent pb-6 gap-4">
                 <div>
                   <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3"><Tv className="text-steam-highlight" /> Gestão da Plataforma</h2>
                   <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Controle de módulos e economia master</p>
                 </div>
                 
                 <div className="flex bg-black/40 p-1.5 rounded-2xl border border-transparent self-start overflow-x-auto custom-scrollbar no-scrollbar">
                    <button 
                        onClick={() => setRewardsSubTab('control')}
                        className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${rewardsSubTab === 'control' ? 'bg-steam-highlight text-steam-dark' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Settings2 className="w-3.5 h-3.5" /> Controle
                    </button>
                    <button 
                        onClick={() => setRewardsSubTab('reward_room')}
                        className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${rewardsSubTab === 'reward_room' ? 'bg-steam-highlight text-steam-dark' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Zap className="w-3.5 h-3.5" /> Sala de Recompensas
                    </button>
                    <button 
                        onClick={() => setRewardsSubTab('store')}
                        className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${rewardsSubTab === 'store' ? 'bg-steam-highlight text-steam-dark' : 'text-gray-500 hover:text-white'}`}
                    >
                        <ShoppingBag className="w-3.5 h-3.5" /> Loja
                    </button>
                 </div>
              </header>

              {rewardsSubTab === 'control' && (
                <div className="animate-fade-in max-w-4xl">
                   <div className="bg-steam-dark p-8 rounded-[40px] border border-transparent shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><MonitorCheck className="w-40 h-40 text-steam-highlight" /></div>
                      
                      <div className="flex items-center gap-4 mb-10">
                        <div className="p-3 bg-steam-highlight/10 rounded-2xl border border-transparent">
                           <MonitorCheck className="w-8 h-8 text-steam-highlight" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Visibilidade de Funções</h3>
                           <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Habilite ou desative abas da barra lateral em tempo real</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                         <FeatureToggle 
                            label="Catálogo de Desafios" 
                            icon={<Star className="w-6 h-6" />} 
                            enabled={systemSettings.isCatalogEnabled} 
                            onToggle={() => updateSystemSettings({ isCatalogEnabled: !systemSettings.isCatalogEnabled })}
                         />
                         <FeatureToggle 
                            label="Sua Biblioteca" 
                            icon={<Library className="w-6 h-6" />} 
                            enabled={systemSettings.isLibraryEnabled} 
                            onToggle={() => updateSystemSettings({ isLibraryEnabled: !systemSettings.isLibraryEnabled })}
                         />
                         <FeatureToggle 
                            label="Favoritos" 
                            icon={<Heart className="w-6 h-6" />} 
                            enabled={systemSettings.isFavoritesEnabled} 
                            onToggle={() => updateSystemSettings({ isFavoritesEnabled: !systemSettings.isFavoritesEnabled })}
                         />
                         <FeatureToggle 
                            label="Módulo de Lives" 
                            icon={<Radio className="w-6 h-6" />} 
                            enabled={systemSettings.isLivesEnabled} 
                            onToggle={() => updateSystemSettings({ isLivesEnabled: !systemSettings.isLivesEnabled })}
                         />
                         <FeatureToggle 
                            label="Eventos" 
                            icon={<Calendar className="w-6 h-6" />} 
                            enabled={systemSettings.isEventsEnabled} 
                            onToggle={() => updateSystemSettings({ isEventsEnabled: !systemSettings.isEventsEnabled })}
                         />
                         <FeatureToggle 
                            label="Extras e Ester egg" 
                            icon={<Zap className="w-6 h-6" />} 
                            enabled={systemSettings.isExtrasEnabled} 
                            onToggle={() => updateSystemSettings({ isExtrasEnabled: !systemSettings.isExtrasEnabled })}
                         />
                         <FeatureToggle 
                            label="Loja" 
                            icon={<ShoppingBag className="w-6 h-6" />} 
                            enabled={systemSettings.isStoreEnabled} 
                            onToggle={() => updateSystemSettings({ isStoreEnabled: !systemSettings.isStoreEnabled })}
                         />
                      </div>

                      <div className="mt-12 p-6 bg-gradient-to-r from-steam-highlight/10 to-transparent rounded-2xl border border-transparent flex items-center gap-4">
                         <Info className="w-6 h-6 text-steam-highlight shrink-0" />
                         <p className="text-xs text-gray-300 font-medium italic">
                            Ocultar um módulo remove o acesso visual dos usuários, mas não exclui as informações vinculadas a ele no banco de dados.
                         </p>
                      </div>
                   </div>
                </div>
              )}

              {rewardsSubTab === 'reward_room' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    <div className="lg:col-span-2 space-y-6">
                        <form onSubmit={handleSaveRewardSettings} className="space-y-6 bg-steam-dark p-8 rounded-3xl border border-transparent">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3 text-steam-highlight">
                                    <Zap className="w-5 h-5" />
                                    <h3 className="font-black uppercase tracking-widest text-xs">Parâmetros da Sala</h3>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => updateRewardSettings({ showAds: !rewardSettings.showAds })}
                                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${rewardSettings.showAds ? 'bg-yellow-500 text-steam-dark shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-white/10 text-gray-400'}`}
                                    >
                                        <Tv className="w-3.5 h-3.5" />
                                        {rewardSettings.showAds ? 'Ads Patrocinados: ON' : 'Ads Patrocinados: OFF'}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => updateRewardSettings({ isActive: !rewardSettings.isActive })}
                                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${rewardSettings.isActive ? 'bg-steam-green text-steam-dark shadow-[0_0_15px_rgba(164,208,7,0.3)]' : 'bg-red-600 text-white'}`}
                                    >
                                        <Power className="w-3.5 h-3.5" />
                                        {rewardSettings.isActive ? 'Sistema Ativo' : 'Sistema Offline'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[9px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Pagamento por Clipe (R$)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            className="w-full bg-black/40 border border-transparent rounded-xl p-4 pl-10 text-white font-bold outline-none focus:border-steam-highlight"
                                            value={localRewardSettings.rewardAmount}
                                            onChange={e => setLocalRewardSettings({...localRewardSettings, rewardAmount: parseFloat(e.target.value)})}
                                        />
                                        <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-steam-green" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Cronômetro (Segundos)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            className="w-full bg-black/40 border border-transparent rounded-xl p-4 pl-10 text-white font-bold outline-none focus:border-steam-highlight"
                                            value={localRewardSettings.adDuration}
                                            onChange={e => setLocalRewardSettings({...localRewardSettings, adDuration: parseInt(e.target.value)})}
                                        />
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Título do Evento</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-black/40 border border-transparent rounded-xl p-4 text-white font-bold outline-none focus:border-steam-highlight"
                                    value={localRewardSettings.adTitle}
                                    onChange={e => setLocalRewardSettings({...localRewardSettings, adTitle: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="text-[9px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Instruções aos Caçadores</label>
                                <textarea 
                                    className="w-full bg-black/40 border border-transparent rounded-xl p-4 text-white font-bold outline-none focus:border-steam-highlight h-24 resize-none"
                                    value={localRewardSettings.adDescription}
                                    onChange={e => setLocalRewardSettings({...localRewardSettings, adDescription: e.target.value})}
                                />
                            </div>

                            <button type="submit" className="w-full bg-steam-highlight text-steam-dark py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3">
                                <Save className="w-4 h-4" /> Atualizar Algoritmo de Ganho
                            </button>
                        </form>

                        {rewardSettings.showAds && (
                            <div className="bg-yellow-500/5 border border-transparent p-8 rounded-3xl animate-pulse-slow">
                                <div className="flex items-center gap-3 text-yellow-500 mb-4">
                                    <Tv className="w-5 h-5" />
                                    <h3 className="font-black uppercase tracking-widest text-xs">Espaço Publicitário Ativo</h3>
                                </div>
                                <p className="text-[10px] text-yellow-500/60 font-black uppercase tracking-widest leading-relaxed">
                                    A Sala de Recompensas está configurada para exibir anúncios patrocinados. 
                                    Certifique-se de que os links de mídia estão atualizados no banco de dados.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-steam-highlight/10 to-transparent p-8 rounded-3xl border border-transparent">
                            <h3 className="font-black uppercase tracking-widest text-[9px] text-gray-400 mb-6 flex items-center gap-2"><BarChart2 className="w-3.5 h-3.5"/> Métricas de Fluxo</h3>
                            <div className="space-y-4">
                                <div className="bg-black/20 p-5 rounded-2xl border border-transparent">
                                    <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Pagamento Acumulado</div>
                                    <div className="text-2xl font-black text-steam-green leading-none">R$ 1.254,80</div>
                                </div>
                                <div className="bg-black/20 p-5 rounded-2xl border border-transparent">
                                    <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Audiência Atual (Média)</div>
                                    <div className="text-2xl font-black text-white leading-none">1.4k Visualizações</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-steam-dark p-8 rounded-3xl border border-transparent">
                            <h3 className="font-black uppercase tracking-widest text-[9px] text-gray-400 mb-6 flex items-center gap-2"><Trophy className="w-3.5 h-3.5"/> Elite da Sala</h3>
                            <div className="space-y-3">
                                {users.slice(0, 4).map(u => (
                                    <div key={u.id} className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-transparent group">
                                        <div className="flex items-center gap-3">
                                            <img src={u.avatar || undefined} className="w-8 h-8 rounded-lg border border-transparent" />
                                            <div className="text-[10px] font-black text-gray-300 group-hover:text-white transition-colors uppercase truncate max-w-[80px]">{u.name}</div>
                                        </div>
                                        <span className="text-[10px] font-black text-steam-green">R$ {u.balance.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
              )}

              {rewardsSubTab === 'store' && (
                <div className="animate-fade-in space-y-8">
                   <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-transparent pb-8">
                      <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                          <ShoppingBag className="text-steam-highlight w-8 h-8" /> 
                          Gestão de Vitrine
                        </h2>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Ajuste preços, mídias e disponibilidade dos produtos</p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative group w-full sm:w-64">
                           <input 
                              type="text" 
                              placeholder="Pesquisar item..." 
                              className="w-full bg-black/40 border border-transparent rounded-xl p-3 pl-10 text-xs text-white font-bold outline-none focus:border-steam-highlight transition-all"
                              value={searchTerm}
                              onChange={e => setSearchTerm(e.target.value)}
                           />
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-steam-highlight" />
                        </div>
                        <button onClick={() => { setEditingStoreItem({ isActive: true, rarity: 'COMUM', type: 'WALLPAPER', price: 0, image: '' }); setShowStoreModal(true); }} className="bg-steam-green text-steam-dark px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl shadow-green-500/20 shrink-0">
                           <Plus className="w-5 h-5"/> Novo Produto
                        </button>
                      </div>
                   </header>
                   
                   {filteredStoreItems.length === 0 ? (
                      <div className="py-40 flex flex-col items-center justify-center text-center opacity-20 border-2 border-dashed border-transparent rounded-[40px]">
                         <ShoppingBag className="w-20 h-20 mb-6 text-gray-500" />
                         <p className="text-sm font-black uppercase tracking-[0.4em] text-white">Prateleira Vazia</p>
                         <p className="text-[10px] mt-2 uppercase font-bold text-gray-400">Nenhum item corresponde aos critérios de busca.</p>
                      </div>
                   ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredStoreItems.map(item => (
                           <div key={item.id} className="bg-steam-dark rounded-3xl border border-transparent overflow-hidden group hover:border-transparent transition-all shadow-2xl flex flex-col relative">
                              <div className="relative aspect-video overflow-hidden bg-black shadow-inner">
                                 {item.image && (item.image.endsWith('.mp4') || item.image.endsWith('.webm') || item.image.startsWith('data:video')) ? (
                                    <video 
                                      src={item.image || undefined} 
                                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                                      muted 
                                      loop 
                                      onMouseOver={e => {
                                        const playPromise = e.currentTarget.play();
                                        if (playPromise !== undefined) {
                                          playPromise.catch(() => {
                                            // Auto-play was prevented or interrupted
                                          });
                                        }
                                      }} 
                                      onMouseOut={e => { 
                                        e.currentTarget.pause(); 
                                        e.currentTarget.currentTime = 0; 
                                      }} 
                                    />
                                 ) : (
                                    <img src={item.image || "https://picsum.photos/seed/placeholder/400/225"} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt={item.name} />
                                 )}
                                 <div className="absolute top-4 left-4 flex gap-2">
                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest backdrop-blur-md border ${item.isActive ? 'bg-steam-green/20 text-steam-green border-transparent' : 'bg-red-500/20 text-red-500 border-transparent'}`}>
                                       {item.isActive ? 'Visível' : 'Oculto'}
                                    </span>
                                 </div>
                                 <div className="absolute top-4 right-4">
                                    <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black text-white uppercase tracking-widest border border-transparent">
                                       {item.rarity}
                                    </div>
                                 </div>
                              </div>
                              
                              <div className="p-6 flex-1 flex flex-col">
                                 <div className="flex justify-between items-start mb-4">
                                    <div>
                                       <h3 className="text-white font-black uppercase tracking-tight text-lg leading-none mb-1">{item.name}</h3>
                                       <div className="text-[9px] text-steam-highlight font-bold uppercase tracking-[0.2em]">{item.type}</div>
                                    </div>
                                    <div className="text-xl font-black text-steam-green">R$ {item.price.toFixed(2)}</div>
                                 </div>

                                 <div className="mt-auto pt-6 border-t border-transparent flex gap-3">
                                    <button 
                                       onClick={() => updateStoreItem({ ...item, isActive: !item.isActive })} 
                                       className={`p-3 rounded-2xl transition-all border flex-1 flex items-center justify-center gap-2 font-black uppercase text-[9px] tracking-widest ${item.isActive ? 'bg-white/5 text-gray-500 border-transparent hover:text-red-500 hover:border-red-500/30' : 'bg-steam-green/10 text-steam-green border-transparent hover:bg-steam-green hover:text-steam-dark'}`}
                                    >
                                       {item.isActive ? <><EyeOffIcon className="w-4 h-4" /> Pausar</> : <><EyeIcon className="w-4 h-4" /> Ativar</>}
                                    </button>
                                    <button 
                                       onClick={() => { setEditingStoreItem(item); setShowStoreModal(true); }} 
                                       className="p-3 bg-steam-highlight/10 text-steam-highlight border border-transparent hover:bg-steam-highlight hover:text-steam-dark rounded-2xl transition-all flex items-center justify-center gap-2 font-black uppercase text-[9px] tracking-widest flex-1"
                                    >
                                       <Edit2 className="w-4 h-4" /> Ajustar
                                    </button>
                                    <button 
                                       onClick={(e) => { 
                                          e.stopPropagation();
                                          showConfirm('Excluir este item da loja permanentemente?', () => {
                                             deleteStoreItem(item.id);
                                          });
                                       }} 
                                       className="p-3 text-red-500 border border-transparent hover:bg-red-500 hover:text-white rounded-2xl transition-all cursor-pointer"
                                    >
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                              </div>
                           </div>
                        ))}
                      </div>
                   )}
                </div>
              )}
           </div>
        )}

        {view.type === 'events_management' && (
                <div className="animate-fade-in space-y-8">
                   <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-transparent pb-8">
                      <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                          <Calendar className="text-steam-highlight w-8 h-8" /> 
                          Calendário de Temporadas
                        </h2>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Publique desafios globais e defina as premiações em massa</p>
                      </div>
                      <button onClick={() => { setEditingEv({ startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], rewardXp: 100, rewardBalance: 10 }); setShowEventModal(true); }} className="bg-steam-green text-steam-dark px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl shadow-green-500/20 shrink-0">
                         <Plus className="w-5 h-5"/> Novo Evento
                      </button>
                   </header>
                   
                   {events.length === 0 ? (
                      <div className="py-40 flex flex-col items-center justify-center text-center opacity-20 border-2 border-dashed border-transparent rounded-[40px]">
                         <Calendar className="w-20 h-20 mb-6 text-gray-500" />
                         <p className="text-sm font-black uppercase tracking-[0.4em] text-white">Prancheta Vazia</p>
                         <p className="text-[10px] mt-2 uppercase font-bold text-gray-400">Nenhuma temporada ativa ou agendada no momento.</p>
                      </div>
                   ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {events.map(ev => (
                           <div key={ev.id} className="bg-steam-dark rounded-3xl border border-transparent overflow-hidden group hover:border-steam-highlight/30 transition-all shadow-2xl flex flex-col relative">
                              <div className="relative aspect-[21/9] overflow-hidden bg-black shadow-inner">
                                 <img src={ev.banner || undefined} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt={ev.title} />
                                 <div className="absolute top-4 left-4 flex gap-2">
                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest backdrop-blur-md border ${ev.isActive ? 'bg-steam-green/20 text-steam-green border-transparent' : 'bg-red-500/20 text-red-500 border-transparent'}`}>
                                       {ev.isActive ? 'Em Produção' : 'Engavetado'}
                                    </span>
                                 </div>
                              </div>
                              
                              <div className="p-6 flex-1 flex flex-col">
                                 <div className="flex justify-between items-start mb-4">
                                    <div>
                                       <h3 className="text-white font-black uppercase tracking-tight text-lg leading-none mb-1">{ev.title}</h3>
                                       <div className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">{new Date(ev.startDate).toLocaleDateString()} - {new Date(ev.endDate).toLocaleDateString()}</div>
                                    </div>
                                 </div>

                                 <div className="mt-auto pt-6 border-t border-transparent flex gap-3">
                                    <button 
                                       onClick={() => updateEvent({ ...ev, isActive: !ev.isActive })} 
                                       className={`p-3 rounded-2xl transition-all border flex-1 flex items-center justify-center gap-2 font-black uppercase text-[9px] tracking-widest ${ev.isActive ? 'bg-white/5 text-gray-500 border-transparent hover:text-red-500' : 'bg-steam-green/10 text-steam-green border-transparent hover:bg-steam-green hover:text-steam-dark'}`}
                                    >
                                       {ev.isActive ? <><EyeOffIcon className="w-4 h-4" /> Desativar</> : <><EyeIcon className="w-4 h-4" /> Ativar</>}
                                    </button>
                                    <button 
                                       onClick={() => { setEditingEv(ev); setShowEventModal(true); }} 
                                       className="p-3 bg-steam-highlight/10 text-steam-highlight border border-transparent hover:bg-steam-highlight hover:text-steam-dark rounded-2xl transition-all flex items-center justify-center gap-2 font-black uppercase text-[9px] tracking-widest flex-1"
                                    >
                                       <Edit2 className="w-4 h-4" /> Editar
                                    </button>
                                    <button 
                                       onClick={(e) => { 
                                          e.stopPropagation();
                                          showConfirm('Deseja excluir este evento permanentemente?', () => {
                                             deleteEvent(ev.id);
                                          });
                                       }} 
                                       className="p-3 text-red-500 border border-transparent hover:bg-red-500 hover:text-white rounded-2xl transition-all cursor-pointer"
                                    >
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                              </div>
                           </div>
                        ))}
                      </div>
                   )}
                </div>
        )}

        {view.type === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
                <div className="bg-steam-dark p-8 rounded-2xl border border-transparent shadow-xl"><div className="text-4xl font-black text-white mb-1">{games.length}</div><div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Jogos Ativos</div></div>
                <div className="bg-steam-dark p-8 rounded-2xl border border-transparent shadow-xl"><div className="text-4xl font-black text-steam-highlight mb-1">{achievements.length}</div><div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Conquistas Totais</div></div>
                <div className="bg-steam-dark p-8 rounded-2xl border border-transparent shadow-xl"><div className="text-4xl font-black text-steam-green mb-1">{feedbacks.length}</div><div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Dicas da Comunidade</div></div>
                <div className="bg-steam-dark p-8 rounded-2xl border border-transparent shadow-xl"><div className="text-4xl font-black text-red-500 mb-1">{pendingValidations.length}</div><div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Pendências</div></div>
            </div>
        )}

        {view.type === 'feedbacks' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center mb-8 border-b border-transparent pb-6">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Moderação de Comentários</h2>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Gerencie a integridade das dicas da comunidade</p>
                    </div>
                </div>

                {feedbacks.length === 0 ? (
                    <div className="py-40 flex flex-col items-center justify-center text-center opacity-20 border-2 border-dashed border-transparent rounded-2xl">
                        <MessageSquare className="w-20 h-20 mb-6" />
                        <p className="text-sm font-black uppercase tracking-[0.4em]">Silêncio na Central</p>
                        <p className="text-xs mt-2 uppercase">Ninguém comentou nada ainda.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {feedbacks.map(fb => {
                            const ach = achievements.find(a => a.id === fb.achievementId);
                            const game = games.find(g => g.id === ach?.gameId);
                            
                            return (
                                <div key={fb.id} className="bg-steam-dark p-6 rounded-xl border border-transparent flex gap-6 hover:border-steam-highlight/30 transition-all group relative">
                                    <img src={fb.userAvatar || undefined} className="w-12 h-12 rounded-lg border border-transparent shrink-0 cursor-pointer" alt={fb.userName} onClick={() => onViewUserProfile(fb.userId)} />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="font-black text-white uppercase text-xs tracking-tight hover:text-steam-highlight cursor-pointer" onClick={() => onViewUserProfile(fb.userId)}>{fb.userName}</div>
                                                <div className="text-[9px] text-steam-highlight font-black uppercase tracking-widest mt-0.5">
                                                    Em: {ach?.name || 'Conquista Excluída'} • {game?.title || 'Jogo Excluído'}
                                                </div>
                                            </div>
                                            <div className="text-[9px] text-gray-500 font-bold uppercase">{new Date(fb.timestamp).toLocaleString()}</div>
                                        </div>
                                        <p className="text-gray-300 text-sm italic font-medium leading-relaxed">"{fb.comment}"</p>
                                    </div>
                                    <div className="flex items-center pl-4 border-l border-transparent">
                                        <button 
                                            onClick={() => {
                                                showConfirm('Deseja excluir este comentário permanentemente?', () => {
                                                    deleteFeedback(fb.id);
                                                    showToast("Comentário removido.", "info");
                                                });
                                            }}
                                            className="p-3 text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                            title="Remover Comentário"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        )}

        {view.type === 'database' && (
            <div className="space-y-8 animate-fade-in">
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3"><Database className="text-steam-highlight" /> Gestão de Arquivos e Migração</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-steam-dark p-10 rounded-2xl border border-transparent text-center shadow-xl flex flex-col">
                        <Download className="w-12 h-12 text-steam-highlight mx-auto mb-4" />
                        <h3 className="font-bold text-white mb-2 uppercase text-[10px] tracking-widest">Exportar Backup</h3>
                        <p className="text-[9px] text-gray-500 uppercase mb-4">Gera um arquivo JSON com todos os dados atuais do Firebase.</p>
                        <button onClick={handleExportDB} className="w-full bg-steam-highlight text-steam-dark font-black uppercase tracking-widest text-[10px] py-4 rounded-xl mt-auto">Download JSON</button>
                    </div>
                    <div className="bg-steam-dark p-10 rounded-2xl border border-transparent text-center shadow-xl flex flex-col">
                        <Upload className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                        <h3 className="font-bold text-white mb-2 uppercase text-[10px] tracking-widest">Importar Backup</h3>
                        <p className="text-[9px] text-gray-500 uppercase mb-4">Carrega dados de um JSON diretamente para o Firestore.</p>
                        <label className="w-full bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl mt-auto block cursor-pointer">
                            Upload JSON
                            <input type="file" className="hidden" accept=".json" onChange={handleImportDB} />
                        </label>
                    </div>
                    <div className="bg-steam-dark p-10 rounded-2xl border border-transparent text-center shadow-xl flex flex-col">
                        <Zap className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                        <h3 className="font-bold text-white mb-2 uppercase text-[10px] tracking-widest">Popular Banco</h3>
                        <p className="text-[9px] text-gray-500 uppercase mb-4">Adiciona jogos e conquistas de exemplo para testes.</p>
                        <button onClick={handleSeedDB} className="w-full bg-yellow-500 text-steam-dark font-black uppercase tracking-widest text-[10px] py-4 rounded-xl mt-auto">Seed Database</button>
                    </div>
                    <div className="bg-steam-dark p-10 rounded-2xl border border-transparent text-center shadow-xl flex flex-col">
                        <RotateCcw className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="font-bold text-white mb-2 uppercase text-[10px] tracking-widest">Limpar Tudo</h3>
                        <p className="text-[9px] text-gray-500 uppercase mb-4">CUIDADO: Apaga permanentemente os dados do Firebase.</p>
                        <button 
                          onClick={() => { 
                            showConfirm("Deseja apagar TODOS os dados do Firebase? Esta ação é irreversível.", async () => {
                              setIsSaving(true);
                              try {
                                const batch = writeBatch(db);
                                games.forEach(g => batch.delete(doc(db, 'games', g.id)));
                                achievements.forEach(a => batch.delete(doc(db, 'achievements', a.id)));
                                feedbacks.forEach(f => batch.delete(doc(db, 'feedbacks', f.id)));
                                storeItems.forEach(s => batch.delete(doc(db, 'storeItems', s.id)));
                                events.forEach(e => batch.delete(doc(db, 'events', e.id)));
                                await batch.commit();
                                localStorage.clear();
                                showToast("Banco de dados limpo com sucesso!", "success");
                              } catch (err) {
                                showToast("Erro ao limpar banco.", "error");
                              } finally {
                                setIsSaving(false);
                              }
                            });
                          }} 
                          className="w-full bg-red-600 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl mt-auto"
                        >
                          Wipe All Data
                        </button>
                    </div>
                </div>
            </div>
        )}

        {view.type === 'design' && (
          <div className="animate-fade-in max-w-4xl">
            <header className="mb-8 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                  <Layout className="w-8 h-8 text-steam-highlight" /> Customização do Projeto
                </h2>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2">Modifique as cores e o estilo visual da plataforma.</p>
              </div>
              {pendingSettings && (
                <div className="flex gap-4 animate-scale-in">
                  <button 
                    onClick={() => setPendingSettings(null)}
                    className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 font-black uppercase tracking-widest text-[10px] hover:text-white transition-all"
                  >
                    Descartar
                  </button>
                  <button 
                    onClick={() => {
                      showConfirm("Deseja aplicar estas alterações visuais para todos os usuários?", () => {
                        updateSystemSettings(pendingSettings);
                        setPendingSettings(null);
                      });
                    }}
                    className="px-8 py-3 rounded-xl bg-steam-highlight text-steam-dark font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20 hover:bg-white transition-all"
                  >
                    Aplicar Alterações
                  </button>
                </div>
              )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-steam-dark p-8 rounded-3xl border border-transparent space-y-6">
                <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-transparent pb-4">Cores do Tema</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Cor Primária (Destaque)</label>
                    <div className="flex gap-3">
                      <input 
                        type="color" 
                        value={pendingSettings?.primaryColor || systemSettings.primaryColor || '#66c0f4'} 
                        onChange={(e) => setPendingSettings({ ...pendingSettings, primaryColor: e.target.value })}
                        className="w-12 h-12 bg-transparent border-none cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={pendingSettings?.primaryColor || systemSettings.primaryColor || '#66c0f4'} 
                        onChange={(e) => setPendingSettings({ ...pendingSettings, primaryColor: e.target.value })}
                        className="flex-1 bg-black/40 border border-transparent rounded-xl px-4 text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Cor de Fundo (Base)</label>
                    <div className="flex gap-3">
                      <input 
                        type="color" 
                        value={pendingSettings?.secondaryColor || systemSettings.secondaryColor || '#1b2838'} 
                        onChange={(e) => setPendingSettings({ ...pendingSettings, secondaryColor: e.target.value })}
                        className="w-12 h-12 bg-transparent border-none cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={pendingSettings?.secondaryColor || systemSettings.secondaryColor || '#1b2838'} 
                        onChange={(e) => setPendingSettings({ ...pendingSettings, secondaryColor: e.target.value })}
                        className="flex-1 bg-black/40 border border-transparent rounded-xl px-4 text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Cor de Acento</label>
                    <div className="flex gap-3">
                      <input 
                        type="color" 
                        value={pendingSettings?.accentColor || systemSettings.accentColor || '#c7d5e0'} 
                        onChange={(e) => setPendingSettings({ ...pendingSettings, accentColor: e.target.value })}
                        className="w-12 h-12 bg-transparent border-none cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={pendingSettings?.accentColor || systemSettings.accentColor || '#c7d5e0'} 
                        onChange={(e) => setPendingSettings({ ...pendingSettings, accentColor: e.target.value })}
                        className="flex-1 bg-black/40 border border-transparent rounded-xl px-4 text-xs font-mono text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-steam-dark p-8 rounded-3xl border border-transparent space-y-6">
                <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-transparent pb-4">Estilo e Tipografia</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Arredondamento de Bordas ({pendingSettings?.borderRadius || systemSettings.borderRadius || '12px'})</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="40" 
                      step="2"
                      value={parseInt(pendingSettings?.borderRadius || systemSettings.borderRadius || '12px')} 
                      onChange={(e) => setPendingSettings({ ...pendingSettings, borderRadius: `${e.target.value}px` })}
                      className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-steam-highlight"
                    />
                    <div className="flex justify-between text-[8px] text-gray-600 font-black mt-2">
                      <span>QUADRADO</span>
                      <span>MUITO REDONDO</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Fonte do Sistema</label>
                    <select 
                      value={pendingSettings?.fontFamily || systemSettings.fontFamily || 'Inter'} 
                      onChange={(e) => setPendingSettings({ ...pendingSettings, fontFamily: e.target.value })}
                      className="w-full bg-black/40 border border-transparent rounded-xl p-4 text-xs text-white outline-none focus:border-steam-highlight"
                    >
                      <option value="Inter">Inter (Padrão Moderno)</option>
                      <option value="'JetBrains Mono'">JetBrains Mono (Tech/Geek)</option>
                      <option value="'Space Grotesk'">Space Grotesk (Futurista)</option>
                      <option value="system-ui">Sistema (Nativo)</option>
                      <option value="serif">Serifada (Clássica)</option>
                      {(pendingSettings?.customFonts || systemSettings.customFonts || []).map(font => (
                        <option key={font.name} value={font.name}>{font.name} (Customizada)</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Fontes Customizadas</label>
                      <button 
                        onClick={() => fontFileInputRef.current?.click()}
                        className="p-2 bg-steam-highlight/10 text-steam-highlight rounded-lg hover:bg-steam-highlight hover:text-steam-dark transition-all"
                        title="Fazer upload de fonte (.ttf, .woff, .woff2)"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <input 
                        type="file" 
                        ref={fontFileInputRef} 
                        className="hidden" 
                        accept=".ttf,.woff,.woff2" 
                        onChange={handleFontUpload} 
                      />
                    </div>

                    <div className="space-y-2">
                      {(pendingSettings?.customFonts || systemSettings.customFonts || []).map((font, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-transparent group">
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-4 h-4 text-gray-500" />
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-tight">{font.name}</span>
                          </div>
                          <button 
                            onClick={() => {
                              const currentFonts = pendingSettings?.customFonts || systemSettings.customFonts || [];
                              const updatedFonts = currentFonts.filter((_, i) => i !== idx);
                              setPendingSettings({ ...pendingSettings, customFonts: updatedFonts });
                            }}
                            className="p-1.5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {(pendingSettings?.customFonts || systemSettings.customFonts || []).length === 0 && (
                        <div className="text-center py-4 border-2 border-dashed border-white/5 rounded-xl">
                          <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Nenhuma fonte customizada</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-black/20 rounded-2xl border border-transparent">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Pré-visualização:</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded shadow-lg" style={{ backgroundColor: pendingSettings?.primaryColor || systemSettings.primaryColor || '#66c0f4' }}></div>
                      <div className="space-y-1">
                        <div className="h-2 w-24 bg-white/20 rounded"></div>
                        <div className="h-2 w-16 bg-white/10 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-steam-highlight/10 border border-transparent rounded-3xl flex items-center gap-4">
              <Info className="w-6 h-6 text-steam-highlight shrink-0" />
              <p className="text-[10px] text-steam-highlight font-bold uppercase tracking-widest leading-relaxed">
                As alterações de design são aplicadas globalmente para todos os usuários em tempo real. Algumas mudanças podem exigir o recarregamento da página para serem totalmente processadas em todos os componentes.
              </p>
            </div>
          </div>
        )}

        {view.type === 'games' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-black text-white uppercase tracking-tight">Biblioteca Manual</h2>
                   <button onClick={() => { setEditingGame({}); setShowGameModal(true); }} className="bg-steam-green text-steam-dark px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all"><Plus className="w-4 h-4"/> Adicionar Jogo</button>
                </div>
                {games.length === 0 ? (
                    <div className="py-20 text-center opacity-20 border-2 border-dashed border-transparent rounded-2xl uppercase font-black text-[10px] tracking-[0.4em]">Nenhum jogo cadastrado.</div>
                ) : (
                    <div className="grid gap-4">
                    {games.map(game => (
                        <div key={game.id} className="bg-steam-dark p-5 rounded-xl border border-transparent flex items-center gap-6 hover:border-steam-highlight/30 transition-all group shadow-md">
                            <img 
                              src={game.coverUrl || undefined} 
                              className="w-12 h-16 object-cover rounded border border-transparent" 
                              style={{ objectPosition: game.coverPosition || 'center' }}
                            />
                            <div className="flex-1">
                                <h3 className="font-black text-white text-lg tracking-tight uppercase leading-none mb-1">{game.title}</h3>
                                <p className="text-[10px] text-steam-highlight font-black uppercase tracking-widest">{game.publisher} • {achievements.filter(a => a.gameId === game.id).length} Conquistas</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setView({ type: 'achievements', gameId: game.id })} className="px-4 py-2 bg-steam-light text-white text-[10px] font-black uppercase rounded hover:bg-steam-highlight hover:text-steam-dark transition-all">Troféus</button>
                                <button onClick={() => { setEditingGame(game); setShowGameModal(true); }} className="p-2 text-steam-highlight hover:bg-steam-highlight/10 rounded"><Edit2 className="w-4 h-4" /></button>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        showConfirm(`Excluir "${game.title}" e todas as suas conquistas?`, () => {
                                            deleteGame(game.id);
                                        });
                                    }} 
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded cursor-pointer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    </div>
                )}
            </div>
        )}

        {view.type === 'achievements' && (
             <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-6 mb-8 border-b border-transparent pb-6">
                    <button onClick={() => setView({ type: 'games' })} className="p-2 bg-white/5 rounded hover:bg-steam-highlight hover:text-steam-dark transition-all"><ArrowLeft className="w-4 h-4" /></button>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">{games.find(g => g.id === (view as any).gameId)?.title}</h2>
                    <div className="flex gap-2 ml-auto">
                        <button 
                            onClick={() => importAchievementsFromSteam((view as any).gameId)} 
                            className="bg-white/5 text-steam-highlight border border-steam-highlight/30 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-steam-highlight/10 transition-all"
                        >
                            <Download className="w-4 h-4"/> Importar da Steam
                        </button>
                        <button onClick={() => { setEditingAchievement({}); setShowAchievementModal(true); }} className="bg-steam-highlight text-steam-dark px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Plus className="w-4 h-4"/> Nova Conquista</button>
                    </div>
                </div>
                <div className="grid gap-3">
                   {achievements.filter(a => a.gameId === (view as any).gameId).map(ach => (
                      <div key={ach.id} className="bg-steam-dark p-4 rounded-xl border border-transparent flex items-center gap-5 hover:border-steam-highlight/30 transition-all">
                         <RenderAchIcon icon={ach.icon} className="w-12 h-12" />
                         <div className="flex-1">
                            {/* Fixed typo 'achach' to 'ach' */}
                            <h3 className="font-black text-white uppercase tracking-tight leading-none mb-1">{ach.name}</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">{ach.difficulty} • {ach.xp} XP</p>
                         </div>
                         <div className="flex gap-2">
                            <button onClick={() => { setEditingAchievement(ach); setShowAchievementModal(true); }} className="p-2 text-steam-highlight"><Edit2 className="w-4 h-4" /></button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    showConfirm(`Deseja excluir a conquista "${ach.name}"?`, () => {
                                        deleteAchievement(ach.id);
                                    });
                                }} 
                                className="p-2 text-red-500 cursor-pointer"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                      </div>
                   ))}
                </div>
            </div>
        )}

        {view.type === 'users' && (
            <div className="space-y-6 animate-fade-in">
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Gestão de Usuários</h2>
                <div className="grid gap-3">
                    {users.map(u => (
                        <div key={u.id} className="bg-steam-dark p-4 rounded-xl border border-transparent flex items-center gap-4 group shadow-md">
                            <div className="flex items-center gap-4 flex-1 cursor-pointer group/info" onClick={() => onViewUserProfile(u.id)}>
                                <img src={u.avatar || undefined} className="w-10 h-10 rounded border border-transparent object-cover group-hover/info:border-steam-highlight transition-all" />
                                <div className="flex-1">
                                    <div className="font-bold text-white uppercase text-xs flex items-center gap-2 group-hover/info:text-steam-highlight transition-colors">
                                        {u.name} 
                                        {u.isAdmin && ( <span className="text-red-500 text-[8px] font-black bg-red-500/10 px-2 py-0.5 rounded border border-transparent uppercase tracking-widest">SUB-ADMIN</span> )}
                                        {u.isVip && ( 
                                            <span className="text-yellow-500 text-[8px] font-black bg-yellow-500/10 px-2 py-0.5 rounded border border-transparent uppercase tracking-widest flex flex-col items-center gap-0.5">
                                                <span className="flex items-center gap-1"><Gem className="w-2 h-2"/> VIP</span>
                                                {u.vipUntil && <span className="text-[6px] opacity-60">Até {new Date(u.vipUntil).toLocaleDateString()}</span>}
                                            </span> 
                                        )}
                                    </div>
                                    <div className="text-[10px] text-gray-500">{u.email}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 relative">
                                <button onClick={() => onViewUserProfile(u.id)} className="p-2 text-gray-400 hover:text-steam-highlight hover:bg-steam-highlight/10 rounded transition-all"><Eye className="w-4 h-4" /></button>
                                <div className="relative">
                                    <button 
                                        onClick={() => u.isVip ? toggleVipUser(u.id) : setVipSelectionUserId(vipSelectionUserId === u.id ? null : u.id)} 
                                        className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${u.isVip ? 'bg-yellow-500/20 text-yellow-500' : 'bg-gray-500/20 text-gray-400'}`}
                                    >
                                        {u.isVip ? "Remover VIP" : "Dar VIP"}
                                    </button>
                                    
                                    {vipSelectionUserId === u.id && !u.isVip && (
                                        <div className="absolute top-full right-0 mt-2 bg-steam-dark border border-transparent rounded-xl shadow-2xl p-3 z-50 flex flex-col gap-2 min-w-[120px] animate-scale-in">
                                            <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1 text-center">Prazo VIP</div>
                                            <button onClick={() => { toggleVipUser(u.id, 1); setVipSelectionUserId(null); }} className="px-3 py-2 bg-white/5 hover:bg-steam-highlight hover:text-steam-dark rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">1 Mês</button>
                                            <button onClick={() => { toggleVipUser(u.id, 3); setVipSelectionUserId(null); }} className="px-3 py-2 bg-white/5 hover:bg-steam-highlight hover:text-steam-dark rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">3 Meses</button>
                                            <button onClick={() => { toggleVipUser(u.id, 12); setVipSelectionUserId(null); }} className="px-3 py-2 bg-white/5 hover:bg-steam-highlight hover:text-steam-dark rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">1 Ano</button>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => toggleAdminUser(u.id)} className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${u.isAdmin ? 'bg-red-600/20 text-red-400' : 'bg-steam-highlight/20 text-steam-highlight'}`}>{u.isAdmin ? "Rebaixar" : "Promover Sub-Admin"}</button>
                                <button onClick={() => handleAddFunds(u.id)} className="px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all bg-steam-green/20 text-steam-green hover:bg-steam-green/30">
                                    <Coins className="w-3 h-3" /> Adicionar Saldo
                                </button>
                                <button onClick={() => toggleBanUser(u.id)} className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${u.isBanned ? 'bg-steam-green/20 text-steam-green' : 'bg-red-600/20 text-red-400'}`}>{u.isBanned ? 'Ativar' : 'Banir'}</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {view.type === 'notifications' && (
          <div className="animate-fade-in max-w-4xl">
            <header className="mb-8 flex justify-between items-center border-b border-transparent pb-6">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                  <Mail className="text-steam-highlight w-8 h-8" /> 
                  Notificações Gerais
                </h2>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Envie comunicados para todos os usuários da plataforma</p>
              </div>
              <button 
                onClick={() => setShowNotificationModal(true)}
                className="bg-steam-highlight text-steam-dark px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl shadow-blue-500/20"
              >
                <Plus className="w-5 h-5"/> Nova Notificação
              </button>
            </header>

            <div className="bg-steam-dark p-8 rounded-[40px] border border-transparent shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><Mail className="w-40 h-40 text-steam-highlight" /></div>
              
              <div className="flex items-center gap-4 mb-10">
                <div className="p-3 bg-steam-highlight/10 rounded-2xl border border-transparent">
                  <Info className="w-8 h-8 text-steam-highlight" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Histórico de Envios</h3>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Mensagens transmitidas recentemente</p>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                {/* We would fetch and list notifications here if we had a list endpoint, 
                    for now we just show the creation UI as requested */}
                <div className="py-20 text-center opacity-20 border-2 border-dashed border-transparent rounded-[40px]">
                  <Mail className="w-20 h-20 mb-6 text-gray-500 mx-auto" />
                  <p className="text-sm font-black uppercase tracking-[0.4em] text-white">Nenhuma Notificação Enviada</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {view.type === 'levels' && (
          <div className="animate-fade-in max-w-6xl">
            <header className="mb-8 flex justify-between items-center border-b border-transparent pb-6">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                  <BarChart2 className="text-steam-highlight w-8 h-8" /> 
                  Configuração de Níveis
                </h2>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Gerencie a progressão de XP e patentes dos usuários</p>
              </div>
              <button 
                onClick={() => { setEditingLevel({ name: '', minXp: 0 }); setShowLevelModal(true); }}
                className="bg-steam-highlight text-steam-dark px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl shadow-blue-500/20"
              >
                <Plus className="w-5 h-5"/> Novo Nível
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {levels.map((lvl) => (
                <div key={lvl.id} className="bg-steam-dark p-6 rounded-[32px] border border-transparent hover:border-steam-highlight/30 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                    <Zap className="w-20 h-20 text-steam-highlight" />
                  </div>
                  
                  <div className="flex justify-between items-start mb-6">
                    <div className="px-3 py-1 bg-steam-highlight/10 rounded-full border border-transparent">
                      <span className="text-[9px] font-black text-steam-highlight uppercase tracking-widest">XP Mínimo: {lvl.minXp}</span>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => { setEditingLevel(lvl); setShowLevelModal(true); }} className="p-2 bg-white/5 rounded-lg hover:bg-steam-highlight hover:text-steam-dark transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                       <button onClick={() => showConfirm(`Deseja excluir o nível "${lvl.name}"?`, () => deleteLevel(lvl.id))} className="p-2 bg-white/5 rounded-lg hover:bg-red-600 hover:text-white transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4 italic">{lvl.name}</h3>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Preview Tag:</div>
                    <div className="px-3 py-1 bg-steam-highlight/20 rounded border border-transparent">
                       <span className="text-[10px] font-black text-steam-highlight uppercase italic tracking-tighter">{lvl.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL JOGO */}
      {showGameModal && (
         <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] p-4 backdrop-blur-md">
            <div className="bg-[#1b2838] p-8 rounded-2xl w-full max-w-md border border-transparent shadow-5xl max-h-[90vh] overflow-y-auto custom-scrollbar">
               <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tight">Dados do Jogo</h3>
               <form onSubmit={async (e) => { e.preventDefault(); if (!editingGame || isSaving) return; setIsSaving(true); try { if (editingGame.id) { await updateGame(editingGame as Game); showToast("Jogo atualizado.", "success"); } else { await addGame({ ...editingGame, id: `g_${Date.now()}`, totalAchievements: 0, isActive: true } as Game); showToast("Novo jogo cadastrado.", "success"); } setShowGameModal(false); setEditingGame(null); } catch (err) { showToast("Falha ao salvar.", "error"); } finally { setIsSaving(false); } }} className="space-y-4">
                  <div><label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Título</label><input className="w-full bg-[#171a21] border border-transparent rounded-lg p-3 text-white text-sm outline-none focus:border-steam-highlight" value={editingGame?.title || ''} onChange={e => setEditingGame({...editingGame, title: e.target.value})} required disabled={isSaving} /></div>
                  <div><label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Editora</label><input className="w-full bg-[#171a21] border border-transparent rounded-lg p-3 text-white text-sm outline-none focus:border-steam-highlight" value={editingGame?.publisher || ''} onChange={e => setEditingGame({...editingGame, publisher: e.target.value})} required disabled={isSaving} /></div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Capa (URL ou Upload)</label>
                    <div className="flex gap-2">
                      <input className="flex-1 bg-[#171a21] border border-transparent rounded-lg p-3 text-white text-[10px] truncate outline-none focus:border-steam-highlight" value={editingGame?.coverUrl || ''} onChange={e => setEditingGame({...editingGame, coverUrl: e.target.value})} placeholder="URL da Capa" disabled={isSaving} />
                      <button type="button" onClick={() => gameCoverFileInputRef.current?.click()} className="bg-steam-highlight text-steam-dark p-3 rounded-lg"><Upload className="w-4 h-4"/></button>
                      <input type="file" ref={gameCoverFileInputRef} className="hidden" accept="image/*" onChange={e => handleGameFileUpload(e, 'coverUrl')} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Banner (URL ou Upload)</label>
                    <div className="flex gap-2">
                      <input className="flex-1 bg-[#171a21] border border-transparent rounded-lg p-3 text-white text-[10px] truncate outline-none focus:border-steam-highlight" value={editingGame?.bannerUrl || ''} onChange={e => setEditingGame({...editingGame, bannerUrl: e.target.value})} placeholder="URL do Banner" disabled={isSaving} />
                      <button type="button" onClick={() => gameBannerFileInputRef.current?.click()} className="bg-steam-highlight text-steam-dark p-3 rounded-lg"><Upload className="w-4 h-4"/></button>
                      <input type="file" ref={gameBannerFileInputRef} className="hidden" accept="image/*" onChange={e => handleGameFileUpload(e, 'bannerUrl')} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Posicionamento da Capa (Ex: center, top, 50% 20%)</label>
                    <input 
                      className="w-full bg-[#171a21] border border-transparent rounded-lg p-3 text-white text-sm outline-none focus:border-steam-highlight" 
                      value={editingGame?.coverPosition || ''} 
                      onChange={e => setEditingGame({...editingGame, coverPosition: e.target.value})} 
                      placeholder="center" 
                      disabled={isSaving} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Posicionamento do Banner (Ex: center, top, 50% 20%)</label>
                    <input 
                      className="w-full bg-[#171a21] border border-transparent rounded-lg p-3 text-white text-sm outline-none focus:border-steam-highlight" 
                      value={editingGame?.bannerPosition || ''} 
                      onChange={e => setEditingGame({...editingGame, bannerPosition: e.target.value})} 
                      placeholder="center" 
                      disabled={isSaving} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Steam AppID (Opcional)</label>
                    <input 
                      className="w-full bg-[#171a21] border border-transparent rounded-lg p-3 text-white text-sm outline-none focus:border-steam-highlight" 
                      value={editingGame?.steamAppId || ''} 
                      onChange={e => setEditingGame({...editingGame, steamAppId: e.target.value})} 
                      placeholder="Ex: 440 (Team Fortress 2)" 
                      disabled={isSaving} 
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                     <button type="button" onClick={() => setShowGameModal(false)} className="flex-1 bg-white/5 text-gray-400 font-black uppercase text-[10px] py-3 rounded-lg" disabled={isSaving}>Cancelar</button>
                     <button type="submit" className="flex-1 bg-steam-highlight text-steam-dark font-black uppercase text-[10px] py-3 rounded-lg flex items-center justify-center gap-2" disabled={isSaving}>{isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}{isSaving ? 'Salvando...' : 'Gravar Jogo'}</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* MODAL CONQUISTA */}
      {showAchievementModal && (
         <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] p-4 backdrop-blur-md">
            <div className="bg-[#1b2838] p-8 rounded-2xl w-full max-w-md border border-transparent shadow-5xl">
               <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tight">Dados da Conquista</h3>
               <form onSubmit={async (e) => { e.preventDefault(); if (!editingAchievement || isSaving) return; setIsSaving(true); const gId = view.type === 'achievements' ? view.gameId : (editingAchievement.gameId || ''); try { if (editingAchievement.id) { await updateAchievement(editingAchievement as Achievement); showToast("Conquista atualizada.", "success"); } else { await addAchievement({ ...editingAchievement, id: `ach_${Date.now()}`, gameId: gId, isHidden: editingAchievement.isHidden || false, difficulty: editingAchievement.difficulty || 'Médio', xp: editingAchievement.xp || 10, updatedAt: new Date().toISOString() } as Achievement); showToast("Conquista registrada.", "success"); } setShowAchievementModal(false); setEditingAchievement(null); } catch (err) { showToast("Erro ao gravar.", "error"); } finally { setIsSaving(false); } }} className="space-y-4">
                  <div><label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Nome</label><input className="w-full bg-[#171a21] border border-transparent rounded-lg p-3 text-white text-sm outline-none focus:border-steam-highlight" value={editingAchievement?.name || ''} onChange={e => setEditingAchievement({...editingAchievement, name: e.target.value})} required disabled={isSaving} /></div>
                  <div><label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Descrição</label><textarea className="w-full bg-[#171a21] border border-transparent rounded-lg p-3 text-white text-sm h-20 outline-none focus:border-steam-highlight" value={editingAchievement?.description || ''} onChange={e => setEditingAchievement({...editingAchievement, description: e.target.value})} required disabled={isSaving} /></div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Ícone (URL ou Upload)</label>
                    <div className="flex gap-2">
                      <input className="flex-1 bg-[#171a21] border border-transparent rounded-lg p-3 text-white text-sm outline-none focus:border-steam-highlight" value={editingAchievement?.icon || ''} onChange={e => setEditingAchievement({...editingAchievement, icon: e.target.value})} placeholder="URL ou Emoji" disabled={isSaving} />
                      <button type="button" onClick={() => achIconFileInputRef.current?.click()} className="bg-steam-highlight text-steam-dark p-3 rounded-lg"><Upload className="w-4 h-4"/></button>
                      <input type="file" ref={achIconFileInputRef} className="hidden" accept="image/*" onChange={handleAchFileUpload} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div><label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Dificuldade</label><select className="w-full bg-[#171a21] border border-transparent rounded-lg p-3 text-white text-xs outline-none" value={editingAchievement?.difficulty || 'Médio'} onChange={e => setEditingAchievement({...editingAchievement, difficulty: e.target.value as Difficulty})} disabled={isSaving}><option value="Fácil">Fácil</option><option value="Médio">Médio</option><option value="Difícil">Difícil</option><option value="Extremo">Extremo</option></select></div>
                     <div><label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">XP</label><input type="number" className="w-full bg-[#171a21] border border-transparent rounded-lg p-3 text-white text-sm outline-none focus:border-steam-highlight" value={editingAchievement?.xp || ''} onChange={e => setEditingAchievement({...editingAchievement, xp: Number(e.target.value)})} disabled={isSaving} /></div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Steam API Name (Opcional)</label>
                    <input 
                      className="w-full bg-[#171a21] border border-transparent rounded-lg p-3 text-white text-sm outline-none focus:border-steam-highlight" 
                      value={editingAchievement?.steamApiName || ''} 
                      onChange={e => setEditingAchievement({...editingAchievement, steamApiName: e.target.value})} 
                      placeholder="Ex: ACH_WIN_10_MATCHES" 
                      disabled={isSaving} 
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                     <button type="button" onClick={() => setShowAchievementModal(false)} className="flex-1 bg-white/5 text-gray-400 font-black uppercase text-[10px] py-3 rounded-lg" disabled={isSaving}>Voltar</button>
                     <button type="submit" className="flex-1 bg-steam-highlight text-steam-dark font-black uppercase text-[10px] py-3 rounded-lg flex items-center justify-center gap-2" disabled={isSaving}>{isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}{isSaving ? 'Gravando...' : 'Gravar Banco'}</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* MODAL PRODUTO LOJA (AJUSTES) */}
      {showStoreModal && (
         <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] p-4 backdrop-blur-md">
            <div className="bg-[#1b2838] p-8 rounded-2xl w-full max-w-md border border-transparent shadow-5xl max-h-[90vh] overflow-y-auto custom-scrollbar">
               <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-steam-highlight" />
                  {editingStoreItem?.id ? 'Ajustar Produto' : 'Novo Produto'}
               </h3>
               <form onSubmit={async (e) => { 
                  e.preventDefault(); 
                  if (!editingStoreItem || isSaving || uploadProgress !== null) return; 
                  
                  // Safety check: prevent sending massive base64 strings to the API
                  if (editingStoreItem.image && editingStoreItem.image.length > 1024 * 1024 * 2) { // 2MB limit for base64
                     if (editingStoreItem.image.startsWith('data:')) {
                        showToast("Erro: O arquivo é muito grande para salvar diretamente. O Turbo Upload deveria ter sido usado. Tente selecionar o arquivo novamente.", "error");
                        return;
                     }
                  }

                  setIsSaving(true); 
                  try { 
                     if (editingStoreItem.id) { 
                        await updateStoreItem(editingStoreItem as StoreItem); 
                        showToast("Ajustes salvos com sucesso.", "success"); 
                     } else { 
                        await addStoreItem({ ...editingStoreItem, id: `si_${Date.now()}` } as StoreItem); 
                        showToast("Novo produto registrado na vitrine.", "success"); 
                     } 
                     setShowStoreModal(false); 
                     setEditingStoreItem(null); 
                  } catch (err) { 
                     showToast("Falha técnica ao salvar ajustes.", "error"); 
                  } finally { 
                     setIsSaving(false); 
                  } 
               }} className="space-y-5">
                  
                  <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-transparent">
                     <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Disponibilidade</label>
                     <button 
                        type="button"
                        onClick={() => setEditingStoreItem({...editingStoreItem, isActive: !editingStoreItem?.isActive})}
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${editingStoreItem?.isActive ? 'bg-steam-green/20 text-steam-green border border-steam-green/30 shadow-[0_0_10px_rgba(164,208,7,0.2)]' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}
                     >
                        {editingStoreItem?.isActive ? 'Ativo na Loja' : 'Oculto / Pausado'}
                     </button>
                  </div>

                  <div>
                     <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Nome do Item</label>
                     <input className="w-full bg-[#171a21] border border-transparent rounded-xl p-3 text-white text-sm font-bold outline-none focus:border-steam-highlight" value={editingStoreItem?.name || ''} onChange={e => setEditingStoreItem({...editingStoreItem, name: e.target.value})} required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Tipo</label>
                        <select className="w-full bg-[#171a21] border border-transparent rounded-xl p-3 text-white text-xs font-bold outline-none cursor-pointer" value={editingStoreItem?.type || 'WALLPAPER'} onChange={e => setEditingStoreItem({...editingStoreItem, type: e.target.value as any})} disabled={isSaving}>
                           <option value="WALLPAPER">Fundo de Perfil</option>
                           <option value="AVATAR">Efeito de Avatar</option>
                           <option value="BOOSTER">Booster Especial</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Raridade</label>
                        <select className="w-full bg-[#171a21] border border-transparent rounded-xl p-3 text-white text-xs font-bold outline-none cursor-pointer" value={editingStoreItem?.rarity || 'COMUM'} onChange={e => setEditingStoreItem({...editingStoreItem, rarity: e.target.value as any})} disabled={isSaving}>
                           <option value="COMUM">Comum</option>
                           <option value="RARO">Raro</option>
                           <option value="ÉPICO">Épico</option>
                           <option value="LENDÁRIO">Lendário</option>
                        </select>
                     </div>
                  </div>

                  <div>
                     <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Valor de Venda (R$)</label>
                     <div className="relative">
                        <input type="number" step="0.01" className="w-full bg-[#171a21] border border-transparent rounded-xl p-3 pl-10 text-white text-sm font-black outline-none focus:border-steam-highlight" value={editingStoreItem?.price || ''} onChange={e => setEditingStoreItem({...editingStoreItem, price: parseFloat(e.target.value)})} required disabled={isSaving} />
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steam-green" />
                     </div>
                  </div>

                  <div>
                     <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Fonte Visual (URL ou Arquivo)</label>
                      <div className="flex gap-2">
                        <input className="flex-1 bg-[#171a21] border border-transparent rounded-xl p-3 text-white text-[10px] font-bold truncate outline-none focus:border-steam-highlight" value={editingStoreItem?.image || ''} onChange={e => setEditingStoreItem({...editingStoreItem, image: e.target.value})} placeholder="Link ou faça upload abaixo" disabled={isSaving || uploadProgress !== null} />
                        <button 
                           type="button" 
                           onClick={() => storeFileInputRef.current?.click()}
                           className="bg-steam-highlight text-steam-dark p-3 rounded-xl hover:scale-105 transition-all shadow-lg disabled:opacity-50"
                           disabled={isSaving || uploadProgress !== null}
                        >
                           {uploadProgress !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        </button>
                        <input type="file" ref={storeFileInputRef} className="hidden" accept="image/*,video/mp4,video/webm" onChange={handleStoreFileUpload} />
                     </div>
                     {uploadProgress !== null && (
                        <div className="mt-3 bg-black/40 rounded-full h-2 overflow-hidden border border-transparent">
                           <div 
                              className="bg-steam-highlight h-full transition-all duration-300 shadow-[0_0_10px_rgba(102,192,244,0.5)]" 
                              style={{ width: `${uploadProgress}%` }}
                           />
                           <div className="text-[7px] text-steam-highlight font-black uppercase mt-1 text-right tracking-widest">Enviando: {uploadProgress}%</div>
                        </div>
                     )}
                     <p className="text-[8px] text-gray-500 mt-2 uppercase font-black leading-tight italic">
                        Aceita arquivos locais (Upload) ou links diretos. 
                        <span className="text-steam-highlight block mt-1">Turbo Upload ativado para arquivos grandes!</span>
                     </p>
                  </div>

                  {editingStoreItem?.image && (
                     <div className="p-3 bg-black/40 rounded-xl border border-transparent flex flex-col items-center">
                        <label className="text-[8px] text-gray-600 font-black uppercase mb-2 tracking-widest">Prévia em Tempo Real</label>
                        <div className="w-full aspect-video rounded-lg overflow-hidden border border-transparent bg-black">
                           {editingStoreItem.image.endsWith('.mp4') || editingStoreItem.image.endsWith('.webm') || editingStoreItem.image.startsWith('data:video') ? (
                              <video 
                                src={editingStoreItem.image || undefined} 
                                className="w-full h-full object-cover" 
                                muted 
                                autoPlay 
                                loop 
                                playsInline 
                                onCanPlay={e => {
                                  const playPromise = e.currentTarget.play();
                                  if (playPromise !== undefined) {
                                    playPromise.catch(() => {});
                                  }
                                }}
                              />
                           ) : (
                              <img src={editingStoreItem.image || undefined} className="w-full h-full object-cover" alt="Preview" onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop")} />
                           )}
                        </div>
                     </div>
                  )}

                  <div className="flex gap-3 pt-4">
                     <button type="button" onClick={() => setShowStoreModal(false)} className="flex-1 bg-white/5 text-gray-400 font-black uppercase text-[10px] tracking-widest py-4 rounded-xl hover:bg-white/10 transition-all" disabled={isSaving || uploadProgress !== null}>Descartar</button>
                     <button type="submit" className="flex-1 bg-steam-highlight text-steam-dark font-black uppercase text-[10px] tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20" disabled={isSaving || uploadProgress !== null}>
                        {isSaving || uploadProgress !== null ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        {uploadProgress !== null ? `Enviando ${uploadProgress}%` : (isSaving ? 'Gravando...' : 'Aplicar Ajustes')}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* MODAL EVENTO (NOVO) */}
      {showEventModal && (
         <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] p-4 backdrop-blur-md">
            <div className="bg-[#1b2838] p-8 rounded-2xl w-full max-w-md border border-transparent shadow-5xl max-h-[90vh] overflow-y-auto custom-scrollbar">
               <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-yellow-500" />
                  {editingEv?.id ? 'Ajustar Temporada' : 'Novo Evento'}
               </h3>
               <form onSubmit={async (e) => { 
                  e.preventDefault(); 
                  if (!editingEv || isSaving || uploadProgress !== null) return; 

                  // Safety check: prevent sending massive base64 strings to the API
                  if (editingEv.banner && editingEv.banner.length > 1024 * 1024 * 2) { // 2MB limit for base64
                     if (editingEv.banner.startsWith('data:')) {
                        showToast("Erro: O arquivo é muito grande para salvar diretamente. O Turbo Upload deveria ter sido usado. Tente selecionar o arquivo novamente.", "error");
                        return;
                     }
                  }

                  setIsSaving(true); 
                  try { 
                     const data = { ...editingEv, id: editingEv.id || `ev_${Date.now()}`, isActive: editingEv.isActive ?? true } as GameEvent;
                     if (editingEv.id) { 
                        await updateEvent(data); 
                        showToast("Temporada atualizada.", "success"); 
                     } else { 
                        await addEvent(data); 
                        showToast("Nova temporada iniciada!", "success"); 
                     } 
                     setShowEventModal(false); 
                     setEditingEv(null); 
                  } catch (err) { 
                     showToast("Erro ao processar temporada.", "error"); 
                  } finally { 
                     setIsSaving(false); 
                  } 
               }} className="space-y-4">
                  <div>
                     <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Título</label>
                     <input className="w-full bg-[#171a21] border border-transparent rounded-xl p-3 text-white font-bold outline-none" value={editingEv?.title || ''} onChange={e => setEditingEv({...editingEv, title: e.target.value})} required />
                  </div>
                  <div>
                     <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Banner (Upload ou URL)</label>
                     <div className="flex gap-2">
                        <input className="flex-1 bg-[#171a21] border border-transparent rounded-xl p-3 text-white text-[10px]" value={editingEv?.banner || ''} onChange={e => setEditingEv({...editingEv, banner: e.target.value})} />
                        <button type="button" onClick={() => eventBannerRef.current?.click()} className="bg-steam-highlight text-steam-dark p-3 rounded-xl"><Upload className="w-4 h-4"/></button>
                        <input type="file" ref={eventBannerRef} className="hidden" accept="image/*" onChange={handleEventFileUpload} />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div><label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Início</label><input type="date" className="w-full bg-[#171a21] border border-transparent rounded-xl p-3 text-white text-xs" value={editingEv?.startDate || ''} onChange={e => setEditingEv({...editingEv, startDate: e.target.value})} /></div>
                     <div><label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Fim</label><input type="date" className="w-full bg-[#171a21] border border-transparent rounded-xl p-3 text-white text-xs" value={editingEv?.endDate || ''} onChange={e => setEditingEv({...editingEv, endDate: e.target.value})} /></div>
                  </div>
                  <div className="flex gap-3 pt-4">
                     <button type="button" onClick={() => setShowEventModal(false)} className="flex-1 bg-white/5 text-gray-400 py-3 rounded-lg font-black uppercase text-[10px]">Cancelar</button>
                     <button type="submit" className="flex-1 bg-steam-highlight text-steam-dark py-3 rounded-lg font-black uppercase text-[10px]">{isSaving ? 'Salvando...' : 'Gravar Evento'}</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* MODAL ADICIONAR SALDO (NOVO) */}
      {showBalanceModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] p-4 backdrop-blur-md">
          <div className="bg-[#1b2838] p-8 rounded-[32px] w-full max-w-sm border border-transparent shadow-5xl animate-scale-in">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-steam-green/10 rounded-2xl border border-transparent">
                <Coins className="w-8 h-8 text-steam-green" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Adicionar Saldo</h3>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Selecione um valor pré-definido</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {[10, 20, 40, 50, 100].map(amount => (
                <button 
                   key={amount}
                   onClick={() => confirmAddFunds(amount)}
                   className="py-4 bg-black/40 border border-transparent rounded-2xl text-white font-black hover:bg-steam-green hover:text-steam-dark hover:border-transparent transition-all group"
                >
                  <div className="text-[10px] text-gray-500 group-hover:text-steam-dark/60 uppercase tracking-widest mb-1">R$</div>
                  <div className="text-2xl tracking-tighter italic">{amount}</div>
                </button>
              ))}
            </div>

            <button 
              onClick={() => setShowBalanceModal(false)}
              className="w-full py-4 bg-white/5 text-gray-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/10 transition-all"
            >
              Cancelar Operação
            </button>
          </div>
        </div>
      )}

      {/* MODAL NOVA NOTIFICAÇÃO (NOVO) */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] p-4 backdrop-blur-md">
          <div className="bg-[#1b2838] p-10 rounded-[40px] border border-transparent shadow-5xl max-w-lg w-full">
            <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-8 italic">Transmitir Notificação</h3>
            <form onSubmit={handleSendNotification} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase font-black text-gray-500 mb-2 ml-1 tracking-widest">Título da Notificação</label>
                <input type="text" required placeholder="Ex: Manutenção Programada..." value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} className="w-full bg-black/40 border border-transparent rounded-xl p-4 text-white focus:border-steam-highlight focus:outline-none font-bold" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-gray-500 mb-2 ml-1 tracking-widest">Mensagem</label>
                <textarea required placeholder="O que você deseja comunicar?" value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} className="w-full bg-black/40 border border-transparent rounded-xl p-4 text-white focus:border-steam-highlight focus:outline-none font-bold min-h-[100px]" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-gray-500 mb-2 ml-1 tracking-widest">Link Externo (Opcional)</label>
                <input type="text" placeholder="https://..." value={notifLink} onChange={(e) => setNotifLink(e.target.value)} className="w-full bg-black/40 border border-transparent rounded-xl p-4 text-white focus:border-steam-highlight focus:outline-none font-bold" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-gray-500 mb-2 ml-1 tracking-widest">URL da Imagem (Opcional)</label>
                <input type="text" placeholder="https://..." value={notifImage} onChange={(e) => setNotifImage(e.target.value)} className="w-full bg-black/40 border border-transparent rounded-xl p-4 text-white focus:border-steam-highlight focus:outline-none font-bold" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowNotificationModal(false)} className="flex-1 py-4 bg-white/5 text-gray-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/10 transition-all">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-steam-highlight text-steam-dark font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isSaving ? 'Enviando...' : 'Transmitir Agora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NÍVEL */}
      {showLevelModal && (
         <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] p-4 backdrop-blur-md">
            <div className="bg-[#1b2838] p-8 rounded-[40px] w-full max-w-md border border-transparent shadow-5xl">
               <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-steam-highlight/10 rounded-2xl border border-transparent">
                     <BarChart2 className="w-8 h-8 text-steam-highlight" />
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">{editingLevel?.id ? 'Editar Nível' : 'Novo Nível'}</h3>
                     <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Defina os parâmetros da patente</p>
                  </div>
               </div>
               <form onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSaving(true);
                  try {
                    if (editingLevel?.id) {
                      await updateLevel(editingLevel as LevelConfig);
                      showToast("Nível atualizado!", "success");
                    } else {
                      await addLevel(editingLevel as Omit<LevelConfig, 'id' | 'createdAt'>);
                      showToast("Nível criado!", "success");
                    }
                    setShowLevelModal(false);
                  } catch (err: any) {
                    showToast(err.message || "Erro ao salvar nível", "error");
                  } finally {
                    setIsSaving(false);
                  }
               }} className="space-y-6">
                  <div>
                     <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block ml-1">Nome da Patente</label>
                     <input 
                        required 
                        className="w-full bg-black/40 border border-transparent rounded-2xl p-4 text-white font-bold focus:border-steam-highlight focus:outline-none" 
                        value={editingLevel?.name || ''} 
                        onChange={e => setEditingLevel({...editingLevel, name: e.target.value})} 
                        placeholder="Ex: Mestre Supremo"
                     />
                  </div>
                  <div>
                     <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block ml-1">XP Mínimo Necessário</label>
                     <input 
                        required 
                        type="number"
                        min="0"
                        className="w-full bg-black/40 border border-transparent rounded-2xl p-4 text-white font-bold focus:border-steam-highlight focus:outline-none" 
                        value={editingLevel?.minXp || 0} 
                        onChange={e => setEditingLevel({...editingLevel, minXp: parseInt(e.target.value)})} 
                     />
                  </div>

                  <div className="p-6 bg-black/20 rounded-3xl border border-transparent">
                     <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-3 text-center">Visualização em Tempo Real</div>
                     <div className="flex justify-center">
                        <div className="px-4 py-2 bg-steam-highlight/20 rounded-lg border border-transparent shadow-[0_0_20px_rgba(102,192,244,0.15)]">
                           <span className="text-sm font-black text-steam-highlight uppercase italic tracking-tighter">
                              {editingLevel?.name || 'NOME DO NÍVEL'}
                           </span>
                        </div>
                     </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                     <button type="button" onClick={() => setShowLevelModal(false)} className="flex-1 py-4 bg-white/5 text-gray-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/10 transition-all">Cancelar</button>
                     <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-steam-highlight text-steam-dark font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white transition-all shadow-xl shadow-blue-500/20">
                        {isSaving ? 'Salvando...' : 'Gravar Patente'}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

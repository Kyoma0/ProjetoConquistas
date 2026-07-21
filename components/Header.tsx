
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { LogOut, User as UserIcon, Shield, Trophy, Star, Clock, Medal, Globe, Search, X, Gamepad2, BookOpen } from 'lucide-react';
import { AchievementStatus, UserAchievementProgress } from '../types';
import { getLevelInfo } from '../constants';

interface HeaderProps {
    onNavigateProfile: () => void;
    onSelectGame?: (gameId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateProfile, onSelectGame }) => {
    const { currentUser, logout, userProgress, achievements, pendingValidations, games, subPages } = useApp();

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Debounce search term by ~300ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTerm(searchTerm.trim().toLowerCase());
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on Esc key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const searchResults = useMemo(() => {
        if (!debouncedTerm) {
            return { matchedGames: [], matchedAchievements: [], matchedSubPages: [] };
        }

        const matchedGames = games.filter(g => 
            g.isActive && g.title.toLowerCase().includes(debouncedTerm)
        ).slice(0, 5);

        const matchedAchievements = achievements.filter(a => {
            const matchesText = a.name.toLowerCase().includes(debouncedTerm) || 
                (a.description && a.description.toLowerCase().includes(debouncedTerm));
            if (!matchesText) return false;

            if (a.isHidden) {
                const isUnlocked = (userProgress[a.id] as UserAchievementProgress)?.status === AchievementStatus.COMPLETED;
                return isUnlocked;
            }

            return true;
        }).slice(0, 5);

        const matchedSubPages = subPages.filter(sp => 
            sp.title.toLowerCase().includes(debouncedTerm)
        ).slice(0, 5);

        return { matchedGames, matchedAchievements, matchedSubPages };
    }, [debouncedTerm, games, achievements, subPages, userProgress]);

    const hasResults = debouncedTerm.length > 0 && (
        searchResults.matchedGames.length > 0 ||
        searchResults.matchedAchievements.length > 0 ||
        searchResults.matchedSubPages.length > 0
    );

    const handleResultClick = (gameId: string) => {
        if (onSelectGame) {
            onSelectGame(gameId);
        }
        setIsOpen(false);
        setSearchTerm('');
    };

    if (!currentUser) return null;

    const stats = useMemo(() => {
        const unlocked = achievements.filter(a => (userProgress[a.id] as UserAchievementProgress)?.status === AchievementStatus.COMPLETED);
        const totalXP = unlocked.reduce((acc, curr) => acc + curr.xp, 0);
        
        const levelInfo = getLevelInfo(totalXP);
        const currentLevelXP = totalXP % 100;

        const myPendingCount = pendingValidations.filter(v => v.userId === currentUser.id).length;

        return { totalXP, ...levelInfo, currentLevelXP, myPendingCount };
    }, [userProgress, achievements, pendingValidations, currentUser.id]);

    return (
        <header className="sticky top-0 z-40 w-full bg-steam-dark/95 backdrop-blur border-b border-transparent shadow-md px-6 py-3 flex items-center justify-between shrink-0 h-20">
            <div className="flex items-center gap-6">
                 <div className="hidden lg:block">
                    <h2 className="text-white font-bold text-lg tracking-tight leading-none mb-1 uppercase tracking-tighter">Central de Caçadores</h2>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-transparent rounded-full">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[8px] text-green-500 font-black uppercase tracking-widest">Server Online</span>
                        </div>
                        <span className={`text-[10px] uppercase tracking-widest font-black ${stats.color}`}>
                            {stats.title} • {stats.totalXP} XP
                        </span>
                    </div>
                 </div>

                 {/* BUSCA GLOBAL */}
                 <div ref={searchRef} className="relative w-64 md:w-80">
                    <div className="relative flex items-center">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="Buscar jogos, conquistas, guias..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setIsOpen(true);
                            }}
                            onFocus={() => setIsOpen(true)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-9 text-xs font-medium text-white placeholder:text-gray-500 outline-none focus:border-steam-highlight/60 transition-all shadow-inner"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => {
                                    setSearchTerm('');
                                    setIsOpen(false);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* DROPDOWN DE RESULTADOS */}
                    {isOpen && debouncedTerm.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#171a21] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in max-h-[75vh] overflow-y-auto custom-scrollbar">
                            {!hasResults ? (
                                <div className="p-6 text-center text-xs text-gray-500 font-medium">
                                    Nenhum resultado encontrado para &quot;{searchTerm}&quot;
                                </div>
                            ) : (
                                <div className="p-2 space-y-3">
                                    {/* JOGOS */}
                                    {searchResults.matchedGames.length > 0 && (
                                        <div>
                                            <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-steam-highlight flex items-center gap-1.5 border-b border-white/5 mb-1">
                                                <Gamepad2 className="w-3 h-3" /> Jogos ({searchResults.matchedGames.length})
                                            </div>
                                            <div className="space-y-1">
                                                {searchResults.matchedGames.map(game => (
                                                    <button
                                                        key={game.id}
                                                        onClick={() => handleResultClick(game.id)}
                                                        className="w-full p-2 rounded-xl hover:bg-white/5 flex items-center gap-3 text-left transition-colors group"
                                                    >
                                                        <img src={game.coverUrl} alt={game.title} className="w-10 h-10 rounded-lg object-cover bg-black/40" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-bold text-white group-hover:text-steam-highlight truncate">{game.title}</div>
                                                            <div className="text-[10px] text-gray-500">{game.publisher}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* CONQUISTAS */}
                                    {searchResults.matchedAchievements.length > 0 && (
                                        <div>
                                            <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-yellow-400 flex items-center gap-1.5 border-b border-white/5 mb-1">
                                                <Trophy className="w-3 h-3" /> Conquistas ({searchResults.matchedAchievements.length})
                                            </div>
                                            <div className="space-y-1">
                                                {searchResults.matchedAchievements.map(ach => {
                                                    const parentGame = games.find(g => g.id === ach.gameId);
                                                    return (
                                                        <button
                                                            key={ach.id}
                                                            onClick={() => handleResultClick(ach.gameId)}
                                                            className="w-full p-2 rounded-xl hover:bg-white/5 flex items-center gap-3 text-left transition-colors group"
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center shrink-0 border border-white/5 text-yellow-400">
                                                                <Trophy className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-bold text-white group-hover:text-steam-highlight truncate">{ach.name}</div>
                                                                <div className="text-[10px] text-gray-500 truncate">{parentGame ? parentGame.title : 'Jogo'} • {ach.xp} XP</div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* GUIAS E WIKI */}
                                    {searchResults.matchedSubPages.length > 0 && (
                                        <div>
                                            <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 border-b border-white/5 mb-1">
                                                <BookOpen className="w-3 h-3" /> Guias &amp; Wiki ({searchResults.matchedSubPages.length})
                                            </div>
                                            <div className="space-y-1">
                                                {searchResults.matchedSubPages.map(sp => {
                                                    const parentGame = games.find(g => g.id === sp.gameId);
                                                    return (
                                                        <button
                                                            key={sp.id}
                                                            onClick={() => handleResultClick(sp.gameId)}
                                                            className="w-full p-2 rounded-xl hover:bg-white/5 flex items-center gap-3 text-left transition-colors group"
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center shrink-0 border border-white/5 text-emerald-400">
                                                                <BookOpen className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-bold text-white group-hover:text-steam-highlight truncate">{sp.title}</div>
                                                                <div className="text-[10px] text-gray-500 truncate">{parentGame ? parentGame.title : 'Wiki'}</div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                 </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden md:flex flex-col items-end mr-2">
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest mb-1 text-gray-400">
                        <span>Nível {stats.level}</span>
                        <span className="text-steam-highlight">{stats.currentLevelXP} / 100 XP</span>
                    </div>
                    <div className="w-48 h-2.5 bg-black/50 rounded-full overflow-hidden border border-transparent relative shadow-inner">
                        <div 
                            className={`h-full bg-gradient-to-r from-steam-highlight to-blue-500 transition-all duration-700 shadow-[0_0_8px_rgba(102,192,244,0.4)]`} 
                            style={{ width: `${stats.currentLevelXP}%` }}
                        ></div>
                    </div>
                </div>

                <div className="flex items-center gap-3 pl-6 border-l border-transparent">
                    <button 
                        onClick={onNavigateProfile}
                        className="group flex items-center gap-3 text-left hover:bg-white/5 p-1.5 pr-3 rounded-lg transition-colors"
                    >
                        <div className="relative">
                            <img 
                                src={currentUser.avatar || undefined} 
                                alt={currentUser.name} 
                                className={`w-10 h-10 rounded object-cover border-2 ${currentUser.isAdmin ? 'border-red-500' : 'border-steam-highlight'} group-hover:scale-105 transition-transform`} 
                            />
                        </div>
                        <div className="hidden sm:block">
                            <div className="text-sm font-bold text-white group-hover:text-steam-highlight transition-colors flex items-center gap-1 uppercase tracking-tighter">
                                {currentUser.name}
                                {currentUser.isAdmin && <Shield className="w-3 h-3 text-red-500" />}
                            </div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-white">
                                Sessão Ativa
                            </div>
                        </div>
                    </button>
                    
                    <button 
                        onClick={logout} 
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Encerrar Sessão"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </header>
    );
};

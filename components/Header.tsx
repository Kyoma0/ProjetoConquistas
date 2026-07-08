
import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { LogOut, User as UserIcon, Shield, Trophy, Star, Clock, Medal, Globe } from 'lucide-react';
import { AchievementStatus, UserAchievementProgress } from '../types';
import { getLevelInfo } from '../constants';

interface HeaderProps {
    onNavigateProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateProfile }) => {
    const { currentUser, logout, userProgress, achievements, pendingValidations } = useApp();

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
                 <div className="hidden md:block">
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

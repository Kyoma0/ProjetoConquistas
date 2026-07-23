
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Gamepad2, Star, Ghost, Shield, Library, Heart, Radio, Users, User as UserIcon, Maximize2, ShoppingBag, Calendar } from 'lucide-react';

interface SidebarProps {
  onSelectGame: (gameId: string) => void;
  selectedGameId: string | null;
  onNavigateHome: () => void;
  onNavigateCatalog: () => void;
  onNavigateAdmin: () => void;
  onNavigateLibrary: () => void;
  onNavigateFavorites: () => void;
  onNavigateLives: () => void;
  onNavigateFriends: () => void;
  onNavigateStore: () => void;
  onNavigateEvents: () => void;
  onNavigateCommunities: () => void;
  onNavigateTerms?: () => void;
  onNavigatePrivacy?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  onSelectGame, 
  selectedGameId, 
  onNavigateHome, 
  onNavigateCatalog,
  onNavigateAdmin,
  onNavigateLibrary,
  onNavigateFavorites,
  onNavigateLives,
  onNavigateFriends,
  onNavigateStore,
  onNavigateEvents,
  onNavigateCommunities,
  onNavigateTerms,
  onNavigatePrivacy
}) => {
  const { games, currentUser, users, systemSettings, onlineUsers } = useApp();
  const [friendsHeight, setFriendsHeight] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (isResizing && sidebarRef.current) {
      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const newHeight = sidebarRect.bottom - e.clientY;
      // Limit height between 100px and 500px
      if (newHeight >= 100 && newHeight <= 500) {
        setFriendsHeight(newHeight);
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

  const myFriends = useMemo(() => {
    return users.filter(u => currentUser?.friendIds?.includes(u.id));
  }, [users, currentUser?.friendIds]);

  const onlineFriends = useMemo(() => {
    return myFriends.filter(f => onlineUsers.includes(f.id));
  }, [myFriends, onlineUsers]);

  const handleFriendClick = (friendId: string) => {
    window.dispatchEvent(new CustomEvent('open-chat', { detail: { userId: friendId } }));
  };

  return (
    <div ref={sidebarRef} className="w-full bg-steam-dark flex flex-col h-full border-r border-transparent shrink-0 z-50">
      <div className="p-4 border-b border-transparent">
        <div 
          onClick={onNavigateHome}
          className="flex items-center gap-2 mb-1 px-1 cursor-pointer select-none group"
        >
            <Gamepad2 className="w-6 h-6 text-steam-highlight group-hover:scale-110 transition-transform" />
            <span className="font-bold text-white tracking-tight group-hover:text-steam-highlight transition-colors">GAME HUB</span>
        </div>
      </div>

      <div className="flex flex-col p-2 space-y-1 mt-2 flex-1 overflow-y-auto custom-scrollbar">
        {systemSettings.isCatalogEnabled && (
          <>
            <button 
              onClick={onNavigateHome}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-steam-accent hover:bg-steam-light/40 rounded transition-colors text-left"
            >
              <Star className="w-4 h-4 text-steam-highlight" />
              <span>Catálogo de Desafios</span>
            </button>
            <button 
              onClick={onNavigateCatalog}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-steam-accent hover:bg-steam-light/40 rounded transition-colors text-left"
            >
              <Gamepad2 className="w-4 h-4 text-steam-highlight" />
              <span>Catálogo Global</span>
            </button>
          </>
        )}
        
        {systemSettings.isLibraryEnabled && (
          <button 
            onClick={onNavigateLibrary}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-steam-accent hover:bg-steam-light/40 rounded transition-colors text-left"
          >
            <Library className="w-4 h-4 text-steam-highlight" />
            <span>Sua Biblioteca</span>
          </button>
        )}

        {systemSettings.isFavoritesEnabled && (
          <button 
            onClick={onNavigateFavorites}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-steam-accent hover:bg-steam-light/40 rounded transition-colors text-left"
          >
            <Heart className="w-4 h-4 text-pink-400" />
            <span>Favoritos</span>
          </button>
        )}

        {systemSettings.isLivesEnabled && (
          <button 
            onClick={onNavigateLives}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-steam-accent hover:bg-steam-light/40 rounded transition-colors text-left"
          >
            <Radio className="w-4 h-4 text-red-500 animate-pulse" />
            <span>Lives</span>
          </button>
        )}

        {/* NOVA ABA EVENTOS - Respeita a visibilidade global */}
        {systemSettings.isEventsEnabled && (
          <button 
            onClick={onNavigateEvents}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-steam-accent hover:bg-steam-light/40 rounded transition-colors text-left"
          >
            <Calendar className="w-4 h-4 text-yellow-500" />
            <span>Eventos</span>
          </button>
        )}

        <button 
          onClick={onNavigateCommunities}
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-steam-accent hover:bg-steam-light/40 rounded transition-colors text-left"
        >
          <Users className="w-4 h-4 text-steam-highlight" />
          <span>Comunidades</span>
        </button>

        {systemSettings.isStoreEnabled && (
          <button 
            onClick={onNavigateStore}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-steam-accent hover:bg-steam-light/40 rounded transition-colors text-left"
          >
            <ShoppingBag className="w-4 h-4 text-steam-highlight" />
            <span>Loja</span>
          </button>
        )}

        {currentUser?.isAdmin && (
           <button 
           onClick={onNavigateAdmin}
           className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-400 hover:bg-steam-light/40 rounded transition-colors text-left"
         >
           <Shield className="w-4 h-4" />
           <span>Painel Admin</span>
         </button>
        )}
      </div>

      <div 
        className="relative border-t border-transparent bg-black/20 group/friends flex flex-col shrink-0"
        style={{ height: friendsHeight }}
      >
         <div 
            onMouseDown={startResizing}
            className={`absolute top-0 left-0 w-full h-1 cursor-row-resize hover:bg-steam-highlight/50 transition-colors z-[60] ${isResizing ? 'bg-steam-highlight' : 'bg-transparent'}`}
         />
         <button 
            onClick={onNavigateFriends}
            className="w-full px-4 py-3 text-[10px] font-black text-steam-highlight uppercase tracking-[0.2em] flex items-center justify-between hover:bg-white/5 transition-colors shrink-0"
         >
            <span className="flex items-center gap-2">
              <Users className="w-3 h-3" /> Amigos Online
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[8px] bg-steam-green/20 text-steam-green px-1.5 py-0.5 rounded-full">{onlineFriends.length}</span>
              <Maximize2 className="w-3 h-3 opacity-0 group-hover/friends:opacity-100 transition-opacity" />
            </div>
         </button>
         
         <div className="px-2 pb-4 space-y-1 overflow-y-auto flex-1 custom-scrollbar">
            {onlineFriends.length > 0 ? onlineFriends.slice(0, 5).map(friend => (
                <div 
                  key={friend.id} 
                  onClick={() => handleFriendClick(friend.id)}
                  className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg group transition-all cursor-pointer"
                >
                    <div className="relative">
                        <img src={friend.avatar || undefined} className="w-8 h-8 rounded-full object-cover border border-transparent group-hover:border-steam-highlight" alt={friend.name} />
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-steam-green rounded-full border-2 border-steam-dark shadow-lg animate-pulse-fast"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-black text-white truncate group-hover:text-steam-highlight uppercase tracking-tight">{friend.name}</div>
                        <div className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Online</div>
                    </div>
                </div>
            )) : (
                <div className="py-6 text-center opacity-30 italic flex flex-col items-center">
                    <UserIcon className="w-6 h-6 mb-2" />
                    <p className="text-[9px] uppercase font-black tracking-widest leading-none">Ninguém online agora</p>
                </div>
            )}
         </div>
      </div>
      
      <div className="p-4 text-[10px] text-gray-500 text-center border-t border-white/5 shrink-0 space-y-2">
         <div className="flex items-center justify-center gap-3 font-semibold">
           {onNavigateTerms && (
             <button 
               onClick={onNavigateTerms}
               className="hover:text-steam-highlight transition-colors underline underline-offset-2"
             >
               Termos de Uso
             </button>
           )}
           <span className="text-gray-700">•</span>
           {onNavigatePrivacy && (
             <button 
               onClick={onNavigatePrivacy}
               className="hover:text-steam-highlight transition-colors underline underline-offset-2"
             >
               Política de Privacidade
             </button>
           )}
         </div>
         <div className="text-[9px] text-gray-600 font-medium">
           v1.7.0 • Admin Events Control Integrated
         </div>
      </div>
    </div>
  );
};

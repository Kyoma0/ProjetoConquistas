import React from 'react';
import { Camera, Shield, Gem, Globe, Loader2, RefreshCw, UserMinus, UserPlus, CheckCircle, Edit2, Play, Sparkles } from 'lucide-react';
import { User } from '../../types';

interface ProfileHeaderProps {
  targetUser: User;
  currentUser: User | null;
  isOwnProfile: boolean;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  editData: {
    avatar: string;
    bio: string;
    profileBackground: string;
  };
  setEditData: React.Dispatch<React.SetStateAction<{
    avatar: string;
    bio: string;
    profileBackground: string;
  }>>;
  isAlreadyFriend: boolean;
  toggleFriend: (id: string) => void;
  isLinkingSteam: boolean;
  handleLinkSteam: () => void;
  isSyncingLibrary: boolean;
  handleSyncLibrary: () => void;
  setIsGalleryOpen: (v: boolean) => void;
  hasWallpaperPermission: boolean;
  avatarInputRef: React.RefObject<HTMLInputElement>;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSave: () => void;
  videoError: boolean;
  setVideoError: (v: boolean) => void;
  isVideoBackground: (url: string) => boolean;
  renderBackground: (url: string) => React.ReactNode;
  levelInfo: {
    title: string;
    color: string;
  };
  totalXP: number;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  targetUser,
  currentUser,
  isOwnProfile,
  isEditing,
  setIsEditing,
  editData,
  setEditData,
  isAlreadyFriend,
  toggleFriend,
  isLinkingSteam,
  handleLinkSteam,
  isSyncingLibrary,
  handleSyncLibrary,
  setIsGalleryOpen,
  hasWallpaperPermission,
  avatarInputRef,
  handleAvatarUpload,
  handleSave,
  videoError,
  setVideoError,
  isVideoBackground,
  renderBackground,
  levelInfo,
  totalXP,
}) => {
  return (
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
  );
};

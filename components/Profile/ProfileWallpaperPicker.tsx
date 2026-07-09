import React from 'react';
import { Sparkles, PlusCircle, X, Lock, Filter, ShoppingBag, Trash2, CheckCircle2, Upload, Loader2 } from 'lucide-react';
import { User, ProfileWallpaper } from '../../types';

interface ProfileWallpaperPickerProps {
  isGalleryOpen: boolean;
  setIsGalleryOpen: (v: boolean) => void;
  isAddWpOpen: boolean;
  setIsAddWpOpen: (v: boolean) => void;
  hasWallpaperPermission: boolean;
  currentUser: User | null;
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  filteredWallpapers: ProfileWallpaper[];
  selectWallpaper: (url: string) => void;
  isVideoBackground: (url: string) => boolean;
  deleteWallpaper: (id: string) => void;
  newWpData: Partial<ProfileWallpaper>;
  setNewWpData: React.Dispatch<React.SetStateAction<Partial<ProfileWallpaper>>>;
  handleAddWallpaperSubmit: (e: React.FormEvent) => void;
  wpFileInputRef: React.RefObject<HTMLInputElement>;
  isUploadingWp: boolean;
  uploadProgress: number | null;
  handleWpFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ProfileWallpaperPicker: React.FC<ProfileWallpaperPickerProps> = ({
  isGalleryOpen,
  setIsGalleryOpen,
  isAddWpOpen,
  setIsAddWpOpen,
  hasWallpaperPermission,
  currentUser,
  categories,
  selectedCategory,
  setSelectedCategory,
  filteredWallpapers,
  selectWallpaper,
  isVideoBackground,
  deleteWallpaper,
  newWpData,
  setNewWpData,
  handleAddWallpaperSubmit,
  wpFileInputRef,
  isUploadingWp,
  uploadProgress,
  handleWpFileUpload,
}) => {
  if (!isGalleryOpen) return null;

  return (
    <>
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
                          onClick={(e) => { e.stopPropagation(); deleteWallpaper(wp.id); }}
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
                  value={newWpData.title || ''}
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
                      value={newWpData.url || ''}
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
                    value={newWpData.category || 'Cyberpunk'}
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
    </>
  );
};

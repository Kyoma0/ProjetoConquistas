
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingBag, Sparkles, Gem, Image as ImageIcon, Zap, Star, ShieldCheck, ArrowRight, Lock, CheckCircle2, Coins, Wallet, Ghost, Play, Edit2, Eye, EyeOff, Trash2, Plus, Save, X, Loader2, Upload } from 'lucide-react';
import { StoreItem } from '../types';

interface StoreViewProps {
  onNavigateAds: () => void;
}

const isVideoUrl = (url: string) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.startsWith('data:video');
};

const StoreItemCard: React.FC<{ 
  item: StoreItem, 
  isOwned: boolean, 
  balance: number, 
  isAdmin: boolean,
  showConfirm: (message: string, onConfirm: () => void) => void,
  onPurchase: (item: StoreItem) => void,
  onEdit: (item: StoreItem) => void,
  onToggleStatus: (item: StoreItem) => void,
  onDelete: (id: string) => void
}> = ({ item, isOwned, balance, isAdmin, showConfirm, onPurchase, onEdit, onToggleStatus, onDelete }) => {
  const isVideo = isVideoUrl(item.image);
  const [isHovered, setIsHovered] = useState(false);

  const getIcon = (type: string) => {
    switch(type) {
      case 'WALLPAPER': return <ImageIcon className="text-purple-400" />;
      case 'AVATAR': return <Star className="text-yellow-500" />;
      case 'BOOSTER': return <Zap className="text-steam-highlight" />;
      default: return <Sparkles className="text-gray-400" />;
    }
  };

  const rarityColor = {
    'COMUM': 'text-gray-400',
    'RARO': 'text-blue-400',
    'ÉPICO': 'text-purple-400',
    'LENDÁRIO': 'text-yellow-500'
  };

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`bg-steam-dark rounded-[32px] border transition-all shadow-2xl flex flex-col h-full relative group
        ${!item.isActive ? 'opacity-50 grayscale border-dashed border-transparent' : 'border-transparent hover:border-steam-highlight/30'}
      `}
    >
      {/* ADMIN QUICK ACTIONS */}
      {isAdmin && (
        <div className="absolute top-4 left-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            className="p-2.5 bg-steam-highlight text-steam-dark rounded-xl shadow-xl hover:scale-110 transition-all"
            title="Ajustar Item"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleStatus(item); }}
            className={`p-2.5 rounded-xl shadow-xl hover:scale-110 transition-all ${item.isActive ? 'bg-white/10 text-white' : 'bg-steam-green text-steam-dark'}`}
            title={item.isActive ? 'Pausar Vendas' : 'Ativar Vendas'}
          >
            {item.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              showConfirm('Deseja excluir este item permanentemente da loja?', () => {
                onDelete(item.id);
              });
            }}
            className="p-2.5 bg-red-600 text-white rounded-xl shadow-xl hover:scale-110 transition-all cursor-pointer"
            title="Remover"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="relative aspect-video overflow-hidden bg-black rounded-t-[32px]">
        {isVideo ? (
          <video 
            src={item.image || undefined} 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
            muted 
            loop 
            playsInline
            autoPlay={isHovered}
          />
        ) : (
          <img src={item.image || undefined} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
        )}
        
        {isVideo && (
          <div className="absolute top-4 right-16 bg-purple-600/80 backdrop-blur-md px-2 py-0.5 rounded text-[7px] font-black text-white uppercase tracking-widest flex items-center gap-1">
            <Play className="w-2 h-2 fill-current" /> Animado
          </div>
        )}

        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black text-white uppercase tracking-widest border border-transparent">
          {item.rarity}
        </div>

        {!item.isActive && (
           <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="bg-red-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl">Offline</span>
           </div>
        )}
      </div>
      
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-white font-black uppercase tracking-tight text-lg leading-tight mb-1 group-hover:text-steam-highlight transition-colors">{item.name}</h3>
            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">{item.type}</div>
          </div>
          <div className="bg-white/5 p-2 rounded-xl">
            {getIcon(item.type)}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-transparent flex items-center justify-between">
          <div className="flex items-center gap-2">
             <span className="text-white font-black text-sm">R$ {item.price.toFixed(2)}</span>
          </div>
          {isOwned ? (
            <div className="px-5 py-2 rounded-xl font-black uppercase tracking-widest text-[9px] bg-steam-green/10 text-steam-green border border-steam-green/20 flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3" /> Adquirido
            </div>
          ) : (
            <button 
              onClick={() => onPurchase(item)}
              disabled={!item.isActive}
              className={`px-5 py-2 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center gap-2 transition-all
                ${!item.isActive ? 'bg-white/5 text-gray-600 cursor-not-allowed' : balance >= item.price ? 'bg-steam-highlight text-steam-dark hover:bg-white' : 'bg-white/5 text-gray-600 cursor-not-allowed'}
              `}
            >
              {!item.isActive ? 'Indisponível' : balance >= item.price ? 'Adquirir' : 'Saldo Insuficiente'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const StoreView: React.FC<StoreViewProps> = ({ onNavigateAds }) => {
  const { currentUser, storeItems, showToast, updateUser, addStoreItem, updateStoreItem, deleteStoreItem, showConfirm } = useApp();
  
  const balance = currentUser?.balance || 0;
  const isAdmin = currentUser?.isAdmin || false;
  const ownedItems = currentUser?.ownedItemIds || [];
  
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'WALLPAPER' | 'AVATAR' | 'BOOSTER'>('ALL');
  
  // States para o Editor de Admin
  const [editingItem, setEditingItem] = useState<Partial<StoreItem> | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = useMemo(() => {
    // Admin vê tudo, Usuário vê só ativos
    const baseItems = isAdmin ? storeItems : storeItems.filter(i => i.isActive);
    return activeCategory === 'ALL' ? baseItems : baseItems.filter(i => i.type === activeCategory);
  }, [storeItems, activeCategory, isAdmin]);

  const handlePurchase = (item: StoreItem) => {
    if (!currentUser) return;
    if (balance < item.price) {
      showToast(`Saldo insuficiente! Faltam R$ ${(item.price - balance).toFixed(2)}.`, 'error');
      return;
    }
    const updatedOwned = [...ownedItems, item.id];
    updateUser(currentUser.id, { 
      balance: balance - item.price,
      ownedItemIds: updatedOwned
    });
    showToast(`"${item.name}" adicionado ao seu inventário!`, 'success');
  };

  const handleOpenCreate = () => {
    setEditingItem({ isActive: true, rarity: 'COMUM', type: 'WALLPAPER', price: 0, image: '', name: '' });
    setShowModal(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingItem) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingItem({ ...editingItem, image: reader.result as string });
        showToast("Arquivo pronto para publicação!", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || isSaving) return;
    setIsSaving(true);
    try {
      if (editingItem.id) {
        await updateStoreItem(editingItem as StoreItem);
        showToast("Produto atualizado na vitrine!", "success");
      } else {
        await addStoreItem({ ...editingItem, id: `si_${Date.now()}` } as StoreItem);
        showToast("Novo produto adicionado à loja!", "success");
      }
      setShowModal(false);
      setEditingItem(null);
    } catch (err) {
      showToast("Erro ao processar alteração.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 md:p-12 animate-fade-in max-w-7xl mx-auto pb-20 relative">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter italic flex items-center gap-4">
            <ShoppingBag className="text-steam-highlight w-10 h-10" /> Loja Master
          </h1>
          <p className="text-gray-400 font-medium italic opacity-60 uppercase text-[10px] tracking-widest">
            {isAdmin ? 'ADMINISTRANDO VITRINE: Ajuste preços e mídias em tempo real.' : 'Troque seus ganhos por personalizações exclusivas e wallpapers animados.'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <button 
              onClick={handleOpenCreate}
              className="bg-steam-green text-steam-dark px-8 py-4 rounded-3xl font-black uppercase tracking-widest text-[11px] flex items-center gap-3 hover:bg-white transition-all shadow-xl shadow-green-500/20"
            >
              <Plus className="w-5 h-5" /> Novo Produto
            </button>
          )}
          
          <div className="bg-steam-dark px-8 py-4 rounded-3xl border border-transparent flex items-center gap-6 shadow-2xl">
             <div className="text-right">
                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Seu Saldo Master</div>
                <div className="flex items-center justify-end gap-3">
                   <button 
                     onClick={onNavigateAds}
                     className="px-2 py-1 bg-steam-highlight/10 border border-steam-highlight/20 rounded-lg text-[8px] font-black text-steam-highlight uppercase tracking-[0.2em] hover:bg-steam-highlight hover:text-steam-dark transition-all flex items-center gap-1 group"
                   >
                      <Coins className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                      Ganhar Saldo
                   </button>
                   <div className="text-2xl font-black text-steam-highlight leading-none">R$ {balance.toFixed(2)}</div>
                </div>
             </div>
             <div className="w-12 h-12 bg-steam-highlight/10 rounded-2xl flex items-center justify-center border border-steam-highlight/20">
                <Wallet className="text-steam-highlight w-6 h-6" />
             </div>
          </div>
        </div>
      </header>

      {/* Categorias */}
      <div className="flex gap-4 mb-10 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: 'ALL', label: 'Tudo', icon: <Sparkles className="w-3.5 h-3.5" /> },
          { id: 'WALLPAPER', label: 'Fundos de Perfil', icon: <ImageIcon className="w-3.5 h-3.5" /> },
          { id: 'AVATAR', label: 'Efeitos de Avatar', icon: <Star className="w-3.5 h-3.5" /> },
          { id: 'BOOSTER', label: 'Boosters', icon: <Zap className="w-3.5 h-3.5" /> },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id as any)}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border shrink-0
              ${activeCategory === cat.id ? 'bg-steam-highlight text-steam-dark border-steam-highlight' : 'bg-steam-dark text-gray-400 border-transparent hover:border-transparent hover:text-white'}
            `}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid de Itens */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map(item => (
            <StoreItemCard 
              key={item.id} 
              item={item} 
              isOwned={ownedItems.includes(item.id)} 
              balance={balance}
              isAdmin={isAdmin}
              showConfirm={showConfirm}
              onPurchase={handlePurchase}
              onEdit={(item) => { setEditingItem(item); setShowModal(true); }}
              onToggleStatus={(item) => updateStoreItem({ ...item, isActive: !item.isActive })}
              onDelete={deleteStoreItem}
            />
          ))}
        </div>
      ) : (
        <div className="py-40 flex flex-col items-center justify-center text-center opacity-20 border-2 border-dashed border-transparent rounded-[40px]">
           <Ghost className="w-20 h-20 mb-6" />
           <p className="text-sm font-black uppercase tracking-[0.4em]">Loja Vazia</p>
           <p className="text-xs mt-2 uppercase">Aguardando novos carregamentos da elite.</p>
        </div>
      )}

      {/* MODAL DE EDIÇÃO INTEGRADO (VISÍVEL APENAS PARA ADMIN) */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 bg-black/95 z-[150] flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in">
          <div className="bg-[#1b2838] p-10 rounded-[40px] w-full max-w-lg border border-transparent shadow-5xl max-h-[90vh] overflow-y-auto custom-scrollbar relative">
             <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors">
               <X className="w-8 h-8" />
             </button>

             <h3 className="text-2xl font-black text-white mb-8 uppercase tracking-tight flex items-center gap-3 italic">
                <ShoppingBag className="text-steam-highlight" />
                {editingItem?.id ? 'Ajustar Produto' : 'Novo na Vitrine'}
             </h3>

             <form onSubmit={handleSaveItem} className="space-y-6">
                <div className="flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-transparent">
                   <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Disponibilidade</label>
                   <button 
                      type="button"
                      onClick={() => setEditingItem({...editingItem, isActive: !editingItem?.isActive})}
                      className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${editingItem?.isActive ? 'bg-steam-green/20 text-steam-green border border-steam-green/30 shadow-[0_0_15px_rgba(164,208,7,0.2)]' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}
                   >
                      {editingItem?.isActive ? 'Ativo na Loja' : 'Pausado / Oculto'}
                   </button>
                </div>

                <div>
                   <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Nome do Item</label>
                   <input className="w-full bg-black/60 border border-transparent rounded-2xl p-4 text-white text-sm font-bold outline-none focus:border-steam-highlight" value={editingItem?.name || ''} onChange={e => setEditingItem({...editingItem, name: e.target.value})} required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Tipo</label>
                      <select className="w-full bg-black/60 border border-transparent rounded-2xl p-4 text-white text-xs font-bold outline-none" value={editingItem?.type || 'WALLPAPER'} onChange={e => setEditingItem({...editingItem, type: e.target.value as any})}>
                         <option value="WALLPAPER">Fundo de Perfil</option>
                         <option value="AVATAR">Efeito de Avatar</option>
                         <option value="BOOSTER">Booster Especial</option>
                      </select>
                   </div>
                   <div>
                      <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Raridade</label>
                      <select className="w-full bg-black/60 border border-transparent rounded-2xl p-4 text-white text-xs font-bold outline-none" value={editingItem?.rarity || 'COMUM'} onChange={e => setEditingItem({...editingItem, rarity: e.target.value as any})}>
                         <option value="COMUM">Comum</option>
                         <option value="RARO">Raro</option>
                         <option value="ÉPICO">Épico</option>
                         <option value="LENDÁRIO">Lendário</option>
                      </select>
                   </div>
                </div>

                <div>
                   <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Preço de Venda (R$)</label>
                   <div className="relative">
                      <input type="number" step="0.01" className="w-full bg-black/60 border border-transparent rounded-2xl p-4 pl-12 text-white text-lg font-black outline-none focus:border-steam-highlight" value={editingItem?.price || ''} onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value)})} required />
                      <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-steam-green" />
                   </div>
                </div>

                <div>
                   <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Mídia (URL ou Arquivo Local)</label>
                   <div className="flex gap-2 mb-2">
                      <input className="flex-1 bg-black/60 border border-transparent rounded-2xl p-4 text-white text-[10px] font-mono truncate outline-none focus:border-steam-highlight" value={editingItem?.image || ''} onChange={e => setEditingItem({...editingItem, image: e.target.value})} placeholder="Link direto ou faça upload" />
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-steam-highlight text-steam-dark px-6 rounded-2xl hover:scale-105 transition-all shadow-lg flex items-center justify-center"
                      >
                         <Upload className="w-5 h-5" />
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/mp4,video/webm" onChange={handleFileUpload} />
                   </div>
                </div>

                {editingItem?.image && (
                   <div className="p-4 bg-black/80 rounded-3xl border border-transparent flex flex-col items-center">
                      <label className="text-[8px] text-gray-500 font-black uppercase mb-3 tracking-widest">Visualização do Admin</label>
                      <div className="w-full aspect-video rounded-2xl overflow-hidden border border-transparent bg-black">
                         {editingItem.image.endsWith('.mp4') || editingItem.image.endsWith('.webm') || editingItem.image.startsWith('data:video') ? (
                            <video src={editingItem.image || undefined} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                         ) : (
                            <img src={editingItem.image || undefined} className="w-full h-full object-cover" alt="Preview" onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop")} />
                         )}
                      </div>
                   </div>
                )}

                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-white/5 text-gray-400 font-black uppercase text-[10px] tracking-widest py-5 rounded-2xl hover:bg-white/10 transition-all">Cancelar</button>
                   <button type="submit" className="flex-1 bg-steam-highlight text-steam-dark font-black uppercase text-[10px] tracking-widest py-5 rounded-2xl flex items-center justify-center gap-2 shadow-2xl shadow-blue-500/20 transition-all hover:bg-white" disabled={isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {isSaving ? 'Gravando...' : 'Aplicar Mudanças'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Banner Footer VIP */}
      <div className="mt-20 bg-gradient-to-r from-steam-highlight/10 to-transparent p-12 rounded-[40px] border border-steam-highlight/20 flex flex-col md:flex-row items-center justify-between gap-8">
         <div className="max-w-xl text-center md:text-left">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4 italic flex items-center gap-3">
               <Gem className="text-yellow-500 w-8 h-8" /> Prestígio VIP
            </h2>
            <p className="text-gray-400 font-medium leading-relaxed italic text-base">
               Assinantes VIP possuem taxas reduzidas na loja e acesso antecipado a wallpapers lendários de edição limitada.
            </p>
         </div>
         <button className="bg-white text-steam-dark px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-steam-highlight transition-all shadow-4xl flex items-center gap-3 group">
            Ver Planos de Elite <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
         </button>
      </div>
    </div>
  );
};

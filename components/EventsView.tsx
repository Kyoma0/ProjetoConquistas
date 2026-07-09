
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Trophy, Zap, Plus, Edit2, Trash2, Clock, CheckCircle2, X, Save, Loader2, Upload, Coins, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { GameEvent } from '../types';

export const EventsView: React.FC = () => {
  const { events, currentUser, showToast, addEvent, updateEvent, deleteEvent, showConfirm } = useApp();
  const isAdmin = currentUser?.isAdmin || false;
  
  const [editingEvent, setEditingEvent] = useState<Partial<GameEvent> | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getEventStatus = (event: GameEvent) => {
    const now = new Date();
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);

    if (now > end) return { label: 'Finalizado', color: 'bg-gray-500/20 text-gray-500', type: 'FINISHED' };
    if (now < start) return { label: 'Em Breve', color: 'bg-yellow-500/20 text-yellow-500', type: 'UPCOMING' };
    return { label: 'Ativo Agora', color: 'bg-steam-green/20 text-steam-green border-steam-green/30', type: 'ACTIVE' };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingEvent) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingEvent({ ...editingEvent, banner: reader.result as string });
        showToast("Banner carregado com sucesso!", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || isSaving) return;
    setIsSaving(true);
    try {
      const eventData = {
        ...editingEvent,
        id: editingEvent.id || `ev_${Date.now()}`,
        isActive: editingEvent.isActive ?? true,
        rewardXp: Number(editingEvent.rewardXp) || 0,
        rewardBalance: Number(editingEvent.rewardBalance) || 0,
      } as GameEvent;

      if (editingEvent.id) {
        await updateEvent(eventData);
      } else {
        await addEvent(eventData);
      }
      setShowModal(false);
      setEditingEvent(null);
    } catch (err) {
      showToast("Falha ao processar evento.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 md:p-12 animate-fade-in max-w-7xl mx-auto pb-20">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter italic flex items-center gap-4">
            <Calendar className="text-yellow-500 w-10 h-10" /> Eventos Master
          </h1>
          <p className="text-gray-400 font-medium italic opacity-60 uppercase text-[10px] tracking-widest">
            {isAdmin ? 'CONTROLE DE TEMPORADAS: Crie desafios e defina premiações globais.' : 'Desafios sazonais e torneios com recompensas de elite.'}
          </p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => { setEditingEvent({ startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], rewardXp: 100, rewardBalance: 10 }); setShowModal(true); }}
            className="bg-steam-green text-steam-dark px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center gap-3 hover:bg-white transition-all shadow-xl shadow-green-500/20"
          >
            <Plus className="w-5 h-5" /> Novo Evento
          </button>
        )}
      </header>

      {events.length === 0 ? (
        <div className="py-40 flex flex-col items-center justify-center text-center opacity-20 border-2 border-dashed border-transparent rounded-[40px]">
           <Sparkles className="w-20 h-20 mb-6 text-gray-500" />
           <p className="text-sm font-black uppercase tracking-[0.4em] text-white">Orizonte Silencioso</p>
           <p className="text-xs mt-2 uppercase">Aguardando próximas ordens do comando master.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {events.map(event => {
            const status = getEventStatus(event);
            return (
              <div key={event.id} className="bg-steam-dark rounded-[40px] border border-transparent overflow-hidden group hover:border-steam-highlight/30 transition-all shadow-2xl relative flex flex-col">
                <div className="relative aspect-[21/9] overflow-hidden bg-black shadow-inner">
                  <img src={event.banner || undefined} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" alt={event.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-steam-dark via-transparent to-transparent"></div>
                  
                  <div className="absolute top-6 left-6 flex gap-2">
                    <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md border ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingEvent(event); setShowModal(true); }}
                        className="p-2.5 bg-steam-highlight text-steam-dark rounded-xl shadow-xl hover:scale-110 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { showConfirm('Excluir este evento?', () => deleteEvent(event.id)); }}
                        className="p-2.5 bg-red-600 text-white rounded-xl shadow-xl hover:scale-110 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight mb-3 group-hover:text-steam-highlight transition-colors">{event.title}</h3>
                  <p className="text-gray-400 text-sm font-medium leading-relaxed italic mb-8 opacity-80">{event.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-auto">
                    <div className="bg-black/30 p-4 rounded-2xl border border-transparent">
                      <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Prêmio Master</div>
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-steam-green" />
                        <span className="text-lg font-black text-white">R$ {event.rewardBalance.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="bg-black/30 p-4 rounded-2xl border border-transparent">
                      <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">XP Ganho</div>
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-steam-highlight" />
                        <span className="text-lg font-black text-white">{event.rewardXp} XP</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-transparent flex items-center justify-between">
                    <div className="flex items-center gap-3 text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Até {new Date(event.endDate).toLocaleDateString()}</span>
                    </div>
                    <button className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-3 shadow-xl ${status.type === 'ACTIVE' ? 'bg-white text-steam-dark hover:bg-steam-highlight' : 'bg-white/5 text-gray-600 cursor-not-allowed'}`}>
                      {status.type === 'ACTIVE' ? <><CheckCircle2 className="w-4 h-4" /> Entrar no Desafio</> : status.label}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL EDIÇÃO EVENTO (ADMIN) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in">
          <div className="bg-[#1b2838] p-10 rounded-[40px] w-full max-w-lg border border-transparent shadow-5xl max-h-[90vh] overflow-y-auto custom-scrollbar relative">
             <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors">
               <X className="w-8 h-8" />
             </button>

             <h3 className="text-2xl font-black text-white mb-8 uppercase tracking-tight flex items-center gap-3 italic">
                <Calendar className="text-yellow-500" />
                {editingEvent?.id ? 'Ajustar Temporada' : 'Novo Evento Global'}
             </h3>

             <form onSubmit={handleSaveEvent} className="space-y-6">
                <div>
                   <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Nome do Evento</label>
                   <input className="w-full bg-black/60 border border-transparent rounded-2xl p-4 text-white text-sm font-bold outline-none focus:border-steam-highlight" value={editingEvent?.title || ''} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} required />
                </div>

                <div>
                   <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Instruções / Lore do Desafio</label>
                   <textarea className="w-full bg-black/60 border border-transparent rounded-2xl p-4 text-white text-sm h-24 resize-none outline-none focus:border-steam-highlight font-medium italic" value={editingEvent?.description || ''} onChange={e => setEditingEvent({...editingEvent, description: e.target.value})} required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Data Início</label>
                      <input type="date" className="w-full bg-black/60 border border-transparent rounded-2xl p-4 text-white text-xs outline-none" value={editingEvent?.startDate || ''} onChange={e => setEditingEvent({...editingEvent, startDate: e.target.value})} />
                   </div>
                   <div>
                      <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Data Fim</label>
                      <input type="date" className="w-full bg-black/60 border border-transparent rounded-2xl p-4 text-white text-xs outline-none" value={editingEvent?.endDate || ''} onChange={e => setEditingEvent({...editingEvent, endDate: e.target.value})} />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Prêmio em R$</label>
                      <input type="number" step="0.01" className="w-full bg-black/60 border border-transparent rounded-2xl p-4 text-white font-black" value={editingEvent?.rewardBalance || 0} onChange={e => setEditingEvent({...editingEvent, rewardBalance: parseFloat(e.target.value)})} />
                   </div>
                   <div>
                      <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Prêmio em XP</label>
                      <input type="number" className="w-full bg-black/60 border border-transparent rounded-2xl p-4 text-white font-black" value={editingEvent?.rewardXp || 0} onChange={e => setEditingEvent({...editingEvent, rewardXp: parseInt(e.target.value)})} />
                   </div>
                </div>

                <div>
                   <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block tracking-widest">Banner da Campanha (URL ou Arquivo)</label>
                   <div className="flex gap-2 mb-2">
                      <input className="flex-1 bg-black/60 border border-transparent rounded-2xl p-4 text-white text-[10px] font-mono truncate outline-none focus:border-steam-highlight" value={editingEvent?.banner || ''} onChange={e => setEditingEvent({...editingEvent, banner: e.target.value})} placeholder="Link do banner ou upload" />
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-steam-highlight text-steam-dark px-6 rounded-2xl hover:scale-105 transition-all shadow-lg flex items-center justify-center"
                      >
                         <Upload className="w-5 h-5" />
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                   </div>
                </div>

                {editingEvent?.banner && (
                   <div className="p-4 bg-black/80 rounded-3xl border border-transparent">
                      <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden border border-transparent bg-black">
                         <img src={editingEvent.banner || undefined} className="w-full h-full object-cover" alt="Preview" />
                      </div>
                   </div>
                )}

                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-white/5 text-gray-400 font-black uppercase text-[10px] tracking-widest py-5 rounded-2xl hover:bg-white/10 transition-all">Cancelar</button>
                   <button type="submit" className="flex-1 bg-steam-highlight text-steam-dark font-black uppercase text-[10px] tracking-widest py-5 rounded-2xl flex items-center justify-center gap-2 shadow-2xl shadow-blue-500/20 transition-all hover:bg-white" disabled={isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {isSaving ? 'Lançando...' : 'Confirmar Evento'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

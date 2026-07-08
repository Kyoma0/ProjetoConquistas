
import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Users, UserMinus, ExternalLink, Trophy, Star, Ghost, Gem, Shield, UserPlus, Search, ArrowLeft, Sparkles, X, MessageSquare, User, History, Clock, Send } from 'lucide-react';
import { getLevelInfo } from '../constants';
import { UserAchievementProgress, AchievementStatus } from '../types';

interface FriendsViewProps {
  onNavigateProfile: (userId: string) => void;
  onOpenChat: (userId: string) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({ onNavigateProfile, onOpenChat }) => {
  const { currentUser, users, achievements, userProgress, validationLogs, toggleFriend, friendRequests, respondToFriendRequest, sendFriendRequest, onlineUsers } = useApp();
  const [viewMode, setViewMode] = useState<'my_friends' | 'discover' | 'requests'>('my_friends');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFriendForOptions, setSelectedFriendForOptions] = useState<any | null>(null);

  const myFriends = useMemo(() => {
    return users.filter(u => currentUser?.friendIds?.includes(u.id));
  }, [users, currentUser?.friendIds]);

  const incomingRequests = useMemo(() => {
    return friendRequests.filter(r => r.receiverId === currentUser?.id && r.status === 'pending');
  }, [friendRequests, currentUser?.id]);

  const outgoingRequests = useMemo(() => {
    return friendRequests.filter(r => r.senderId === currentUser?.id && r.status === 'pending');
  }, [friendRequests, currentUser?.id]);

  const nonFriends = useMemo(() => {
    const baseList = users.filter(u => 
      u.id !== currentUser?.id && 
      !currentUser?.friendIds?.includes(u.id) &&
      !u.isBanned
    );
    
    if (!searchTerm.trim()) return baseList;
    
    return baseList.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, currentUser?.id, currentUser?.friendIds, searchTerm]);

  const getFriendStats = (user: any) => {
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
    return { xp: realXP, levelInfo: getLevelInfo(realXP) };
  };

  return (
    <div className="p-8 md:p-12 animate-fade-in max-w-7xl mx-auto min-h-full flex flex-col relative">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter italic flex items-center gap-4">
            {viewMode === 'my_friends' ? (
              <>
                <Users className="text-steam-highlight w-10 h-10" /> Círculo de Amigos
              </>
            ) : (
              <>
                <Sparkles className="text-yellow-500 w-10 h-10" /> Descobrir Caçadores
              </>
            )}
          </h1>
          <p className="text-gray-400 font-medium italic opacity-60 uppercase text-[10px] tracking-widest">
            {viewMode === 'my_friends' ? 'Gerencie sua rede e acompanhe a elite.' : 'Encontre novos aliados para sua jornada épica.'}
          </p>
        </div>
        
        <div className="flex gap-4 items-center">
            <button 
              onClick={() => setViewMode(viewMode === 'requests' ? 'my_friends' : 'requests')}
              className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center gap-3 transition-all border relative
                ${viewMode === 'requests' ? 'bg-steam-highlight text-steam-dark border-steam-highlight' : 'bg-white/5 text-gray-400 border-transparent hover:text-white'}
              `}
            >
                <History className="w-4 h-4" /> Pedidos
                {incomingRequests.length > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-bounce shadow-lg">
                    {incomingRequests.length}
                  </span>
                )}
            </button>
            {viewMode === 'my_friends' ? (
                <button 
                  onClick={() => setViewMode('discover')}
                  className="bg-steam-highlight text-steam-dark px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center gap-3 hover:bg-white transition-all shadow-xl shadow-blue-500/20"
                >
                    <UserPlus className="w-4 h-4" /> Encontrar Amigos
                </button>
            ) : (
                <button 
                  onClick={() => { setViewMode('my_friends'); setSearchTerm(''); }}
                  className="bg-white/5 text-gray-400 px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center gap-3 hover:text-white transition-all border border-transparent"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar para Lista
                </button>
            )}
            <div className="hidden md:block bg-steam-dark px-6 py-3 rounded-2xl border border-transparent text-[10px] font-black uppercase tracking-widest text-gray-500">
              {viewMode === 'my_friends' ? 'Conexões:' : 'Encontrados:'} <span className="text-steam-highlight">{viewMode === 'my_friends' ? myFriends.length : nonFriends.length}</span>
            </div>
        </div>
      </header>

      {viewMode === 'my_friends' ? (
        myFriends.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myFriends.map(friend => {
              const stats = getFriendStats(friend);
              return (
                <div key={friend.id} className="bg-steam-dark rounded-3xl border border-transparent overflow-hidden group hover:border-steam-highlight/30 transition-all shadow-2xl relative">
                  <div className="h-20 bg-gradient-to-r from-steam-light/20 to-blue-900/20"></div>
                  <div className="p-6 -mt-12 relative z-10">
                    <div className="flex items-end justify-between mb-4">
                      <div className="relative cursor-pointer" onClick={() => setSelectedFriendForOptions(friend)}>
                        <img 
                          src={friend.avatar || undefined} 
                          className={`w-24 h-24 rounded-3xl border-4 border-steam-dark object-cover shadow-2xl transition-transform group-hover:scale-105 ${friend.isVip ? 'ring-2 ring-yellow-500/50' : ''}`} 
                          alt={friend.name} 
                        />
                        {onlineUsers.includes(friend.id) && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-steam-green rounded-full border-4 border-steam-dark shadow-lg"></div>
                        )}
                      </div>
                      <div className="flex gap-2 pb-2">
                         <button 
                          onClick={() => toggleFriend(friend.id)}
                          className="p-3 bg-red-600/10 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-xl border border-red-500/20"
                          title="Remover Amigo"
                         >
                           <UserMinus className="w-5 h-5" />
                         </button>
                         <button 
                          onClick={() => onOpenChat(friend.id)}
                          className="p-3 bg-steam-highlight/10 text-steam-highlight rounded-2xl hover:bg-steam-highlight hover:text-steam-dark transition-all shadow-xl border border-steam-highlight/20"
                          title="Abrir Chat"
                         >
                           <MessageSquare className="w-5 h-5" />
                         </button>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight truncate cursor-pointer hover:text-steam-highlight" onClick={() => setSelectedFriendForOptions(friend)}>{friend.name}</h3>
                        {friend.isAdmin && <Shield className="w-4 h-4 text-red-500" />}
                        {friend.isVip && <Gem className="w-4 h-4 text-yellow-500" />}
                      </div>
                      <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${stats.levelInfo.color}`}>
                        {stats.levelInfo.title} • Nível {stats.levelInfo.level}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/40 p-4 rounded-2xl border border-transparent text-center">
                         <div className="text-steam-highlight font-black text-lg">{stats.xp}</div>
                         <div className="text-[8px] text-gray-500 uppercase font-black tracking-widest">PONTOS</div>
                      </div>
                      <div className="bg-black/40 p-4 rounded-2xl border border-transparent text-center flex flex-col items-center justify-center">
                         <div className={`w-2 h-2 rounded-full mb-1 ${onlineUsers.includes(friend.id) ? 'bg-steam-green animate-pulse' : 'bg-gray-600'}`}></div>
                         <div className="text-[8px] text-gray-500 uppercase font-black tracking-widest">{onlineUsers.includes(friend.id) ? 'ONLINE' : 'OFFLINE'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-steam-highlight/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"></div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-40 flex flex-col items-center justify-center text-center opacity-20 border-2 border-dashed border-transparent rounded-[40px]">
            <Ghost className="w-24 h-24 mb-6 text-gray-400" />
            <p className="text-xl font-black uppercase tracking-[0.4em] text-white">Sua Rede está Deserta</p>
            <button onClick={() => setViewMode('discover')} className="mt-8 px-8 py-3 bg-steam-highlight text-steam-dark rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all shadow-2xl shadow-blue-500/20">Expandir Minha Influência</button>
          </div>
        )
      ) : viewMode === 'requests' ? (
        <div className="animate-fade-in space-y-12">
          <section>
            <h2 className="text-xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
              <UserPlus className="text-steam-highlight w-6 h-6" /> Pedidos Recebidos
            </h2>
            {incomingRequests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {incomingRequests.map(req => {
                  const sender = users.find(u => u.id === req.senderId);
                  if (!sender) return null;
                  return (
                    <div key={req.id} className="bg-steam-dark p-6 rounded-3xl border border-transparent flex items-center gap-6 group hover:border-steam-highlight/30 transition-all">
                      <img src={sender.avatar || undefined} className="w-16 h-16 rounded-2xl object-cover border border-transparent" alt={sender.name} />
                      <div className="flex-1">
                        <h4 className="text-white font-black uppercase text-sm">{sender.name}</h4>
                        <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest mt-1">Enviado em {new Date(req.timestamp).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => respondToFriendRequest(req.id, 'rejected')}
                          className="p-3 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => respondToFriendRequest(req.id, 'accepted')}
                          className="p-3 bg-steam-green/10 text-steam-green rounded-xl hover:bg-steam-green hover:text-steam-dark transition-all"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center bg-black/20 rounded-3xl border border-dashed border-transparent opacity-40">
                <p className="text-xs font-black uppercase tracking-widest text-gray-500">Nenhum pedido pendente</p>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
              <Send className="text-steam-highlight w-6 h-6" /> Pedidos Enviados
            </h2>
            {outgoingRequests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {outgoingRequests.map(req => {
                  const receiver = users.find(u => u.id === req.receiverId);
                  if (!receiver) return null;
                  return (
                    <div key={req.id} className="bg-steam-dark p-6 rounded-3xl border border-transparent flex items-center gap-6 opacity-60">
                      <img src={receiver.avatar || undefined} className="w-16 h-16 rounded-2xl object-cover border border-transparent grayscale" alt={receiver.name} />
                      <div className="flex-1">
                        <h4 className="text-white font-black uppercase text-sm">{receiver.name}</h4>
                        <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest mt-1">Aguardando resposta...</p>
                      </div>
                      <div className="p-3 bg-white/5 text-gray-500 rounded-xl">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center bg-black/20 rounded-3xl border border-dashed border-transparent opacity-40">
                <p className="text-xs font-black uppercase tracking-widest text-gray-500">Você não enviou novos pedidos</p>
              </div>
            )}
          </section>
        </div>
      ) : (
        /* ABA DE DESCOBERTA */
        <div className="animate-fade-in space-y-8">
           {/* Barra de Pesquisa */}
           <div className="max-w-xl mx-auto mb-12">
              <div className="relative group">
                 <input 
                    type="text" 
                    placeholder="Buscar caçador por nome ou email..."
                    className="w-full bg-steam-dark border-2 border-transparent rounded-3xl p-5 pl-14 text-white font-bold outline-none focus:border-steam-highlight transition-all shadow-2xl placeholder:text-gray-600"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-steam-highlight transition-colors" />
                 {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-6 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                       <X className="w-4 h-4 text-gray-400" />
                    </button>
                 )}
              </div>
           </div>

           {nonFriends.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {nonFriends.map(user => {
                    const stats = getFriendStats(user);
                    return (
                        <div key={user.id} className="bg-steam-dark p-6 rounded-[32px] border border-transparent hover:border-steam-highlight/50 transition-all flex flex-col items-center text-center group shadow-xl">
                            <div className="relative mb-4 cursor-pointer" onClick={() => onNavigateProfile(user.id)}>
                                <img src={user.avatar || undefined} className="w-20 h-20 rounded-full border-4 border-steam-base object-cover shadow-2xl group-hover:scale-110 transition-transform" />
                                {user.isVip && <Gem className="absolute -top-1 -right-1 w-6 h-6 text-yellow-500 drop-shadow-lg" />}
                            </div>
                            <h3 
                              className="text-white font-black uppercase tracking-tight mb-1 truncate w-full cursor-pointer hover:text-steam-highlight"
                              onClick={() => onNavigateProfile(user.id)}
                            >
                              {user.name}
                            </h3>
                            <div className={`text-[8px] font-black uppercase tracking-widest mb-6 ${stats.levelInfo.color}`}>{stats.levelInfo.title}</div>
                            
                            <div className="w-full grid grid-cols-2 gap-2 mb-6">
                                <div className="bg-black/30 p-2 rounded-xl border border-transparent text-[10px] text-steam-highlight font-bold">{stats.xp} XP</div>
                                <div className="bg-black/30 p-2 rounded-xl border border-transparent text-[10px] text-gray-500 font-bold">LVL {stats.levelInfo.level}</div>
                            </div>

                            <button 
                                onClick={() => toggleFriend(user.id)}
                                className="w-full bg-white text-steam-dark py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-steam-highlight transition-all shadow-lg active:scale-95"
                            >
                                <UserPlus className="w-4 h-4" /> Adicionar
                            </button>
                        </div>
                    );
                })}
             </div>
           ) : (
             <div className="py-40 text-center opacity-20 border-2 border-dashed border-transparent rounded-[40px]">
                {searchTerm ? (
                  <Ghost className="w-20 h-20 mx-auto mb-6 text-gray-500" />
                ) : (
                  <Search className="w-20 h-20 mx-auto mb-6 text-gray-500" />
                )}
                <p className="text-xl font-black uppercase tracking-[0.4em] text-white">
                  {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum caçador isolado'}
                </p>
                <p className="text-xs mt-4 uppercase font-bold text-gray-400">
                  {searchTerm ? `A busca por "${searchTerm}" não retornou novos usuários.` : 'Todos os membros ativos já estão no seu círculo ou ocultos.'}
                </p>
             </div>
           )}
        </div>
      )}

      {/* MODAL DE OPÇÕES DO PERFIL (VER PERFIL / CHAT) */}
      {selectedFriendForOptions && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedFriendForOptions(null)}>
            <div className="bg-steam-base w-full max-w-sm rounded-[32px] border border-transparent shadow-5xl p-8 flex flex-col items-center gap-6 relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setSelectedFriendForOptions(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>
                
                <div className="flex flex-col items-center mb-4">
                    <img src={selectedFriendForOptions.avatar || undefined} className="w-24 h-24 rounded-full border-4 border-steam-highlight object-cover shadow-2xl mb-4" />
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{selectedFriendForOptions.name}</h2>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">O que deseja fazer?</p>
                </div>

                <div className="grid grid-cols-1 w-full gap-4">
                    <button 
                        onClick={() => { onNavigateProfile(selectedFriendForOptions.id); setSelectedFriendForOptions(null); }}
                        className="w-full bg-steam-light/20 hover:bg-steam-highlight text-white hover:text-steam-dark p-5 rounded-2xl border border-transparent flex items-center justify-center gap-4 transition-all font-black uppercase tracking-widest text-xs group"
                    >
                        <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Ver Perfil Completo
                    </button>
                    <button 
                        onClick={() => { onOpenChat(selectedFriendForOptions.id); setSelectedFriendForOptions(null); }}
                        className="w-full bg-steam-highlight text-steam-dark p-5 rounded-2xl border border-transparent flex items-center justify-center gap-4 transition-all font-black uppercase tracking-widest text-xs hover:bg-white group"
                    >
                        <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Iniciar Chat Privado
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};


import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Search, Plus, MessageSquare, Shield, Trash2, UserMinus, UserPlus, ArrowLeft, Send, Ghost, Clock } from 'lucide-react';
import { CommunityGroup, CommunityPost, CommunityMember } from '../types';
import { api } from '../backend';

export const CommunitiesView: React.FC = () => {
  const { currentUser, communityGroups, communityPosts, createCommunityGroup, joinCommunityGroup, leaveCommunityGroup, banUserFromGroup, unbanUserFromGroup, deleteCommunityGroup, createCommunityPost, getCommunityMembers, users, showToast, showConfirm } = useApp();
  const [viewMode, setViewMode] = useState<'list' | 'group'>('list');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupImage, setNewGroupImage] = useState('');

  const [groupMembers, setGroupMembers] = useState<CommunityMember[]>([]);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');

  const filteredGroups = useMemo(() => {
    return communityGroups.filter(g => 
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      g.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [communityGroups, searchTerm]);

  const selectedGroup = useMemo(() => {
    return communityGroups.find(g => g.id === selectedGroupId);
  }, [communityGroups, selectedGroupId]);

  const groupPosts = useMemo(() => {
    return communityPosts.filter(p => p.groupId === selectedGroupId);
  }, [communityPosts, selectedGroupId]);

  const isMember = useMemo(() => {
    return groupMembers.some(m => m.userId === currentUser?.id && !m.isBanned);
  }, [groupMembers, currentUser?.id]);

  const isBanned = useMemo(() => {
    return groupMembers.some(m => m.userId === currentUser?.id && m.isBanned);
  }, [groupMembers, currentUser?.id]);

  const userRole = useMemo(() => {
    const member = groupMembers.find(m => m.userId === currentUser?.id);
    return member?.role || 'none';
  }, [groupMembers, currentUser?.id]);

  const canManage = useMemo(() => {
    return currentUser?.isAdmin || userRole === 'admin' || selectedGroup?.ownerUserId === currentUser?.id;
  }, [currentUser, userRole, selectedGroup]);

  useEffect(() => {
    if (selectedGroupId && viewMode === 'group') {
      const fetchGroupMembers = async () => {
        const members = await getCommunityMembers(selectedGroupId);
        setGroupMembers(members);
      };
      fetchGroupMembers();
    }
  }, [selectedGroupId, viewMode, getCommunityMembers]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName || !newGroupDescription) return;
    await createCommunityGroup(newGroupName, newGroupDescription, newGroupImage);
    setIsCreatingGroup(false);
    setNewGroupName('');
    setNewGroupDescription('');
    setNewGroupImage('');
  };

  const handleJoinGroup = async () => {
    if (!selectedGroupId) return;
    await joinCommunityGroup(selectedGroupId);
    const members = await getCommunityMembers(selectedGroupId);
    setGroupMembers(members);
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroupId) return;
    await leaveCommunityGroup(selectedGroupId);
    const members = await getCommunityMembers(selectedGroupId);
    setGroupMembers(members);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !newPostTitle || !newPostContent) return;
    await createCommunityPost(selectedGroupId, newPostTitle, newPostContent);
    setIsCreatingPost(false);
    setNewPostTitle('');
    setNewPostContent('');
  };

  const handleBanUser = async (userId: string) => {
    if (!selectedGroupId) return;
    await banUserFromGroup(selectedGroupId, userId);
    const members = await getCommunityMembers(selectedGroupId);
    setGroupMembers(members);
  };

  const handleUnbanUser = async (userId: string) => {
    if (!selectedGroupId) return;
    await unbanUserFromGroup(selectedGroupId, userId);
    const members = await getCommunityMembers(selectedGroupId);
    setGroupMembers(members);
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupId) return;
    showConfirm("Tem certeza que deseja excluir este grupo?", async () => {
      await deleteCommunityGroup(selectedGroupId);
      setViewMode('list');
      setSelectedGroupId(null);
    });
  };

  if (viewMode === 'group' && selectedGroup) {
    if (isBanned && !currentUser?.isAdmin) {
      return (
        <div className="p-8 md:p-12 h-full flex flex-col items-center justify-center text-center">
          <div className="bg-red-500/10 p-8 rounded-full mb-6 border border-transparent">
            <Shield className="w-16 h-16 text-red-500" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Acesso Negado</h2>
          <p className="text-gray-400 max-w-md">Você foi banido desta comunidade por um administrador. Entre em contato com o suporte se achar que isso foi um erro.</p>
          <button onClick={() => setViewMode('list')} className="mt-8 px-8 py-3 bg-steam-light text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all">Voltar para Comunidades</button>
        </div>
      );
    }

    return (
      <div className="p-8 md:p-12 h-full animate-fade-in">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => setViewMode('list')} className="flex items-center gap-2 text-steam-highlight font-black uppercase text-[10px] tracking-widest mb-8 hover:translate-x-[-4px] transition-transform">
            <ArrowLeft className="w-4 h-4" /> Voltar para Lista
          </button>

          <header className="flex flex-col md:flex-row gap-8 items-start mb-12">
            <img src={selectedGroup.imageUrl || `https://picsum.photos/seed/${selectedGroup.id}/400/400`} className="w-32 h-32 rounded-3xl object-cover border-4 border-steam-dark shadow-2xl" alt={selectedGroup.name} />
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-4xl font-black text-white uppercase tracking-tight italic">{selectedGroup.name}</h1>
                {currentUser?.isAdmin && (
                  <button onClick={handleDeleteGroup} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-gray-400 text-lg mb-6 max-w-2xl">{selectedGroup.description}</p>
              <div className="flex gap-4">
                {!isMember ? (
                  <button onClick={handleJoinGroup} className="px-8 py-3 bg-steam-highlight text-steam-dark rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Entrar no Grupo
                  </button>
                ) : (
                  <>
                    <button onClick={() => setIsCreatingPost(true)} className="px-8 py-3 bg-steam-highlight text-steam-dark rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Nova Dúvida
                    </button>
                    <button onClick={handleLeaveGroup} className="px-8 py-3 bg-white/5 text-gray-400 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all flex items-center gap-2">
                      <UserMinus className="w-4 h-4" /> Sair do Grupo
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="bg-steam-dark p-6 rounded-3xl border border-transparent w-full md:w-64">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Membros ({groupMembers.length})</h3>
              <div className="space-y-3">
                {groupMembers.slice(0, 5).map(m => {
                  const user = users.find(u => u.id === m.userId);
                  if (!user) return null;
                  return (
                    <div key={m.userId} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <img src={user.avatar || undefined} className="w-8 h-8 rounded-full border border-transparent" alt={user.name} />
                        <div>
                          <div className="text-[11px] font-black text-white truncate w-24">{user.name}</div>
                          <div className="text-[8px] text-steam-highlight font-black uppercase tracking-widest">{m.role === 'admin' ? 'Admin' : 'Membro'}</div>
                        </div>
                      </div>
                      {canManage && m.userId !== currentUser?.id && (
                        <button 
                          onClick={() => m.isBanned ? handleUnbanUser(m.userId) : handleBanUser(m.userId)}
                          className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${m.isBanned ? 'bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white' : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'}`}
                        >
                          {m.isBanned ? <UserPlus className="w-3 h-3" /> : <UserMinus className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-8">
            <section>
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                <MessageSquare className="text-steam-highlight w-6 h-6" /> Discussões e Dúvidas
              </h2>
              
              {isCreatingPost && (
                <div className="bg-steam-dark p-8 rounded-3xl border border-steam-highlight/30 mb-8 animate-scale-in">
                  <h3 className="text-lg font-black text-white uppercase tracking-tight mb-6 italic">O que está acontecendo?</h3>
                  <form onSubmit={handleCreatePost} className="space-y-4">
                    <input 
                      type="text" 
                      required 
                      placeholder="Título da sua dúvida..." 
                      className="w-full bg-black/40 border border-transparent rounded-xl p-4 text-white focus:border-steam-highlight focus:outline-none font-bold"
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                    />
                    <textarea 
                      required 
                      placeholder="Descreva detalhadamente sua dúvida ou informação..." 
                      className="w-full bg-black/40 border border-transparent rounded-xl p-4 text-white focus:border-steam-highlight focus:outline-none font-bold min-h-[150px]"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                    />
                    <div className="flex gap-3 justify-end">
                      <button type="button" onClick={() => setIsCreatingPost(false)} className="px-6 py-3 bg-white/5 text-gray-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/10 transition-all">Cancelar</button>
                      <button type="submit" className="px-8 py-3 bg-steam-highlight text-steam-dark font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2">
                        <Send className="w-4 h-4" /> Publicar Post
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-6">
                {groupPosts.length > 0 ? groupPosts.map(post => {
                  const author = users.find(u => u.id === post.userId);
                  return (
                    <div key={post.id} className="bg-steam-dark p-8 rounded-3xl border border-transparent hover:border-transparent transition-all group">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <img src={author?.avatar || undefined} className="w-12 h-12 rounded-xl border border-transparent" alt={author?.name} />
                          <div>
                            <div className="text-sm font-black text-white uppercase tracking-tight">{author?.name}</div>
                            <div className="text-[8px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-2">
                              <Clock className="w-3 h-3" /> {new Date(post.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-white mb-4 group-hover:text-steam-highlight transition-colors">{post.title}</h3>
                      <p className="text-gray-400 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    </div>
                  );
                }) : (
                  <div className="py-20 text-center bg-black/20 rounded-3xl border border-dashed border-transparent opacity-40">
                    <Ghost className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500">Nenhuma discussão iniciada ainda.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12 h-full animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black text-white mb-2 tracking-tighter italic uppercase">Comunidades</h1>
            <p className="text-lg text-gray-400 font-medium italic opacity-60">Conecte-se com outros caçadores e tire suas dúvidas.</p>
          </div>
          <button 
            onClick={() => setIsCreatingGroup(true)}
            className="px-8 py-4 bg-steam-highlight text-steam-dark rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all shadow-2xl shadow-blue-500/20 flex items-center gap-3"
          >
            <Plus className="w-5 h-5" /> Criar Novo Grupo
          </button>
        </header>

        <div className="relative mb-12">
          <input
            type="text"
            placeholder="Buscar comunidades por nome ou descrição..."
            className="w-full bg-steam-dark border border-transparent rounded-2xl p-6 pl-16 text-white text-lg focus:border-steam-highlight focus:outline-none transition-all font-bold placeholder:text-gray-600 shadow-2xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="w-6 h-6 absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" />
        </div>

        {isCreatingGroup && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#1b2838] p-10 rounded-[40px] border border-transparent shadow-5xl max-w-lg w-full">
              <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-8 italic">Fundar Comunidade</h3>
              <form onSubmit={handleCreateGroup} className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase font-black text-gray-500 mb-2 ml-1 tracking-widest">Nome do Grupo</label>
                  <input type="text" required placeholder="Ex: Caçadores de Souls..." value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full bg-black/40 border border-transparent rounded-xl p-4 text-white focus:border-steam-highlight focus:outline-none font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-gray-500 mb-2 ml-1 tracking-widest">Descrição</label>
                  <textarea required placeholder="Sobre o que é este grupo?" value={newGroupDescription} onChange={(e) => setNewGroupDescription(e.target.value)} className="w-full bg-black/40 border border-transparent rounded-xl p-4 text-white focus:border-steam-highlight focus:outline-none font-bold min-h-[100px]" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-gray-500 mb-2 ml-1 tracking-widest">URL da Imagem (Opcional)</label>
                  <input type="text" placeholder="https://..." value={newGroupImage} onChange={(e) => setNewGroupImage(e.target.value)} className="w-full bg-black/40 border border-transparent rounded-xl p-4 text-white focus:border-steam-highlight focus:outline-none font-bold" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsCreatingGroup(false)} className="flex-1 py-4 bg-white/5 text-gray-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/10 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 bg-steam-highlight text-steam-dark font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white transition-all shadow-xl shadow-blue-500/20">Criar Grupo</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {filteredGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredGroups.map(group => (
              <div 
                key={group.id} 
                onClick={() => { setSelectedGroupId(group.id); setViewMode('group'); }}
                className="bg-steam-dark rounded-[32px] border border-transparent overflow-hidden group hover:border-steam-highlight/30 transition-all shadow-2xl cursor-pointer flex flex-col"
              >
                <div className="h-40 relative overflow-hidden">
                  <img src={group.imageUrl || `https://picsum.photos/seed/${group.id}/800/400`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={group.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-steam-dark via-transparent to-transparent"></div>
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3 group-hover:text-steam-highlight transition-colors">{group.name}</h3>
                  <p className="text-gray-500 text-sm line-clamp-3 mb-8 flex-1">{group.description}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-steam-highlight" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Comunidade Ativa</span>
                    </div>
                    <div className="w-10 h-10 bg-steam-highlight/10 rounded-xl flex items-center justify-center text-steam-highlight group-hover:bg-steam-highlight group-hover:text-steam-dark transition-all">
                      <ArrowLeft className="w-5 h-5 rotate-180" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-40 flex flex-col items-center justify-center text-center opacity-20 border-2 border-dashed border-transparent rounded-[40px]">
            <Ghost className="w-24 h-24 mb-6 text-gray-400" />
            <p className="text-xl font-black uppercase tracking-[0.4em] text-white">Nenhuma Comunidade Encontrada</p>
            <p className="text-sm mt-4">Seja o primeiro a fundar um grupo para este interesse!</p>
          </div>
        )}
      </div>
    </div>
  );
};

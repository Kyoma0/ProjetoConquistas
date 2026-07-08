
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Send, MessageSquare, Shield, Gem, X, Smile, Paperclip, Phone, Video } from 'lucide-react';

interface ChatViewProps {
  userId: string;
  onBack: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ userId, onBack }) => {
  const { users, currentUser, messages: allMessages, sendMessage, markMessagesAsRead } = useApp();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const targetUser = useMemo(() => users.find(u => u.id === userId), [users, userId]);

  // Filtrar mensagens apenas entre eu e o usuário alvo
  const chatMessages = useMemo(() => {
    if (!currentUser) return [];
    return allMessages.filter(m => 
      (m.senderId === currentUser.id && m.receiverId === userId) ||
      (m.senderId === userId && m.receiverId === currentUser.id)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [allMessages, currentUser, userId]);

  useEffect(() => {
    if (currentUser && userId) {
      markMessagesAsRead(userId);
    }
  }, [userId, currentUser, chatMessages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser) return;

    sendMessage(userId, inputText.trim());
    setInputText('');
  };

  if (!targetUser || !currentUser) return null;

  return (
    <div className="flex flex-col h-full bg-steam-base animate-fade-in">
      {/* Header do Chat */}
      <header className="p-6 bg-steam-dark border-b border-transparent flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-all">
                <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4">
                <div className="relative">
                    <img src={targetUser.avatar || undefined} className="w-12 h-12 rounded-xl object-cover border border-transparent" alt={targetUser.name} />
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-steam-green rounded-full border-2 border-steam-dark"></div>
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-white font-black uppercase text-sm tracking-tight">{targetUser.name}</h2>
                        {targetUser.isAdmin && <Shield className="w-3.5 h-3.5 text-red-500" />}
                        {targetUser.isVip && <Gem className="w-3.5 h-3.5 text-yellow-500" />}
                    </div>
                    <div className="text-[10px] text-steam-green font-black uppercase tracking-widest">Online • Visualizando Chat</div>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button className="p-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"><Phone className="w-5 h-5" /></button>
            <button className="p-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"><Video className="w-5 h-5" /></button>
        </div>
      </header>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-gradient-to-b from-steam-base to-[#0d0f13]">
        {chatMessages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              {!isMe && (
                <img src={targetUser.avatar || undefined} className="w-8 h-8 rounded-lg mr-3 mt-1 shrink-0" alt="Friend" />
              )}
              <div className={`max-w-[70%] space-y-1`}>
                <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-xl border
                    ${isMe ? 'bg-steam-highlight text-steam-dark border-steam-highlight/50 rounded-tr-none' : 'bg-white/5 text-gray-200 border-transparent rounded-tl-none'}
                `}>
                  {msg.text}
                </div>
                <div className={`text-[8px] text-gray-600 font-black uppercase tracking-widest ${isMe ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Barra de Input */}
      <footer className="p-6 bg-steam-dark border-t border-transparent shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-transparent focus-within:border-steam-highlight transition-all">
                <button type="button" className="p-3 text-gray-500 hover:text-white transition-colors"><Paperclip className="w-5 h-5" /></button>
                <input 
                    type="text" 
                    placeholder={`Enviar mensagem para ${targetUser.name}...`}
                    className="flex-1 bg-transparent border-none text-white text-sm font-medium outline-none p-3 placeholder:text-gray-600"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                />
                <button type="button" className="p-3 text-gray-500 hover:text-white transition-colors"><Smile className="w-5 h-5" /></button>
                <button 
                    type="submit" 
                    className="p-4 bg-steam-highlight text-steam-dark rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-500/10"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </form>
      </footer>
    </div>
  );
};

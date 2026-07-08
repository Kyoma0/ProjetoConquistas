
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Bot, Sparkles, MessageSquare } from 'lucide-react';
import { Game } from '../types';

interface AIAssistantProps {
  game: Game;
  onClose: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ game, onClose }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: `Olá! Eu sou seu assistente especializado em ${game.title}. Como posso te ajudar hoje? Posso dar dicas de conquistas, estratégias ou localizações de itens.` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messages.concat([{ role: 'user', text: userText }]),
          gameTitle: game.title
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const aiText = data.text || "Desculpe, tive um problema ao processar sua resposta. Pode tentar novamente?";
      setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch (err) {
      console.error("AI Error:", err);
      setMessages(prev => [...prev, { role: 'ai', text: "Ocorreu um erro na conexão com o assistente AI. Tente novamente mais tarde." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-end p-4 md:p-8 animate-fade-in">
      <div className="bg-[#1b2838] w-full max-w-md h-full max-h-[800px] rounded-3xl border border-transparent shadow-5xl flex flex-col overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-steam-highlight/20 to-transparent border-b border-transparent flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-steam-highlight rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-2xl">🦙</span>
            </div>
            <div>
              <h3 className="text-white font-black uppercase tracking-tight leading-none mb-1">AI Game Assistant</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-steam-green rounded-full animate-pulse"></div>
                <span className="text-[10px] text-steam-highlight font-black uppercase tracking-widest">Especialista em {game.title}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-steam-highlight text-steam-dark font-bold rounded-tr-none' 
                  : 'bg-white/5 text-gray-200 border border-transparent rounded-tl-none'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none border border-transparent flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-steam-highlight animate-spin" />
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Processando...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-6 bg-black/20 border-t border-transparent">
          <form onSubmit={handleSend} className="relative">
            <input 
              className="w-full bg-[#171a21] border border-transparent rounded-2xl p-4 pr-14 text-white text-sm outline-none focus:border-steam-highlight transition-all"
              placeholder="Pergunte sobre o jogo..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isTyping}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-steam-highlight text-steam-dark rounded-xl disabled:opacity-50 disabled:grayscale transition-all hover:scale-110"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="mt-4 flex items-center justify-center gap-2 opacity-30">
            <Sparkles className="w-3 h-3 text-steam-highlight" />
            <span className="text-[8px] text-white font-black uppercase tracking-widest">Powered by Gemini AI</span>
          </div>
        </div>
      </div>
    </div>
  );
};

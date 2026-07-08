
// @google/genai Live API implementation for gamer streaming simulation
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Radio, Users, MessageSquare, Mic, MicOff, Play, Square, Trophy, Gamepad2, Ghost, Video, Camera, StopCircle, Send, Heart, Settings } from 'lucide-react';

// Funções auxiliares para Áudio (Baseadas no SDK Gemini)
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): { data: string, mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export const Lives: React.FC = () => {
    const { games, currentUser } = useApp();
    const [selectedLive, setSelectedLive] = useState<any | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [transcription, setTranscription] = useState<string[]>([]);
    
    // Estados para "Abrir Live" (User as Streamer)
    const [isStreaming, setIsStreaming] = useState(false);
    const [showStreamSetup, setShowStreamSetup] = useState(false);
    const [streamGame, setStreamGame] = useState<string | null>(null);
    const [viewerCount, setViewerCount] = useState(0);
    const [likes, setLikes] = useState(0);

    // Refs para o Live API e Mídia
    const sessionRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamIntervalRef = useRef<number | null>(null);
    const userMediaStreamRef = useRef<MediaStream | null>(null);

    // Efeito para simular crescimento de audiência quando o usuário está em live
    useEffect(() => {
        let interval: number;
        if (isStreaming) {
            interval = window.setInterval(() => {
                setViewerCount(prev => prev + Math.floor(Math.random() * 5));
                if (Math.random() > 0.7) setLikes(prev => prev + 1);
            }, 5000);
        } else {
            setViewerCount(0);
            setLikes(0);
        }
        return () => clearInterval(interval);
    }, [isStreaming]);

    const startUserLive = async (gameTitle: string) => {
        setIsStreaming(true);
        setShowStreamSetup(false);
        setTranscription([`[SISTEMA]: Iniciando transmissão de ${gameTitle}...`]);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            
            // Pedir Câmera e Microfone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            userMediaStreamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        const source = inputCtx.createMediaStreamSource(stream);
                        const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;
                        
                        scriptProcessor.onaudioprocess = (e) => {
                            if (isMuted) return;
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
                        };
                        
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputCtx.destination);

                        // Enviar frames de vídeo para a IA analisar a live
                        if (canvasRef.current && videoRef.current) {
                            const ctx = canvasRef.current.getContext('2d');
                            streamIntervalRef.current = window.setInterval(() => {
                                if (ctx && videoRef.current) {
                                    ctx.drawImage(videoRef.current, 0, 0, 320, 240);
                                    canvasRef.current.toBlob(async (blob) => {
                                        if (blob) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                const base64 = (reader.result as string).split(',')[1];
                                                sessionPromise.then(s => s.sendRealtimeInput({
                                                    media: { data: base64, mimeType: 'image/jpeg' }
                                                }));
                                            };
                                            reader.readAsDataURL(blob);
                                        }
                                    }, 'image/jpeg', 0.5);
                                }
                            }, 2000);
                        }
                        
                        setTranscription(prev => [...prev, `[SISTEMA]: Você está AO VIVO! O público está entrando.`]);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        // Resposta do público/moderador AI em áudio
                        const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioData && audioContextRef.current) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
                            const buffer = await decodeAudioData(decode(audioData), audioContextRef.current, 24000, 1);
                            const source = audioContextRef.current.createBufferSource();
                            source.buffer = buffer;
                            source.connect(audioContextRef.current.destination);
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += buffer.duration;
                        }

                        // Comentários do chat AI
                        if (msg.serverContent?.modelTurn?.parts[0]?.text) {
                            const text = msg.serverContent.modelTurn.parts[0].text;
                            setTranscription(prev => [...prev, `[PÚBLICO]: ${text}`].slice(-12));
                        }
                    },
                    onclose: () => stopUserLive(),
                    onerror: () => stopUserLive()
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: `Você é o chat e o público de uma live na plataforma Master Achievement.
                    O usuário ${currentUser?.name} está transmitindo ${gameTitle}. 
                    Seja interativo, mande mensagens de apoio, faça perguntas sobre o jogo e reaja ao que ele faz na câmera.
                    Use gírias de chat da Twitch/YouTube Gaming (PogChamp, LUL, GG, etc).
                    Fale em português do Brasil.`
                }
            });

            sessionRef.current = await sessionPromise;
        } catch (err) {
            console.error(err);
            stopUserLive();
        }
    };

    const stopUserLive = () => {
        if (sessionRef.current) sessionRef.current = null;
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        if (userMediaStreamRef.current) {
            userMediaStreamRef.current.getTracks().forEach(track => track.stop());
            userMediaStreamRef.current = null;
        }
        if (audioContextRef.current) audioContextRef.current.close();
        if (scriptProcessorRef.current) scriptProcessorRef.current.disconnect();
        setIsStreaming(false);
        setStreamGame(null);
        setTranscription([]);
    };

    // Funcionalidade de assistir live (Existente)
    const startWatchLive = async (gameTitle: string) => {
        if (isConnected) return;
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsConnected(true);
                        const source = inputCtx.createMediaStreamSource(stream);
                        const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;
                        scriptProcessor.onaudioprocess = (e) => {
                            if (isMuted) return;
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputCtx.destination);
                        setTranscription(prev => [...prev, `[SISTEMA]: Conectado ao canal de ${gameTitle}.`]);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioData && audioContextRef.current) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
                            const buffer = await decodeAudioData(decode(audioData), audioContextRef.current, 24000, 1);
                            const source = audioContextRef.current.createBufferSource();
                            source.buffer = buffer;
                            source.connect(audioContextRef.current.destination);
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += buffer.duration;
                            sourcesRef.current.add(source);
                        }
                        if (msg.serverContent?.modelTurn?.parts[0]?.text) {
                            const text = msg.serverContent.modelTurn.parts[0].text;
                            setTranscription(prev => [...prev, `[STREAMER]: ${text}`].slice(-10));
                        }
                    },
                    onclose: () => stopWatchLive(),
                    onerror: () => stopWatchLive()
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
                    systemInstruction: `Você é um streamer brasileiro carismático jogando ${gameTitle}.`
                }
            });
            sessionRef.current = await sessionPromise;
        } catch (err) { console.error(err); }
    };

    const stopWatchLive = () => {
        if (sessionRef.current) sessionRef.current = null;
        sourcesRef.current.forEach(s => s.stop());
        sourcesRef.current.clear();
        if (audioContextRef.current) audioContextRef.current.close();
        if (scriptProcessorRef.current) scriptProcessorRef.current.disconnect();
        setIsConnected(false);
    };

    const activeStreams = useMemo(() => {
        return games.filter(g => g.isActive).slice(0, 4).map(g => ({
            ...g,
            viewers: Math.floor(Math.random() * 500) + 50,
            streamerName: `ProCaster_${g.publisher.split(' ')[0]}`
        }));
    }, [games]);

    return (
        <div className="p-8 md:p-12 h-full bg-gradient-to-br from-steam-base to-steam-dark overflow-y-auto custom-scrollbar">
            <header className="mb-12 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tighter italic flex items-center gap-3">
                        <Radio className="text-red-500 animate-pulse" /> Lives Ativas
                    </h1>
                    <p className="text-gray-400 font-medium italic opacity-60">Hub de Transmissão Master</p>
                </div>
                {!isStreaming && !selectedLive && (
                    <button 
                        onClick={() => setShowStreamSetup(true)}
                        className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center gap-3 transition-all shadow-2xl shadow-red-600/20"
                    >
                        <Video className="w-4 h-4" /> Iniciar Minha Live
                    </button>
                )}
            </header>

            {/* View de Produção (User Streaming) */}
            {isStreaming && (
                <div className="animate-scale-in max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8 pb-20">
                    <div className="lg:col-span-3 space-y-6">
                        <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-5xl border-2 border-red-600/30">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            <canvas ref={canvasRef} width="320" height="240" className="hidden" />
                            
                            {/* Overlay de Live */}
                            <div className="absolute top-6 left-6 flex items-center gap-4">
                                <div className="bg-red-600 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div> AO VIVO
                                </div>
                                <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded text-[10px] font-black flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5" /> {viewerCount}
                                </div>
                                <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded text-[10px] font-black flex items-center gap-2">
                                    <Heart className="w-3.5 h-3.5 text-red-500 fill-current" /> {likes}
                                </div>
                            </div>

                            <div className="absolute bottom-6 left-6">
                                <div className="text-white font-black text-2xl uppercase tracking-tighter drop-shadow-lg">{streamGame}</div>
                                <div className="text-steam-highlight text-xs font-bold uppercase tracking-widest">Streaming as {currentUser?.name}</div>
                            </div>

                            <div className="absolute top-6 right-6 flex flex-col gap-2">
                                <button className="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all"><Settings className="w-5 h-5" /></button>
                                <button onClick={() => setIsMuted(!isMuted)} className={`p-3 rounded-full backdrop-blur-md transition-all ${isMuted ? 'bg-red-600/40 text-red-500' : 'bg-black/40 text-white'}`}>
                                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-transparent">
                            <div className="flex items-center gap-4">
                                <img src={currentUser?.avatar || undefined} className="w-12 h-12 rounded-full border-2 border-red-500" alt="Avatar" />
                                <div>
                                    <div className="text-white font-black uppercase text-sm">{currentUser?.name}</div>
                                    <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Master Achievement Creator</div>
                                </div>
                            </div>
                            <button 
                                onClick={stopUserLive}
                                className="bg-white/5 hover:bg-red-600 text-red-500 hover:text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] border border-red-500/30 transition-all flex items-center gap-3"
                            >
                                <StopCircle className="w-4 h-4" /> Encerrar Transmissão
                            </button>
                        </div>
                    </div>

                    {/* Chat AI (Moderador/Público) */}
                    <div className="bg-steam-dark rounded-3xl border border-transparent flex flex-col h-full shadow-2xl relative overflow-hidden">
                        <div className="p-5 border-b border-transparent bg-black/20 flex items-center gap-3">
                            <MessageSquare className="w-4 h-4 text-steam-highlight" />
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Chat da Live</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                            {transcription.map((line, i) => (
                                <div key={i} className="animate-fade-in">
                                    <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${line.startsWith('[PÚBLICO]') ? 'text-steam-highlight' : 'text-blue-400'}`}>
                                        {line.split(': ')[0]}
                                    </div>
                                    <div className="text-xs text-gray-300 font-medium leading-relaxed bg-white/5 p-3 rounded-lg border border-transparent italic">
                                        {line.split(': ')[1]}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-5 bg-black/40 border-t border-transparent">
                            <div className="flex items-center gap-2 text-[8px] text-gray-500 font-black uppercase tracking-widest mb-2">
                                <div className="w-1.5 h-1.5 bg-steam-green rounded-full"></div> Sincronia de Chat Ativa
                            </div>
                            <div className="relative">
                                <input disabled placeholder="O público está reagindo..." className="w-full bg-white/5 border border-transparent rounded-xl p-3 text-xs text-gray-500 italic outline-none" />
                                <Send className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View de Lista de Lives (Assistir) */}
            {!selectedLive && !isStreaming && !showStreamSetup && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                    {activeStreams.length > 0 ? activeStreams.map(stream => (
                        <div key={stream.id} onClick={() => setSelectedLive(stream)} className="cursor-pointer group relative bg-steam-dark rounded-xl overflow-hidden border border-transparent hover:border-steam-highlight/50 transition-all shadow-2xl">
                            <div className="relative aspect-video">
                                <img src={stream.bannerUrl || stream.coverUrl || undefined} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60" alt={stream.title} />
                                <div className="absolute top-3 left-3 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                                    <div className="w-1 h-1 bg-white rounded-full animate-ping"></div> AO VIVO
                                </div>
                                <div className="absolute bottom-3 left-3 bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                    <Users className="w-3 h-3" /> {stream.viewers} Assistindo
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                    <Play className="w-12 h-12 text-white fill-white" />
                                </div>
                            </div>
                            <div className="p-4 flex items-center gap-3">
                                <img src={`https://ui-avatars.com/api/?name=${stream.streamerName}&background=random`} className="w-10 h-10 rounded-full border border-transparent" alt="Avatar" />
                                <div>
                                    <div className="text-sm font-black text-white uppercase tracking-tight line-clamp-1">{stream.title}</div>
                                    <div className="text-[10px] text-gray-500 font-bold uppercase">{stream.streamerName}</div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-40 flex flex-col items-center justify-center text-center opacity-20 italic">
                            <Ghost className="w-20 h-20 mb-6" />
                            <p className="text-sm font-black uppercase tracking-[0.4em]">Nenhuma Live Detectada</p>
                        </div>
                    )}
                </div>
            )}

            {/* View Assistindo Live */}
            {selectedLive && !isStreaming && (
                <div className="animate-scale-in max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-5xl border border-transparent">
                            <img src={selectedLive.bannerUrl || selectedLive.coverUrl || undefined} className="w-full h-full object-cover opacity-30 blur-sm" alt="Banner BG" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <Radio className={`w-24 h-24 mb-6 ${isConnected ? 'text-red-500 animate-pulse' : 'text-gray-700'}`} />
                                <h2 className="text-2xl font-black text-white uppercase tracking-widest text-center px-10">
                                    {isConnected ? 'Transmitindo Sincronia Master' : 'Link Neural Desconectado'}
                                </h2>
                                {!isConnected ? (
                                    <button 
                                        onClick={() => startWatchLive(selectedLive.title)}
                                        className="mt-8 bg-steam-highlight text-steam-dark px-10 py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:scale-105 transition-all shadow-2xl shadow-blue-500/20"
                                    >
                                        <Radio className="w-4 h-4" /> Entrar no Canal
                                    </button>
                                ) : (
                                    <button 
                                        onClick={stopWatchLive}
                                        className="mt-8 bg-red-600 text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:scale-105 transition-all shadow-2xl"
                                    >
                                        <Square className="w-4 h-4 fill-current" /> Sair do Canal
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <img src={`https://ui-avatars.com/api/?name=${selectedLive.streamerName}&background=random`} className="w-14 h-14 rounded-full border-2 border-steam-highlight" alt="Streamer" />
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">{selectedLive.title}</h3>
                                    <p className="text-sm text-steam-highlight font-bold uppercase tracking-widest">{selectedLive.streamerName}</p>
                                </div>
                            </div>
                            <button onClick={() => { stopWatchLive(); setSelectedLive(null); }} className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white">Voltar para a Lista</button>
                        </div>
                    </div>
                    <div className="bg-steam-dark rounded-2xl border border-transparent flex flex-col h-[500px] lg:h-auto shadow-2xl">
                        <div className="p-4 border-b border-transparent flex items-center justify-between">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-steam-highlight" /> Chat do Streamer
                            </span>
                            <div className="flex items-center gap-1 text-[9px] text-gray-500 font-bold uppercase">
                                <Users className="w-3 h-3" /> {selectedLive.viewers}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {transcription.map((line, i) => (
                                <div key={i} className="text-xs animate-fade-in bg-white/5 p-3 rounded-lg border border-transparent">
                                    <span className={`font-black uppercase tracking-tighter mr-2 ${line.startsWith('[SISTEMA]') ? 'text-blue-400' : 'text-steam-highlight'}`}>
                                        {line.split(': ')[0]}
                                    </span>
                                    <span className="text-gray-300 italic font-medium">{line.split(': ')[1]}</span>
                                </div>
                            ))}
                        </div>
                        {isConnected && (
                            <div className="p-4 bg-black/40 border-t border-transparent">
                                <button onClick={() => setIsMuted(!isMuted)} className={`w-full p-3 rounded-xl transition-all flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest ${isMuted ? 'bg-red-600/20 text-red-500' : 'bg-steam-highlight text-steam-dark'}`}>
                                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                    {isMuted ? 'Microfone Mutado' : 'Falar com Streamer'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Setup da Live */}
            {showStreamSetup && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 backdrop-blur-xl animate-fade-in">
                    <div className="bg-steam-base w-full max-w-lg rounded-3xl border border-transparent shadow-5xl p-8 relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-600/10 rounded-full blur-3xl"></div>
                        
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-red-600/10 rounded-xl border border-red-600/20"><Camera className="w-6 h-6 text-red-500" /></div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Configurar Transmissão</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] text-gray-500 font-black uppercase mb-3 block tracking-widest">Escolha o jogo para transmitir</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {games.filter(g => g.isActive).slice(0, 6).map(game => (
                                        <button 
                                            key={game.id}
                                            onClick={() => setStreamGame(game.title)}
                                            className={`p-2 rounded-xl border transition-all flex flex-col items-center gap-2 group ${streamGame === game.title ? 'bg-red-600/10 border-red-500' : 'bg-white/5 border-transparent hover:border-transparent'}`}
                                        >
                                            <img src={game.coverUrl || undefined} className="w-full aspect-[2/3] object-cover rounded-lg group-hover:scale-105 transition-transform" />
                                            <span className={`text-[8px] font-black uppercase truncate w-full text-center ${streamGame === game.title ? 'text-red-500' : 'text-gray-500'}`}>{game.title}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setShowStreamSetup(false)} className="flex-1 bg-white/5 text-gray-500 font-black uppercase text-[10px] tracking-widest py-4 rounded-xl">Cancelar</button>
                                <button 
                                    disabled={!streamGame}
                                    onClick={() => startUserLive(streamGame!)}
                                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-red-600/20"
                                >
                                    Ficar Online
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

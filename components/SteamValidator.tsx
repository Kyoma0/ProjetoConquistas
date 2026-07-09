
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AchievementStatus } from '../types';
import { X, CheckCircle2, AlertCircle, Loader2, Globe, ArrowRight, RefreshCw, Server, ShieldCheck, Database, LogIn } from 'lucide-react';

interface SteamValidatorProps {
  gameId: string;
  onClose: () => void;
}

export const SteamValidator: React.FC<SteamValidatorProps> = ({ gameId, onClose }) => {
  const { syncSteamAchievements, getSteamAuthUrl, achievements, games, updateProgress, userProgress, showToast, currentUser, updateUser } = useApp();
  const [steamId, setSteamId] = useState('');
  const [manualSteamId, setManualSteamId] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<any[]>([]);
  const [unmatchedSteamAchievements, setUnmatchedSteamAchievements] = useState<any[]>([]);
  const [debugData, setDebugData] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await fetch('/api/steam/config');
        const data = await res.json();
        setIsConfigured(data.isConfigured);
      } catch (err) {
        console.error("Failed to check Steam config", err);
      }
    };
    checkConfig();
  }, []);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'STEAM_AUTH_SUCCESS') {
        const sid = event.data.steamId;
        setSteamId(sid);
        
        // Link to profile if not already linked
        if (currentUser && !currentUser.steamId) {
          updateUser(currentUser.id, { steamId: sid });
        }
        
        await performSync(sid);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [gameId]);

  const handleSteamLogin = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      const { url } = await getSteamAuthUrl();
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const authWindow = window.open(
        url,
        'steam_auth_popup',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        showToast("O popup foi bloqueado pelo navegador. Por favor, permita popups.", "error");
        setIsSyncing(false);
        return;
      }

      // Check if popup is closed
      const checkPopup = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkPopup);
          setIsSyncing(false);
          // If steamId is still empty, it means the user closed the window or it failed
          if (!steamId) {
            console.log("Steam auth popup closed without success.");
          }
        }
      }, 1000);
    } catch (err) {
      setError("Falha ao iniciar autenticação Steam.");
      setIsSyncing(false);
    }
  };

  const handleManualLink = async (customId?: string) => {
    const idToLink = (customId || manualSteamId).trim();
    if (!idToLink) return;

    if (!/^\d{17}$/.test(idToLink)) {
      setError("O SteamID64 deve ser um número de exatamente 17 dígitos (ex: 76561198000000000).");
      return;
    }

    setError(null);
    setSteamId(idToLink);

    if (currentUser) {
      try {
        await updateUser(currentUser.id, { steamId: idToLink });
      } catch (err) {
        console.error("Failed to save steamId to profile", err);
      }
    }

    await performSync(idToLink);
  };

  const performSync = async (sid: string) => {
    setIsSyncing(true);
    setError(null);
    setSyncResults([]);

    try {
      const unlockedFromSteam = await syncSteamAchievements(sid, gameId);
      
      const game = games.find(g => g.id === gameId);
      setDebugData({
        gameId,
        steamAppId: game?.steamAppId,
        steamId: sid,
        rawSteamResponse: unlockedFromSteam,
        localAchievements: achievements.filter(a => a.gameId === gameId)
      });

      const matched: any[] = [];
      const unmatched: any[] = [];

      unlockedFromSteam.forEach((steamAch: any) => {
        const apiName = steamAch.apiname;
        
        const found = achievements.find(a => {
          if (a.gameId !== gameId) return false;
          
          // 1. Match by steamApiName (Case-insensitive)
          if (a.steamApiName && a.steamApiName.trim().toLowerCase() === apiName.trim().toLowerCase()) {
            return true;
          }
          
          // 2. Fallback: Match by display name (Case-insensitive)
          if (a.name.trim().toLowerCase() === apiName.trim().toLowerCase()) {
            return true;
          }

          return false;
        });

        if (found) {
          matched.push(found);
        } else {
          unmatched.push(steamAch);
        }
      });

      setSyncResults(matched);
      setUnmatchedSteamAchievements(unmatched);

      if (matched.length === 0) {
        if (unmatched.length > 0) {
          setError("A Steam retornou conquistas, mas nenhuma corresponde ao catálogo. Verifique os IDs técnicos abaixo.");
        } else {
          setError("Nenhuma conquista nova detectada no seu perfil Steam para este jogo.");
        }
      } else {
        showToast(`${matched.length} conquistas encontradas!`, "success");
      }
    } catch (err: any) {
      setError(err.message || "Falha ao conectar com os servidores da Steam. Verifique se o perfil é público.");
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApplySync = () => {
    let count = 0;
    syncResults.forEach(ach => {
      const isAlreadyUnlocked = userProgress[ach.id]?.status === AchievementStatus.COMPLETED;
      if (!isAlreadyUnlocked) {
        updateProgress(ach.id, AchievementStatus.COMPLETED, undefined, 'visual_steam');
        count++;
      }
    });

    if (count > 0) {
      showToast(`${count} conquistas sincronizadas com sucesso!`, "success");
      onClose();
    } else {
      setError("Todas as conquistas detectadas já estão desbloqueadas no seu perfil local.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/98 z-[120] flex items-center justify-center p-4 backdrop-blur-2xl">
      <div className="bg-[#0b0e14] w-full max-w-xl rounded-2xl border border-transparent shadow-[0_0_50px_rgba(102,192,244,0.15)] flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#171a21] to-[#0b0e14] border-b border-transparent flex justify-between items-center">
           <div className="flex items-center gap-4">
              <div className="p-2.5 bg-steam-highlight/10 rounded-lg border border-transparent">
                 <Server className="w-5 h-5 text-steam-highlight" />
              </div>
              <div>
                 <h2 className="text-sm font-black text-white uppercase tracking-[0.3em]">Sincronizador Steam API</h2>
                 <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-steam-green"></span>
                    <span className="text-[9px] text-steam-green font-black uppercase tracking-widest">Conexão Estabelecida</span>
                 </div>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors group">
              <X className="w-5 h-5 text-gray-500 group-hover:text-white" />
           </button>
        </div>

        {/* Conteúdo */}
        <div className="p-8 overflow-y-auto flex-1 flex flex-col bg-[#0d1117] relative">
           {isConfigured === false && (
             <div className="mb-8 p-6 bg-red-600/10 border border-red-500/20 rounded-2xl animate-fade-in">
                <div className="flex items-center gap-3 mb-4 text-red-500">
                   <AlertCircle className="w-6 h-6" />
                   <h3 className="text-sm font-black uppercase tracking-widest">Configuração Necessária</h3>
                </div>
                <p className="text-xs text-red-200/70 leading-relaxed mb-4">
                   A **Steam Web API Key** não foi configurada no servidor. Esta chave é obrigatória para sincronizar conquistas.
                </p>
                <div className="space-y-3">
                   <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Como resolver:</div>
                   <ol className="text-[10px] text-gray-400 space-y-2 list-decimal list-inside font-medium">
                      <li>Obtenha sua chave em: <a href="https://steamcommunity.com/dev/apikey" target="_blank" className="text-steam-highlight hover:underline">steamcommunity.com/dev/apikey</a></li>
                      <li>Abra as **Configurações** do projeto no AI Studio.</li>
                      <li>Adicione a variável `STEAM_API_KEY` com sua chave.</li>
                   </ol>
                </div>
             </div>
           )}

           {!syncResults.length && !unmatchedSteamAchievements.length && !isSyncing ? (
             <div className="animate-fade-in text-center py-10">
                <div className="w-20 h-20 bg-steam-highlight/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-transparent">
                   <Globe className="w-10 h-10 text-steam-highlight" />
                </div>
                
                {currentUser?.steamId ? (
                  <>
                    <h3 className="text-white font-black text-xl mb-4 uppercase tracking-tighter">Steam Vinculada</h3>
                    <div className="bg-steam-green/10 border border-steam-green/20 rounded-xl p-4 mb-8 max-w-sm mx-auto">
                       <div className="text-[10px] text-steam-green font-black uppercase tracking-widest mb-1">ID da Conta</div>
                       <div className="text-white font-mono text-lg tracking-wider">{currentUser.steamId}</div>
                    </div>
                    <p className="text-gray-500 max-w-sm mx-auto mb-8 text-sm leading-relaxed">
                        Sua conta Steam já está vinculada. Clique abaixo para sincronizar as conquistas deste jogo.
                    </p>
                    
                    <div className="max-w-xs mx-auto">
                       <button 
                         onClick={() => performSync(currentUser.steamId!)}
                         disabled={isConfigured === false}
                         className={`w-full font-black uppercase tracking-[0.2em] py-4 rounded-xl flex items-center justify-center gap-3 transition-all text-xs ${isConfigured === false ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-steam-highlight text-steam-dark hover:bg-white shadow-[0_0_20px_rgba(102,192,244,0.3)] hover:scale-105 active:scale-95'}`}
                       >
                          <RefreshCw className="w-4 h-4" /> Sincronizar Agora
                       </button>
                       {showManualInput ? (
                         <div className="pt-4 text-left animate-fade-in">
                           <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Novo ID Steam (SteamID64)</label>
                           <div className="flex gap-2">
                             <input 
                               type="text"
                               placeholder="76561198000000000"
                               value={manualSteamId}
                               onChange={(e) => setManualSteamId(e.target.value)}
                               className="flex-1 !bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-steam-highlight/50 transition-all font-mono"
                             />
                             <button 
                               onClick={() => handleManualLink()}
                               disabled={!manualSteamId.trim()}
                               className="px-4 bg-steam-highlight text-steam-dark font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-white transition-all disabled:opacity-50"
                             >
                               Alterar
                             </button>
                           </div>
                           <button 
                             onClick={() => setShowManualInput(false)}
                             className="mt-2 text-[9px] text-gray-500 hover:text-white uppercase font-bold tracking-wider"
                           >
                             Cancelar
                           </button>
                         </div>
                       ) : (
                         <div className="flex flex-col gap-2">
                           <button 
                             onClick={handleSteamLogin}
                             disabled={isConfigured === false}
                             className={`mt-4 w-full text-[10px] font-black uppercase tracking-widest transition-colors ${isConfigured === false ? 'text-gray-700 cursor-not-allowed' : 'text-gray-500 hover:text-white'}`}
                           >
                              Trocar de Conta Steam (Automático)
                           </button>
                           <button 
                             onClick={() => {
                               setManualSteamId(currentUser?.steamId || '');
                               setShowManualInput(true);
                             }}
                             className="w-full text-[10px] font-black uppercase tracking-widest transition-colors text-gray-500 hover:text-white"
                           >
                              Alterar ID Manualmente
                           </button>
                         </div>
                       )}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-white font-black text-xl mb-4 uppercase tracking-tighter">Vincular Conta Steam</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mb-6 text-sm leading-relaxed">
                        Escolha uma das opções abaixo para sincronizar as conquistas que você já desbloqueou na Steam.
                    </p>
                    
                    <div className="max-w-sm mx-auto space-y-6">
                       <div>
                         <button 
                           onClick={handleSteamLogin}
                           disabled={isConfigured === false}
                           className={`w-full border border-transparent font-black uppercase tracking-[0.2em] py-4 rounded-xl flex items-center justify-center gap-3 transition-all text-xs ${isConfigured === false ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-[#171a21] hover:bg-[#2a475e] text-white shadow-[0_0_20px_rgba(102,192,244,0.1)] hover:scale-105 active:scale-95'}`}
                         >
                            <LogIn className="w-4 h-4 text-steam-highlight" /> Entrar com Steam
                         </button>
                         <p className="text-[9px] text-gray-600 mt-2 text-center">
                           * Método automático via pop-up de login da Steam.
                         </p>
                       </div>

                       <div className="h-px bg-white/5 flex items-center justify-center relative">
                         <span className="bg-[#0d1117] px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest">OU INSERIR MANUALMENTE</span>
                       </div>

                       <div className="text-left bg-black/20 p-4 rounded-xl border border-white/5">
                         <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">ID da Conta Steam (SteamID64)</label>
                         <div className="flex gap-2">
                           <input 
                             type="text"
                             placeholder="Ex: 76561198031524385"
                             value={manualSteamId}
                             onChange={(e) => setManualSteamId(e.target.value)}
                             className="flex-1 !bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-steam-highlight/50 transition-all font-mono"
                           />
                           <button 
                             onClick={() => handleManualLink()}
                             disabled={!manualSteamId.trim()}
                             className="px-4 bg-steam-highlight/10 text-steam-highlight border border-steam-highlight/20 font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-steam-highlight hover:text-steam-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                           >
                             Vincular
                           </button>
                         </div>
                         <p className="text-[9px] text-gray-500 mt-2.5 leading-relaxed">
                           Seu ID da Steam é o código numérico de 17 dígitos (SteamID64). Você pode encontrá-lo nas configurações do seu perfil Steam ou no site <a href="https://steamid.io" target="_blank" rel="noreferrer" className="text-steam-highlight hover:underline font-bold">steamid.io</a>.
                         </p>
                       </div>
                    </div>
                  </>
                )}

                <p className="mt-8 text-[9px] text-gray-600 uppercase font-black tracking-widest leading-relaxed">
                    Atenção: Seu perfil e detalhes do jogo devem estar configurados como **Públicos** nas configurações de privacidade da Steam.
                </p>
             </div>
           ) : isSyncing ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 animate-pulse">
                 <Loader2 className="w-16 h-16 text-steam-highlight animate-spin mb-6" />
                 <h4 className="text-white font-black uppercase tracking-[0.3em] text-sm">Consultando Banco Steam...</h4>
                 <p className="text-[10px] text-gray-500 mt-2 font-black uppercase tracking-widest italic">Aguardando resposta do servidor mestre</p>
              </div>
           ) : (
              <div className="animate-fade-in space-y-6">
                  {(syncResults.length > 0 || unmatchedSteamAchievements.length > 0) && (
                    <div className="bg-steam-highlight/5 p-6 rounded-2xl border border-transparent flex items-center justify-between">
                       <div>
                           <h4 className="text-white font-black uppercase text-sm mb-1">Sincronização Concluída</h4>
                           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                             {syncResults.length} mapeadas | {unmatchedSteamAchievements.length} não mapeadas
                           </p>
                       </div>
                       <ShieldCheck className="w-10 h-10 text-steam-green" />
                    </div>
                  )}

                  {syncResults.length > 0 && (
                    <div className="grid gap-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                       {syncResults.map((ach, idx) => (
                          <div key={idx} className="flex justify-between items-center p-4 bg-black/40 rounded-xl border border-transparent hover:border-steam-highlight/20 transition-all">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white/5 rounded flex items-center justify-center text-xl grayscale-0">{ach.icon}</div>
                                <div>
                                   <div className="text-white text-xs font-black uppercase tracking-tight">{ach.name}</div>
                                   <div className={`text-[8px] font-bold uppercase tracking-widest ${userProgress[ach.id]?.status === AchievementStatus.COMPLETED ? 'text-gray-600' : 'text-steam-green'}`}>
                                       {userProgress[ach.id]?.status === AchievementStatus.COMPLETED ? 'Já Desbloqueada' : 'Pendente Sincronia'}
                                   </div>
                                </div>
                             </div>
                             <CheckCircle2 className={`w-5 h-5 ${userProgress[ach.id]?.status === AchievementStatus.COMPLETED ? 'text-gray-700' : 'text-steam-green'}`} />
                          </div>
                       ))}
                    </div>
                  )}

                  {unmatchedSteamAchievements.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-white/5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-gray-500">
                          <AlertCircle className="w-4 h-4" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest">Conquistas não mapeadas na Steam</h4>
                        </div>
                        <button 
                          onClick={() => setShowDebug(!showDebug)}
                          className="text-[9px] text-gray-600 hover:text-white uppercase font-black tracking-widest"
                        >
                          {showDebug ? 'Esconder Debug' : 'Ver Debug'}
                        </button>
                      </div>

                      {showDebug && debugData && (
                        <div className="mb-6 p-4 bg-black/60 rounded-xl border border-white/5 font-mono text-[9px] text-gray-400 overflow-x-auto">
                          <div className="mb-2 text-steam-highlight font-bold">DEBUG INFO:</div>
                          <pre>{JSON.stringify({
                            gameId: debugData.gameId,
                            steamAppId: debugData.steamAppId,
                            steamId: debugData.steamId,
                            totalSteamUnlocked: debugData.rawSteamResponse?.length,
                            localAchievementsCount: debugData.localAchievements?.length
                          }, null, 2)}</pre>
                          <div className="mt-4 mb-2 text-steam-highlight font-bold">RAW STEAM APINAMES:</div>
                          <div className="flex flex-wrap gap-2">
                            {debugData.rawSteamResponse?.map((a: any) => (
                              <span key={a.apiname} className="px-2 py-1 bg-white/5 rounded">{a.apiname}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] text-gray-600 mb-4 leading-relaxed">
                        Estas conquistas foram encontradas na Steam, mas não estão vinculadas ao seu projeto. 
                        Copie o **ID Técnico** e cole no campo "Steam API Name" da conquista correspondente no Painel Admin.
                      </p>
                      <div className="space-y-2">
                        {unmatchedSteamAchievements.map((ua, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-transparent">
                            <span className="text-[10px] text-gray-400 font-mono">{ua.apiname}</span>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(ua.apiname);
                                showToast("ID copiado!", "success");
                              }}
                              className="text-[9px] text-steam-highlight font-black uppercase hover:underline"
                            >
                              Copiar ID
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
               </div>
           )}

           {error && !isSyncing && (
             <div className="mt-6 p-5 bg-red-600/10 border border-transparent text-red-400 rounded-xl flex items-start gap-4 animate-shake">
                <AlertCircle className="shrink-0 w-5 h-5 mt-0.5" />
                <div>
                    <div className="text-xs font-black uppercase tracking-widest mb-1">Erro de Sincronização</div>
                    <span className="text-xs font-medium opacity-80 leading-relaxed">
                        {error}
                        <br />
                        <a 
                          href="https://steamcommunity.com/my/edit/settings" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-steam-highlight hover:underline mt-2 inline-block font-bold"
                        >
                          Clique aqui para ajustar sua privacidade na Steam
                        </a>
                    </span>
                </div>
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-[#0b0e14] border-t border-transparent flex justify-end gap-4">
           {(syncResults.length > 0 || unmatchedSteamAchievements.length > 0) && (
              <button 
                onClick={() => {
                  setSyncResults([]);
                  setUnmatchedSteamAchievements([]);
                  setError(null);
                }} 
                className="px-6 py-2 text-[10px] text-gray-500 hover:text-white font-black uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                 <RefreshCw className="w-3.5 h-3.5" /> Tentar Novamente
              </button>
           )}
           
           {syncResults.length > 0 && (
              <button 
                onClick={handleApplySync} 
                className="bg-steam-green text-steam-dark font-black uppercase tracking-[0.2em] px-10 py-3 rounded-lg flex items-center gap-3 hover:scale-105 transition-all shadow-[0_0_20px_rgba(164,208,7,0.2)] text-[11px]"
              >
                 <CheckCircle2 className="w-4 h-4" /> Aplicar no Perfil Local
              </button>
           )}
           
           {(!syncResults.length && !unmatchedSteamAchievements.length && !isSyncing) && (
              <button onClick={onClose} className="px-6 py-2 text-[10px] text-gray-500 hover:text-white font-black uppercase tracking-widest">Fechar Painel</button>
           )}
        </div>
      </div>
    </div>
  );
};

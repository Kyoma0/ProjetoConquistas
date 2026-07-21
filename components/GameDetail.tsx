
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Game, AchievementStatus, Difficulty, Achievement, Content, ContentType, MapHotspot, Hotspot } from '../types';
import { useApp } from '../context/AppContext';
import { AVAILABLE_ICONS } from '../constants';
import { 
  Trophy, Video, Image as ImageIcon, CheckCircle2, EyeOff, BookOpen, Lightbulb, X, PlayCircle, 
  Camera, Edit3, Plus, Save, Trash2, Clock, Lock, ArrowUpRight, Target, Info, MessageSquare, 
  History, AlertTriangle, Eye, Settings, ChevronUp, ChevronDown, Layout, PlusCircle, AlertCircle, 
  ListChecks, Settings2, Send, Maximize, AlignLeft, AlignCenter, AlignRight, PanelTop, PanelBottom, 
  Library, Heart, Scan, Monitor, ShieldCheck, Zap, RefreshCw, Layers, Loader2, Globe, MousePointer2, 
  Square, ChevronLeft, ZoomIn, ZoomOut, Move, ExternalLink, Star, Gamepad2, Sword, Map, Compass, 
  Flag, Key, Unlock, User, Users, Home, Search, Bell, Mail, Calendar, HelpCircle, Minus, 
  ChevronRight, ArrowRight, ArrowLeft, Download, Upload, Share2, Maximize2, GripVertical
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  horizontalListSortingStrategy,
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SteamValidator } from './SteamValidator';
import { RenderAchIcon } from './AdminPanel';
import { AIAssistant } from './AIAssistant';
import { InteractiveMap } from './InteractiveMap';
import { chunkedUpload } from '../services/uploadService';
import { api } from '../backend';

interface GameDetailProps {
  game: Game;
  onNavigateProfile: (userId: string) => void;
}

const getDifficultyColor = (diff: Difficulty) => {
  switch (diff) {
    case 'Fácil': return 'text-green-400';
    case 'Médio': return 'text-yellow-400';
    case 'Difícil': return 'text-orange-400';
    case 'Extremo': return 'text-red-500 font-bold';
    default: return 'text-gray-400';
  }
};

const IconRenderer: React.FC<{ name: string, className?: string, style?: React.CSSProperties }> = ({ name, className, style }) => {
  const icons: Record<string, any> = {
    Trophy, Video, ImageIcon, CheckCircle2, EyeOff, BookOpen, Lightbulb, X, PlayCircle, 
    Camera, Edit3, Plus, Save, Trash2, Clock, Lock, ArrowUpRight, Target, Info, MessageSquare, 
    History, AlertTriangle, Eye, Settings, ChevronUp, ChevronDown, Layout, PlusCircle, AlertCircle, 
    ListChecks, Settings2, Send, Maximize, AlignLeft, AlignCenter, AlignRight, PanelTop, PanelBottom, 
    Library, Heart, Scan, Monitor, ShieldCheck, Zap, RefreshCw, Layers, Loader2, Globe, MousePointer2, 
    Square, ChevronLeft, ZoomIn, ZoomOut, Move, ExternalLink, Star, Gamepad2, Sword, Map, Compass, 
    Flag, Key, Unlock, User, Users, Home, Search, Bell, Mail, Calendar, HelpCircle, Minus, 
    ChevronRight, ArrowRight, ArrowLeft, Download, Upload, Share2, Maximize2, GripVertical
  };
  
  const IconComponent = icons[name];
  if (!IconComponent) return null;
  return <IconComponent className={className} style={style} />;
};

// --- COMPONENTE DE ITEM DE SUB-PÁGINA SORTABLE ---
const SortableSubPageItem: React.FC<{
  sp: any;
  isActive: boolean;
  isEditMode: boolean;
  onClick: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}> = ({ sp, isActive, isEditMode, onClick, onDelete, onRename }) => {
  const { showConfirm } = useApp();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: sp.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-1.5 bg-[#10141d]/60 border rounded-xl px-3 py-2 transition-all ${isActive ? 'bg-[#1b2838]/60 border-steam-highlight/30 text-steam-highlight shadow-lg' : 'text-gray-400 border-white/5 hover:border-white/10 hover:text-white'}`}
    >
      {isEditMode && (
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-gray-600 hover:text-steam-highlight cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      )}
      
      <button 
        onClick={onClick}
        className="text-[10px] font-black uppercase tracking-widest transition-all text-left min-w-0 pr-1"
      >
        <span className="truncate">{sp.title}</span>
      </button>

      {isEditMode && (
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const newTitle = prompt('Novo título:', sp.title);
              if (newTitle) onRename(sp.id, newTitle);
            }}
            className="p-1 text-gray-500 hover:text-steam-highlight"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              showConfirm('Tem certeza que deseja excluir esta página e todo o seu conteúdo?', () => {
                onDelete(sp.id);
              });
            }}
            className="p-1 text-gray-500 hover:text-red-500"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE DE BLOCO DO BUILDER (PÁGINA RICA) ---
const BuilderBlock: React.FC<{ 
  content: Content, 
  isEditMode: boolean,
  onMove: (dir: 'up' | 'down') => void,
  onDelete: (id: string) => void,
  onUpdate: (content: Content) => void,
  onNavigateSubPage: (id: string) => void,
  onAddBlock: (type: ContentType, order: number) => void
}> = ({ content, isEditMode, onMove, onDelete, onUpdate, onNavigateSubPage, onAddBlock }) => {
  const { addSubPage, subPages } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editingHotspot, setEditingHotspot] = useState<any>(null);
  const [tempValue, setTempValue] = useState<Content>(content);
  const [zoom, setZoom] = useState(content.zoom || 1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Sync tempValue and zoom with latest props when content or editing state changes
  useEffect(() => {
    setTempValue(content);
    setZoom(content.zoom || 1);
  }, [content, isEditing, isEditMode]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSorting
  } = useSortable({ id: content.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSorting ? 0.5 : 1,
    zIndex: isSorting ? 100 : 'auto',
  };

  const handleSave = () => {
    onUpdate({ ...tempValue, zoom, updatedAt: new Date().toISOString() });
    setIsEditing(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setTimeout(() => setIsDragging(false), 50);
  };

  const handleAddButton = () => {
    const newButton: any = {
      id: `btn_${Date.now()}`,
      text: 'Novo Botão',
      action: 'open_page',
      size: 'M',
      bgColor: '#3b82f6',
      textColor: '#ffffff',
      fontStyle: 'normal',
      alignment: 'center',
      width: 'auto',
      iconType: 'lucide',
      icon: 'Globe',
      noBackground: false,
      iconSize: 16
    };
    setTempValue({
      ...tempValue,
      buttons: [...(tempValue.buttons || []), newButton]
    });
  };

  const handleRemoveButton = (btnId: string) => {
    setTempValue({
      ...tempValue,
      buttons: (tempValue.buttons || []).filter(b => b.id !== btnId)
    });
  };

  const handleUpdateButton = (btnId: string, updates: any) => {
    setTempValue({
      ...tempValue,
      buttons: (tempValue.buttons || []).map(b => b.id === btnId ? { ...b, ...updates } : b)
    });
  };

  const handleAddHotspot = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditMode || content.type !== 'interactive-image' || isDragging) return;
    
    // Prevent adding hotspot if we just finished dragging
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newHotspot: any = {
      id: `hs_${Date.now()}`,
      x,
      y,
      name: 'Novo Ponto',
      action: 'open_page',
      targetPageId: '',
      iconType: 'lucide',
      icon: 'Target'
    };

    onUpdate({
      ...content,
      hotspots: [...(content.hotspots || []), newHotspot]
    });
  };

  const handleRemoveHotspot = (hsId: string) => {
    onUpdate({
      ...content,
      hotspots: (content.hotspots || []).filter(h => h.id !== hsId)
    });
  };

  const handleHotspotClick = async (hs: any) => {
    if (isEditMode) return;
    
    if (hs.action === 'create_page' && !hs.targetPageId) {
      const newSubPageId = `sp_${Date.now()}`;
      const newSubPage = {
        id: newSubPageId,
        gameId: content.gameId,
        title: hs.name,
        parentContentId: content.id,
        order: (subPages || []).filter(sp => sp.gameId === content.gameId).length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await addSubPage(newSubPage);
      
      // Update hotspot with the new page ID
      if (content.type === 'interactive-map') {
        const updatedHotspots = (content.mapHotspots || []).map(h => 
          h.id === hs.id ? { ...h, targetPageId: newSubPageId, action: 'open_page' as const } : h
        );
        onUpdate({ ...content, mapHotspots: updatedHotspots });
      } else {
        const updatedHotspots = (content.hotspots || []).map(h => 
          h.id === hs.id ? { ...h, targetPageId: newSubPageId, action: 'open_page' as const } : h
        );
        onUpdate({ ...content, hotspots: updatedHotspots });
      }
      onNavigateSubPage(newSubPageId);
    } else if (hs.targetPageId) {
      onNavigateSubPage(hs.targetPageId);
    }
  };

  const handleButtonClick = async (btn: any) => {
    if (isEditMode) return;
    
    if (btn.action === 'create_page' && !btn.targetPageId) {
      const newSubPageId = `sp_${Date.now()}`;
      const newSubPage = {
        id: newSubPageId,
        gameId: content.gameId,
        title: btn.text,
        parentContentId: content.id,
        order: (subPages || []).filter(sp => sp.gameId === content.gameId).length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await addSubPage(newSubPage);
      
      // Update button with the new page ID
      const updatedButtons = (content.buttons || []).map(b => 
        b.id === btn.id ? { ...b, targetPageId: newSubPageId, action: 'open_page' as const } : b
      );
      onUpdate({ ...content, buttons: updatedButtons });
      onNavigateSubPage(newSubPageId);
    } else if (btn.targetPageId) {
      onNavigateSubPage(btn.targetPageId);
    }
  };

  const widthClasses = {
    '25%': 'md:w-1/4',
    '33%': 'md:w-1/3',
    '50%': 'md:w-1/2',
    '66%': 'md:w-2/3',
    '75%': 'md:w-3/4',
    '100%': 'w-full',
  };

  if (isEditing && isEditMode) {
    return (
      <div className="bg-[#1e232b] p-6 rounded-xl border-2 border-transparent shadow-2xl mb-8 animate-scale-in relative z-50 w-full">
         <div className="flex justify-between items-center mb-6 border-b border-transparent pb-4">
            <span className="text-xs font-black text-steam-highlight uppercase tracking-[0.2em]">Editor de Bloco: {content.type.toUpperCase()}</span>
            <div className="flex gap-4">
               <button type="button" onClick={() => setIsEditing(false)} className="text-[10px] text-gray-400 hover:text-white uppercase font-bold tracking-widest">Descartar</button>
               <button type="button" onClick={handleSave} className="bg-steam-highlight text-steam-dark px-6 py-2 rounded font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-white transition-all shadow-xl shadow-blue-500/20"><Save className="w-3.5 h-3.5"/> Aplicar Mudanças</button>
            </div>
         </div>
         
         <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[9px] text-gray-500 font-black uppercase mb-1 block">Título da Seção</label>
                <input className="w-full bg-black/40 border border-transparent rounded-lg p-3 text-white font-bold outline-none focus:border-steam-highlight text-sm" value={tempValue.title} onChange={e => setTempValue({...tempValue, title: e.target.value})} placeholder="Ex: Guia de Combate" />
              </div>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-[9px] text-gray-500 font-black uppercase mb-1 block">Largura</label>
                  <select className="w-full bg-black/40 border border-transparent rounded-lg p-3 text-white text-xs outline-none focus:border-steam-highlight" value={tempValue.width} onChange={e => setTempValue({...tempValue, width: e.target.value as any})}>
                    <option value="25%">25% (Pequeno)</option>
                    <option value="33%">33% (1/3)</option>
                    <option value="50%">50% (Médio)</option>
                    <option value="66%">66% (2/3)</option>
                    <option value="75%">75% (Grande)</option>
                    <option value="100%">100% (Largura Total)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[9px] text-gray-500 font-black uppercase mb-1 block">Alinhamento / Layout</label>
                  <select className="w-full bg-black/40 border border-transparent rounded-lg p-3 text-white text-xs outline-none focus:border-steam-highlight" value={tempValue.alignment} onChange={e => setTempValue({...tempValue, alignment: e.target.value as any})}>
                    <option value="left">Esquerda</option>
                    <option value="center">Centro</option>
                    <option value="right">Direita</option>
                    <option value="top">Mídia Acima</option>
                    <option value="bottom">Mídia Abaixo</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[9px] text-gray-500 font-black uppercase mb-1 block">{content.type === 'text' ? 'Conteúdo do Texto' : (content.type === 'button' ? 'Título do Bloco de Botões' : 'URL da Mídia (YouTube/Link)')}</label>
              <textarea className="w-full bg-black/40 border border-transparent rounded-lg p-4 text-white text-sm h-32 resize-none focus:border-steam-highlight outline-none font-sans leading-relaxed" value={tempValue.content} onChange={e => setTempValue({...tempValue, content: e.target.value})} placeholder="Insira o texto ou URL..." />
            </div>

            {content.type === 'button' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] text-gray-500 font-black uppercase">Configuração dos Botões</label>
                  <button type="button" onClick={handleAddButton} className="text-[10px] text-steam-highlight font-black uppercase flex items-center gap-1 hover:underline"><Plus className="w-3 h-3"/> Adicionar Botão</button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {(tempValue.buttons || []).map(btn => (
                    <div key={btn.id} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[8px] text-gray-500 font-black uppercase mb-1 block">Texto do Botão</label>
                          <input className="w-full bg-black/40 border border-transparent rounded-lg p-2 text-white text-xs outline-none focus:border-steam-highlight" value={btn.text} onChange={e => handleUpdateButton(btn.id, { text: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[8px] text-gray-500 font-black uppercase mb-1 block">Ação</label>
                          <select className="w-full bg-black/40 border border-transparent rounded-lg p-2 text-white text-xs outline-none focus:border-steam-highlight" value={btn.action} onChange={e => handleUpdateButton(btn.id, { action: e.target.value as any })}>
                            <option value="open_page">Abrir Página Existente</option>
                            <option value="create_page">Criar Nova Página Interna</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[8px] text-gray-500 font-black uppercase mb-1 block">Página Alvo</label>
                          <select 
                            className="w-full bg-black/40 border border-transparent rounded-lg p-2 text-white text-xs outline-none focus:border-steam-highlight" 
                            value={btn.targetPageId || ''} 
                            onChange={e => handleUpdateButton(btn.id, { targetPageId: e.target.value })}
                          >
                            <option value="">-- Selecione uma página --</option>
                            {(subPages || []).filter(sp => sp.gameId === content.gameId).map(sp => (
                              <option key={sp.id} value={sp.id}>{sp.title}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Tamanho</label>
                          <div className="flex gap-2">
                            {['S', 'M', 'L'].map(s => (
                              <button 
                                key={s}
                                onClick={() => handleUpdateButton(btn.id, { size: s as any })}
                                className={`flex-1 py-1 rounded text-xs font-bold transition-all ${btn.size === s ? 'bg-steam-highlight text-steam-dark' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Largura</label>
                          <div className="flex gap-2">
                            {[
                              { id: 'auto', label: 'Auto' },
                              { id: '100%', label: '100%' }
                            ].map(w => (
                              <button 
                                key={w.id}
                                onClick={() => handleUpdateButton(btn.id, { width: w.id as any })}
                                className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${btn.width === w.id ? 'bg-steam-highlight text-steam-dark' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                              >
                                {w.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Alinhamento</label>
                          <div className="flex gap-1">
                            {[
                              { id: 'left', icon: <AlignLeft className="w-3 h-3" /> },
                              { id: 'center', icon: <AlignCenter className="w-3 h-3" /> },
                              { id: 'right', icon: <AlignRight className="w-3 h-3" /> }
                            ].map(a => (
                              <button 
                                key={a.id}
                                onClick={() => handleUpdateButton(btn.id, { alignment: a.id as any })}
                                className={`flex-1 py-1 flex justify-center rounded transition-all ${btn.alignment === a.id ? 'bg-steam-highlight text-steam-dark' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                              >
                                {a.icon}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Estilo Fonte</label>
                          <div className="flex gap-2">
                            {[
                              { id: 'normal', label: 'Abc' },
                              { id: 'bold', label: 'ABC*' },
                              { id: 'uppercase', label: 'ABC' }
                            ].map(f => (
                              <button 
                                key={f.id}
                                onClick={() => handleUpdateButton(btn.id, { fontStyle: f.id as any })}
                                className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${btn.fontStyle === f.id ? 'bg-steam-highlight text-steam-dark' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Cor Fundo</label>
                          <div className="flex gap-2 items-center">
                            <input 
                              type="color" 
                              value={btn.bgColor}
                              disabled={btn.noBackground}
                              onChange={(e) => handleUpdateButton(btn.id, { bgColor: e.target.value })}
                              className={`w-8 h-8 rounded bg-transparent border-none cursor-pointer ${btn.noBackground ? 'opacity-20' : ''}`}
                            />
                            <input 
                              type="text" 
                              value={btn.bgColor}
                              disabled={btn.noBackground}
                              onChange={(e) => handleUpdateButton(btn.id, { bgColor: e.target.value })}
                              className={`bg-white/5 border-none text-[10px] text-white px-2 py-1 rounded w-full font-mono ${btn.noBackground ? 'opacity-20' : ''}`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Cor Texto</label>
                          <div className="flex gap-2 items-center">
                            <input 
                              type="color" 
                              value={btn.textColor}
                              onChange={(e) => handleUpdateButton(btn.id, { textColor: e.target.value })}
                              className="w-8 h-8 rounded bg-transparent border-none cursor-pointer"
                            />
                            <input 
                              type="text" 
                              value={btn.textColor}
                              onChange={(e) => handleUpdateButton(btn.id, { textColor: e.target.value })}
                              className="bg-white/5 border-none text-[10px] text-white px-2 py-1 rounded w-full font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id={`noBg_${btn.id}`}
                            checked={btn.noBackground || false}
                            onChange={(e) => handleUpdateButton(btn.id, { noBackground: e.target.checked })}
                            className="rounded border-white/10 bg-white/5 text-steam-highlight focus:ring-steam-highlight"
                          />
                          <label htmlFor={`noBg_${btn.id}`} className="text-[10px] font-black text-gray-400 uppercase cursor-pointer">Sem Fundo / Ícone Apenas</label>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Tamanho Ícone ({btn.iconSize || 16}px)</label>
                          <input 
                            type="range" 
                            min="12" 
                            max="120" 
                            value={btn.iconSize || 16}
                            onChange={(e) => handleUpdateButton(btn.id, { iconSize: parseInt(e.target.value) })}
                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-steam-highlight"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-4">
                          <label className="text-[8px] text-gray-500 font-black uppercase">Tipo de Ícone:</label>
                          <div className="flex gap-2">
                            <button 
                              type="button" 
                              onClick={() => handleUpdateButton(btn.id, { iconType: 'lucide' })}
                              className={`px-3 py-1 rounded text-[8px] font-black uppercase transition-all ${btn.iconType === 'lucide' ? 'bg-steam-highlight text-steam-dark' : 'bg-white/5 text-gray-400'}`}
                            >
                              Lucide
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleUpdateButton(btn.id, { iconType: 'image' })}
                              className={`px-3 py-1 rounded text-[8px] font-black uppercase transition-all ${btn.iconType === 'image' ? 'bg-steam-highlight text-steam-dark' : 'bg-white/5 text-gray-400'}`}
                            >
                              Imagem
                            </button>
                          </div>
                        </div>

                        {btn.iconType === 'lucide' ? (
                          <div className="grid grid-cols-8 md:grid-cols-12 gap-2 max-h-32 overflow-y-auto p-2 bg-black/40 rounded-lg custom-scrollbar">
                            {AVAILABLE_ICONS.map(iconName => (
                              <button
                                key={iconName}
                                type="button"
                                onClick={() => handleUpdateButton(btn.id, { icon: iconName })}
                                className={`p-2 rounded hover:bg-steam-highlight hover:text-steam-dark transition-all flex items-center justify-center ${btn.icon === iconName ? 'bg-steam-highlight text-steam-dark' : 'text-gray-400'}`}
                                title={iconName}
                              >
                                <IconRenderer name={iconName} className="w-4 h-4" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div>
                            <label className="text-[8px] text-gray-500 font-black uppercase mb-1 block">URL da Imagem</label>
                            <input 
                              className="w-full bg-black/40 border border-transparent rounded-lg p-2 text-white text-xs outline-none focus:border-steam-highlight" 
                              value={btn.icon || ''} 
                              onChange={e => handleUpdateButton(btn.id, { icon: e.target.value })} 
                              placeholder="https://..."
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(content.type === 'image' || content.type === 'video') && (
              <div>
                <label className="text-[9px] text-gray-500 font-black uppercase mb-1 block">Contexto / Sinopse (18px)</label>
                <textarea className="w-full bg-black/40 border border-transparent rounded-lg p-4 text-white text-lg h-24 resize-none focus:border-steam-highlight outline-none font-sans leading-relaxed italic" value={tempValue.synopsis} onChange={e => setTempValue({...tempValue, synopsis: e.target.value})} placeholder="Descreva o contexto desta mídia..." />
              </div>
            )}

            {content.type === 'interactive-map' && (
              <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                <h5 className="text-[10px] text-steam-highlight font-black uppercase tracking-wider">Dimensões da Imagem do Mapa</h5>
                <p className="text-[10px] text-gray-400 font-medium">
                  Insira o tamanho original da imagem do mapa (em pixels). Isso garante que o mapa seja exibido na proporção exata, eliminando barras pretas ou espaços vazios nas laterais e no fundo.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-gray-500 font-black uppercase mb-1 block">Largura da Imagem (PX)</label>
                    <input 
                      type="number"
                      value={tempValue.mapWidth || ''} 
                      onChange={e => setTempValue({ ...tempValue, mapWidth: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Ex: 2048"
                      className="w-full bg-black/40 border border-transparent rounded-lg p-2 text-white text-xs outline-none focus:border-steam-highlight font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 font-black uppercase mb-1 block">Altura da Imagem (PX)</label>
                    <input 
                      type="number"
                      value={tempValue.mapHeight || ''} 
                      onChange={e => setTempValue({ ...tempValue, mapHeight: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Ex: 2048"
                      className="w-full bg-black/40 border border-transparent rounded-lg p-2 text-white text-xs outline-none focus:border-steam-highlight font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            )}
         </div>
      </div>
    );
  }

  const renderMediaContent = () => {
    const isHorizontal = content.alignment === 'left' || content.alignment === 'right';
    const isReversed = content.alignment === 'right';

    return (
      <div className={`flex flex-col gap-6 ${isHorizontal ? (isReversed ? 'md:flex-row-reverse' : 'md:flex-row') : 'flex-col'} items-start`}>
        <div className={`${isHorizontal ? 'md:w-1/2 w-full' : 'w-full'} shrink-0`}>
          {content.type === 'video' ? (
            <div className="aspect-video rounded-xl overflow-hidden shadow-2xl bg-black border border-transparent">
              <iframe width="100%" height="100%" src={content.content || undefined} title={content.title} frameBorder="0" allowFullScreen></iframe>
            </div>
          ) : (
            <img src={content.content || undefined} alt={content.title} className="w-full rounded-xl shadow-2xl border border-transparent object-cover" />
          )}
        </div>
        <div className="flex-1 space-y-4">
          <h4 className="text-[10px] font-black text-steam-highlight uppercase tracking-[0.2em]">{content.title}</h4>
          <p className="text-lg text-gray-200 font-medium leading-relaxed italic opacity-90">{content.synopsis}</p>
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`group relative mb-8 animate-fade-in ${widthClasses[content.width || '100%']} ${content.alignment === 'center' ? 'mx-auto' : content.alignment === 'right' ? 'ml-auto' : ''}`}
    >
      {(content.type === 'interactive-image' || content.type === 'interactive-map') && isEditMode && (
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          <div className="flex items-center bg-steam-dark/90 rounded-xl border border-white/10 p-1 shadow-2xl backdrop-blur-md">
            <input 
              type="text"
              value={content.content || ''}
              onChange={(e) => onUpdate({ ...content, content: e.target.value })}
              placeholder="URL da Imagem..."
              className="bg-transparent border-none text-[10px] text-white px-3 py-1 focus:ring-0 w-48 font-mono"
            />
            <button 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    try {
                      const url = await chunkedUpload(file);
                      onUpdate({ ...content, content: url });
                    } catch (err) {
                      console.error('Upload error:', err);
                    }
                  }
                };
                input.click();
              }}
              className="p-2 text-gray-400 hover:text-steam-highlight transition-all"
              title="Upload Local"
            >
              <Upload className="w-4 h-4" />
            </button>
            {content.type === 'interactive-image' && (
              <>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button 
                  onClick={() => {
                    setZoom(1);
                    setOffset({ x: 0, y: 0 });
                  }}
                  className="p-2 text-gray-400 hover:text-steam-highlight transition-all"
                  title="Resetar Visualização"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* CONTROLES INLINE */}
      {isEditMode && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-row items-center gap-1 z-40 opacity-0 group-hover:opacity-100 transition-all bg-[#1b2838] border border-white/10 rounded-full p-1 shadow-2xl backdrop-blur-md">
          <button 
            {...attributes} 
            {...listeners}
            className="p-2 text-gray-400 hover:text-steam-highlight transition-all cursor-grab active:cursor-grabbing" 
            title="Arrastar"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          
          <div className="w-px h-4 bg-white/10" />
          
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} 
            className="p-2 text-gray-400 hover:text-steam-highlight transition-all flex items-center gap-1.5 px-3"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-widest">Editar</span>
          </button>

          <div className="w-px h-4 bg-white/10" />

          <button 
            type="button" 
            onClick={(e) => { 
              e.stopPropagation(); 
              onDelete(content.id); 
            }} 
            className="p-2 text-gray-400 hover:text-red-500 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className={`transition-all duration-300 ${isEditMode ? 'ring-1 ring-white/5 rounded-2xl p-1 bg-white/[0.02]' : ''}`}>
         {content.type === 'text' && (
            <div className={`p-6 bg-[#0d0f13] rounded-2xl border border-transparent shadow-2xl ${content.alignment === 'center' ? 'text-center' : content.alignment === 'right' ? 'text-right' : 'text-left'}`}>
               <h4 className="font-black text-steam-highlight mb-4 uppercase text-[11px] tracking-[0.3em]">{content.title}</h4>
               <div className="text-base text-gray-300 whitespace-pre-wrap leading-loose font-sans opacity-90">{content.content}</div>
            </div>
         )}
         
         {(content.type === 'image' || content.type === 'video') && (
            <div className={`p-6 bg-[#0d0f13]/40 rounded-2xl shadow-3xl border border-transparent`}>
               {renderMediaContent()}
            </div>
         )}

         {content.type === 'alert' && (
            <div className="p-6 bg-red-600/10 rounded-2xl border border-transparent flex items-start gap-4 shadow-xl">
               <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
               <div className="flex-1">
                 <h4 className="font-black text-red-500 mb-2 uppercase text-[11px] tracking-[0.3em]">{content.title}</h4>
                 <div className="text-sm text-red-100 font-bold leading-relaxed">{content.content}</div>
               </div>
            </div>
         )}

          {content.type === 'list' && (
            <div className="p-6 bg-white/5 rounded-2xl border border-transparent shadow-xl">
               <h4 className="font-black text-white mb-4 uppercase text-[11px] tracking-[0.3em]">{content.title}</h4>
               <ul className="space-y-3">
                  {content.content.split('\n').map((item, i) => (
                    <li key={i} className="flex gap-4 text-sm text-gray-400 font-medium">
                       <span className="text-steam-highlight font-black">#</span> {item}
                    </li>
                  ))}
               </ul>
            </div>
          )}

          {content.type === 'button' && (
            <div className={`p-6 bg-[#0d0f13] rounded-2xl border border-transparent shadow-2xl ${content.alignment === 'center' ? 'text-center' : content.alignment === 'right' ? 'text-right' : 'text-left'}`}>
               <h4 className="font-black text-steam-highlight mb-6 uppercase text-[11px] tracking-[0.3em]">{content.title}</h4>
               <div className={`flex flex-wrap gap-4 ${content.alignment === 'center' ? 'justify-center' : content.alignment === 'right' ? 'justify-end' : 'justify-start'}`}>
                  {(content.buttons || []).map(btn => (
                      <button
                        key={btn.id}
                        onClick={() => handleButtonClick(btn)}
                        style={{
                          backgroundColor: btn.noBackground ? 'transparent' : btn.bgColor,
                          color: btn.textColor,
                          fontWeight: btn.fontStyle === 'bold' ? 'bold' : 'normal',
                          textTransform: btn.fontStyle === 'uppercase' ? 'uppercase' : 'none',
                          width: btn.width === '100%' ? '100%' : 'auto',
                          border: btn.noBackground ? 'none' : undefined,
                          padding: btn.noBackground ? '0' : undefined,
                          boxShadow: btn.noBackground ? 'none' : undefined
                        }}
                        className={`transition-all hover:scale-105 active:scale-95 ${btn.noBackground ? '' : 'px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg'} ${btn.size === 'S' ? 'text-xs' : btn.size === 'L' ? 'text-lg px-8 py-4' : 'text-base'}`}
                      >
                        {btn.iconType === 'image' ? (
                          <img 
                            src={btn.icon || undefined} 
                            style={{ width: btn.iconSize || 16, height: btn.iconSize || 16 }} 
                            className="object-contain" 
                            alt="" 
                            referrerPolicy="no-referrer" 
                          />
                        ) : (
                          <IconRenderer 
                            name={btn.icon || 'Globe'} 
                            style={{ width: btn.iconSize || 16, height: btn.iconSize || 16 }} 
                          />
                        )}
                        {!btn.noBackground && btn.text}
                        {!btn.noBackground && btn.action === 'create_page' && !btn.targetPageId && <Plus className="w-3 h-3 opacity-50" />}
                        {!btn.noBackground && btn.targetPageId && <ExternalLink className="w-3 h-3 opacity-50" />}
                      </button>
                  ))}
               </div>
            </div>
          )}

          {content.type === 'interactive-map' && (
            <div className="bg-[#0d0f13] rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
              <div className="pt-6 px-6">
                <h4 className="font-black text-steam-highlight mb-4 uppercase text-[11px] tracking-[0.3em]">{content.title}</h4>
              </div>
              <div className="bg-black/20 h-[500px] md:h-[600px] w-full relative">
                <InteractiveMap 
                  imageUrl={content.content}
                  mapId={content.id}
                  mapWidth={content.mapWidth}
                  mapHeight={content.mapHeight}
                  onUpdateMapDimensions={(width, height) => {
                    onUpdate({ ...content, mapWidth: width, mapHeight: height });
                  }}
                  onUpdateImageUrl={(newUrl) => {
                    onUpdate({ ...content, content: newUrl });
                  }}
                  hotspots={content.mapHotspots || []}
                  isAdmin={isEditMode}
                  isEditingHotspot={!!editingHotspot}
                  onAddHotspot={(x, y) => {
                    const newHotspot: MapHotspot = {
                      id: `hs_${Date.now()}`,
                      x,
                      y,
                      name: 'Novo Ponto',
                      action: 'open_page',
                      targetPageId: '',
                      iconType: 'lucide',
                      icon: 'Target'
                    };
                    onUpdate({ ...content, mapHotspots: [...(content.mapHotspots || []), newHotspot] });
                    setEditingHotspot(newHotspot);
                  }}
                  onEditHotspot={(hs) => {
                    setEditingHotspot(hs);
                  }}
                  onUpdateHotspot={(updatedHs) => {
                    const updatedHotspots = (content.mapHotspots || []).map(h => 
                      h.id === updatedHs.id ? updatedHs : h
                    );
                    onUpdate({ ...content, mapHotspots: updatedHotspots });
                    toast.success('Posição do ponto atualizada');
                  }}
                  onDeleteHotspot={(id) => {
                    const updatedHotspots = (content.mapHotspots || []).filter(h => h.id !== id);
                    onUpdate({ ...content, mapHotspots: updatedHotspots });
                    toast.success('Ponto removido do mapa');
                  }}
                  onHotspotClick={handleHotspotClick}
                  categories={content.mapFilters || []}
                  onUpdateCategories={(newCats) => {
                    onUpdate({ ...content, mapFilters: newCats });
                    toast.success('Filtros do mapa atualizados!');
                  }}
                />
              </div>
            </div>
          )}
          {content.type === 'interactive-image' && (
            <div className="p-6 bg-[#0d0f13] rounded-2xl border border-transparent shadow-2xl">
              <h4 className="font-black text-steam-highlight mb-6 uppercase text-[11px] tracking-[0.3em]">{content.title}</h4>
              <div className="relative rounded-2xl overflow-hidden bg-black border border-white/5 group/map">
                <div 
                  className="relative transition-transform duration-200 ease-out cursor-grab active:cursor-grabbing"
                  style={{ 
                    transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`,
                    transformOrigin: 'center'
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onClick={handleAddHotspot}
                >
                  <img src={content.content} alt={content.title} className="w-full h-auto pointer-events-none select-none" />
                  
                  <AnimatePresence>
                    {(content.hotspots || []).map(hs => (
                      <motion.div
                        key={hs.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute z-10 group/hs"
                        style={{ 
                          left: `${hs.x}%`, 
                          top: `${hs.y}%`, 
                          transform: `translate(-50%, -50%) scale(${1 / zoom})` 
                        }}
                        drag={isEditMode}
                        dragMomentum={false}
                        onDragEnd={(e, info) => {
                          const parent = (e.target as HTMLElement).parentElement;
                          if (!parent) return;
                          const rect = parent.getBoundingClientRect();
                          const newX = ((info.point.x - rect.left) / rect.width) * 100;
                          const newY = ((info.point.y - rect.top) / rect.height) * 100;
                          
                          const updatedHotspots = (content.hotspots || []).map(h => 
                            h.id === hs.id ? { ...h, x: Math.max(0, Math.min(100, newX)), y: Math.max(0, Math.min(100, newY)) } : h
                          );
                          onUpdate({ ...content, hotspots: updatedHotspots });
                          toast.success('Posição do ponto atualizada');
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHotspotClick(hs);
                        }}
                      >
                        <div className="relative">
                          <div 
                            className="bg-steam-highlight rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(102,192,244,0.5)] animate-pulse cursor-pointer hover:scale-125 transition-all overflow-hidden border-2 border-steam-dark"
                            style={{ 
                              width: `${hs.size || 32}px`, 
                              height: `${hs.size || 32}px` 
                            }}
                          >
                            {hs.iconType === 'image' ? (
                              <img src={hs.icon || undefined} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                            ) : (
                              <IconRenderer name={hs.icon || 'Target'} className="w-5 h-5 text-steam-dark" style={{ width: `${(hs.size || 32) * 0.6}px`, height: `${(hs.size || 32) * 0.6}px` }} />
                            )}
                          </div>
                          
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-steam-dark/95 border border-white/10 px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover/hs:opacity-100 transition-all pointer-events-none shadow-2xl">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{hs.name}</span>
                          </div>

                          {isEditMode && (
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover/hs:opacity-100 transition-all z-50">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingHotspot(hs);
                                }}
                                className="p-2 bg-steam-highlight text-steam-dark rounded-lg hover:bg-white transition-all shadow-xl"
                                title="Editar Ponto"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveHotspot(hs.id);
                                }}
                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-all shadow-xl"
                                title="Remover Ponto"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Zoom Controls */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
                  <button onClick={() => setZoom(z => Math.min(z + 0.5, 5))} className="p-2 bg-steam-dark/80 text-white rounded-lg hover:bg-steam-highlight hover:text-steam-dark transition-all"><ZoomIn className="w-4 h-4" /></button>
                  <button onClick={() => setZoom(z => Math.max(z - 0.5, 1))} className="p-2 bg-steam-dark/80 text-white rounded-lg hover:bg-steam-highlight hover:text-steam-dark transition-all"><ZoomOut className="w-4 h-4" /></button>
                  <button onClick={() => { setZoom(1); setOffset({x: 0, y: 0}); }} className="p-2 bg-steam-dark/80 text-white rounded-lg hover:bg-steam-highlight hover:text-steam-dark transition-all"><Move className="w-4 h-4" /></button>
                </div>

                {isEditMode && (
                  <div className="absolute top-4 left-4 bg-steam-highlight/90 text-steam-dark px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">
                    Modo Edição: Clique na imagem para adicionar pontos
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
      {/* Modal de Edição de Hotspot */}
      {editingHotspot && createPortal(
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-fade-in" onClick={() => setEditingHotspot(null)}>
          <div className="bg-[#1b2838] p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Target className="w-4 h-4 text-steam-highlight" /> Configurar Ponto
                </h3>
                <span className="text-[10px] font-mono text-steam-highlight font-bold">
                  Coordenadas: (X: {(editingHotspot.x * 100).toFixed(1)}%, Y: {(editingHotspot.y * 100).toFixed(1)}%)
                </span>
              </div>
              <button 
                onClick={() => setEditingHotspot(null)}
                className="p-2 text-gray-500 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Nome do Ponto</label>
                <input 
                  className="w-full bg-black/40 border border-transparent rounded-xl p-4 text-white font-bold outline-none focus:border-steam-highlight" 
                  value={editingHotspot.name} 
                  onChange={e => setEditingHotspot({...editingHotspot, name: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Ação</label>
                  <select 
                    className="w-full bg-black/40 border border-transparent rounded-xl p-4 text-white text-xs font-bold outline-none focus:border-steam-highlight" 
                    value={editingHotspot.action} 
                    onChange={e => setEditingHotspot({...editingHotspot, action: e.target.value as any})}
                  >
                    <option value="open_page">Abrir Página</option>
                    <option value="create_page">Criar Nova Página</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Página Alvo</label>
                  <select 
                    className="w-full bg-black/40 border border-transparent rounded-xl p-4 text-white font-bold outline-none focus:border-steam-highlight text-xs" 
                    value={editingHotspot.targetPageId || ''} 
                    onChange={e => setEditingHotspot({...editingHotspot, targetPageId: e.target.value})} 
                  >
                    <option value="">-- Selecione uma página --</option>
                    {(subPages || []).filter(sp => sp.gameId === content.gameId).map(sp => (
                      <option key={sp.id} value={sp.id}>{sp.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Tipo de Ícone</label>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setEditingHotspot({...editingHotspot, iconType: 'lucide'})}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${editingHotspot.iconType === 'lucide' ? 'bg-steam-highlight text-steam-dark border-steam-highlight' : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'}`}
                  >
                    Símbolo
                  </button>
                  <button 
                    onClick={() => setEditingHotspot({...editingHotspot, iconType: 'image'})}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${editingHotspot.iconType === 'image' ? 'bg-steam-highlight text-steam-dark border-steam-highlight' : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'}`}
                  >
                    Imagem
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">
                  {editingHotspot.iconType === 'image' ? 'URL da Imagem' : 'Nome do Ícone (Lucide)'}
                </label>
                <div className="flex gap-2 mb-3">
                  <input 
                    className="flex-1 bg-black/40 border border-transparent rounded-xl p-4 text-white font-bold outline-none focus:border-steam-highlight" 
                    value={editingHotspot.icon || ''} 
                    placeholder={editingHotspot.iconType === 'image' ? 'https://...' : 'Target, Map, Flag...'}
                    onChange={e => setEditingHotspot({...editingHotspot, icon: e.target.value})} 
                  />
                  {editingHotspot.iconType === 'image' && (
                    <button 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            try {
                              const url = await chunkedUpload(file);
                              setEditingHotspot({...editingHotspot, icon: url});
                            } catch (err) {
                              console.error('Upload error:', err);
                            }
                          }
                        };
                        input.click();
                      }}
                      className="p-4 bg-white/5 text-gray-400 rounded-xl hover:bg-white/10 transition-all"
                    >
                      <Upload className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {editingHotspot.iconType === 'lucide' && (
                  <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                    <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">Símbolos Recomendados</label>
                    <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                      {['Target', 'Map', 'Flag', 'Info', 'Camera', 'Trophy', 'Sword', 'Star', 'Skull', 'Heart', 'Shield', 'Crown', 'Key', 'Gem', 'Book'].map((icName) => (
                        <button
                          key={icName}
                          type="button"
                          onClick={() => setEditingHotspot({ ...editingHotspot, icon: icName })}
                          className={`p-2 rounded-lg text-xs font-bold transition-all border flex flex-col items-center gap-1 ${editingHotspot.icon?.toLowerCase() === icName.toLowerCase() ? 'bg-steam-highlight/20 text-steam-highlight border-steam-highlight/50' : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'}`}
                        >
                          <span className="text-[10px]">{icName}</span>
                        </button>
                      ))}
                      {(content.mapFilters || []).map((cat: any) => (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => setEditingHotspot({ ...editingHotspot, icon: cat.key })}
                          className={`p-2 rounded-lg text-xs font-bold transition-all border flex flex-col items-center gap-1 ${editingHotspot.icon?.toLowerCase() === cat.key.toLowerCase() ? 'bg-steam-highlight/20 text-steam-highlight border-steam-highlight/50' : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'}`}
                        >
                          <span className="text-[10px] text-steam-highlight font-black">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Tamanho do Pin</label>
                  <span className="text-[10px] text-steam-highlight font-black">{editingHotspot.size || 32}px</span>
                </div>
                <input 
                  type="range"
                  min="16"
                  max="128"
                  step="4"
                  className="w-full accent-steam-highlight bg-black/40 rounded-lg h-2"
                  value={editingHotspot.size || 32}
                  onChange={e => setEditingHotspot({...editingHotspot, size: parseInt(e.target.value)})}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setEditingHotspot(null)}
                  className="flex-1 py-4 bg-white/5 text-gray-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (content.type === 'interactive-map') {
                      const updatedHotspots = (content.mapHotspots || []).map(h => h.id === editingHotspot.id ? editingHotspot : h);
                      onUpdate({ ...content, mapHotspots: updatedHotspots });
                    } else {
                      const updatedHotspots = (content.hotspots || []).map(h => h.id === editingHotspot.id ? editingHotspot : h);
                      onUpdate({ ...content, hotspots: updatedHotspots });
                    }
                    setEditingHotspot(null);
                  }}
                  className="flex-1 py-4 bg-steam-highlight text-steam-dark font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white transition-all shadow-xl shadow-blue-500/20"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* BOTÃO DE ADICIONAR ENTRE BLOCOS */}
      {isEditMode && (
        <div className="relative h-8 group/add mt-4">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-px bg-white/5 group-hover/add:bg-steam-highlight/20 transition-all" />
            <button 
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="absolute bg-[#1b2838] border border-white/10 w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-steam-highlight hover:border-steam-highlight transition-all z-10 shadow-xl"
            >
              <Plus className={`w-4 h-4 transition-transform duration-300 ${showAddMenu ? 'rotate-45' : ''}`} />
            </button>
          </div>

          <AnimatePresence>
            {showAddMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-10 left-1/2 -translate-x-1/2 bg-[#1b2838] border border-white/10 rounded-2xl p-3 shadow-5xl z-50 w-full max-w-lg backdrop-blur-xl"
              >
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { type: 'text', label: 'Texto', icon: <AlignLeft className="w-4 h-4" /> },
                    { type: 'image', label: 'Imagem', icon: <ImageIcon className="w-4 h-4" /> },
                    { type: 'video', label: 'Vídeo', icon: <Video className="w-4 h-4" /> },
                    { type: 'alert', label: 'Aviso', icon: <AlertTriangle className="w-4 h-4" /> },
                    { type: 'list', label: 'Lista', icon: <ListChecks className="w-4 h-4" /> },
                    { type: 'button', label: 'Botão', icon: <Square className="w-4 h-4" /> },
                    { type: 'interactive-image', label: 'Imagem Interativa', icon: <MousePointer2 className="w-4 h-4" /> },
                    { type: 'interactive-map', label: 'Mapa Interativo', icon: <Map className="w-4 h-4" /> }
                  ].map(item => (
                    <button 
                      key={item.type} 
                      onClick={() => {
                        onAddBlock(item.type as ContentType, (content.order || 0) + 1);
                        setShowAddMenu(false);
                      }} 
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-steam-highlight hover:text-steam-dark transition-all text-gray-400 group/btn"
                    >
                      <div className="p-2 bg-white/5 rounded-lg group-hover/btn:bg-transparent transition-all">
                        {item.icon}
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

// --- MODAL DE CONQUISTA COM PAGE BUILDER INTEGRADO ---
const AchievementModal: React.FC<{ 
  achievement: Achievement, 
  game: Game,
  onClose: () => void,
  onNavigateProfile: (userId: string) => void,
  onNavigateSubPage: (id: string) => void
}> = ({ achievement, game, onClose, onNavigateProfile, onNavigateSubPage }) => {
  const { contents, userProgress, currentUser, feedbacks, addFeedback, deleteFeedback, addContent, updateContent, deleteContent, updateAchievement } = useApp();
  
  const achBlocks = useMemo(() => contents.filter(c => c.achievementId === achievement.id).sort((a, b) => (a.order || 0) - (b.order || 0)), [contents, achievement.id]);
  const achFeedbacks = useMemo(() => feedbacks.filter(f => f.achievementId === achievement.id), [feedbacks, achievement.id]);
  
  const userAchData = userProgress[achievement.id];
  const isUnlocked = userAchData?.status === AchievementStatus.COMPLETED;
  const isPending = userAchData?.status === AchievementStatus.IN_ANALYSIS;
  
  const [editMode, setEditMode] = useState(false);
  const [showBaseSettings, setShowBaseSettings] = useState(false);
  const [localMetadata, setLocalMetadata] = useState(achievement);
  const [activeAchTab, setActiveAchTab] = useState('GUIA');
  const [newComment, setNewComment] = useState('');

  const handleSaveBase = (e: React.FormEvent) => {
    e.preventDefault();
    updateAchievement(localMetadata);
    setShowBaseSettings(false);
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addFeedback(achievement.id, newComment);
    setNewComment('');
  };

  const handleAddBlock = (type: ContentType, order: number) => {
    achBlocks
      .filter(b => b.category === activeAchTab)
      .filter(b => (b.order || 0) >= order)
      .forEach(b => {
        updateContent({ ...b, order: (b.order || 0) + 1 });
      });

    const uniqueId = `blk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newBlock: Content = {
      id: uniqueId,
      gameId: game.id,
      achievementId: achievement.id,
      category: activeAchTab,
      title: type === 'interactive-map' ? 'Mapa Interativo' : 
             type === 'interactive-image' ? 'Imagem Interativa' : 'Nova Seção',
      type: type,
      content: type === 'text' ? 'Digite aqui seu guia detalhado...' : 
               (type === 'interactive-map' || type === 'interactive-image') ? 'https://picsum.photos/seed/map/2000/2000' :
               'https://youtube.com/embed/dQw4w9WgXcQ',
      synopsis: (type === 'image' || type === 'video') ? 'Explicação rápida do contexto desta mídia.' : '',
      author: currentUser?.name || 'Admin',
      order: order,
      width: '100%',
      alignment: 'top',
      updatedAt: new Date().toISOString()
    };
    addContent(newBlock);
  };

  const tabBlocks = achBlocks.filter(b => b.category === activeAchTab);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const findAndMove = (list: Content[]) => {
      const oldIndex = list.findIndex(b => b.id === active.id);
      const newIndex = list.findIndex(b => b.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newList = arrayMove(list, oldIndex, newIndex);
        
        // Update order property for each block to persist
        newList.forEach((block, idx) => {
          updateContent({
            ...block,
            order: idx
          });
        });
        return true;
      }
      return false;
    };

    findAndMove(tabBlocks);
  };

  const reorderBlock = (index: number, direction: 'up' | 'down') => {
      const list = [...tabBlocks];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return;
      
      const tempOrder = list[index].order || 0;
      list[index].order = list[targetIndex].order || 0;
      list[targetIndex].order = tempOrder;
      
      updateContent(list[index]);
      updateContent(list[targetIndex]);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-xl overflow-y-auto">
        <div className="bg-[#1b2838] w-full max-w-6xl rounded-3xl border border-transparent shadow-5xl relative flex flex-col max-h-[90vh] animate-scale-in overflow-hidden">
        
        {/* HEADER */}
        <div className="bg-[#171d25] p-8 flex items-center gap-8 border-b border-transparent relative">
           <RenderAchIcon icon={achievement.icon} className={`w-24 h-24 shrink-0 transition-all duration-1000
               ${isUnlocked ? 'grayscale-0 shadow-[0_0_20px_rgba(102,192,244,0.3)]' : (isPending ? 'grayscale-0' : 'grayscale opacity-30')}
           `} />
           <div className="flex-1">
              <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none mb-4">{achievement.name}</h2>
              <div className="flex items-center gap-4">
                 <span className={`px-4 py-1.5 rounded-full bg-black/40 border border-transparent text-[10px] font-black uppercase tracking-widest ${getDifficultyColor(achievement.difficulty)}`}>{achievement.difficulty}</span>
                 <span className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-transparent text-blue-300 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/10">{achievement.xp} XP DE CAÇA</span>
                 {currentUser?.isAdmin && (
                    <button type="button" onClick={() => setShowBaseSettings(true)} className="p-2 bg-white/5 hover:bg-steam-highlight hover:text-steam-dark rounded-xl transition-all shadow-xl">
                      <Settings className="w-5 h-5" />
                    </button>
                 )}
              </div>
           </div>
           <button type="button" onClick={onClose} className="p-3 hover:bg-red-500/20 rounded-full transition-all group absolute top-6 right-6"><X className="w-8 h-8 text-gray-500 group-hover:text-red-500" /></button>
        </div>

        {/* ABAS */}
        <div className="bg-[#171d25] px-8 flex gap-10 border-b border-transparent shrink-0 overflow-x-auto custom-scrollbar items-center justify-between">
          <div className="flex gap-10">
            {['DETALHES', 'GUIA', 'IMAGENS', 'VÍDEOS', 'ATUALIZAÇÕES'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveAchTab(tab)}
                className={`pb-5 pt-5 text-[11px] font-black uppercase tracking-[0.3em] relative transition-all ${activeAchTab === tab ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {tab}
                {activeAchTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-steam-highlight rounded-full"></div>}
              </button>
            ))}
          </div>
          {currentUser?.isAdmin && (
             <button type="button" onClick={() => setEditMode(!editMode)} className={`px-8 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 shadow-2xl ${editMode ? 'bg-green-600 text-white animate-pulse' : 'bg-steam-highlight text-steam-dark hover:scale-105'}`}>
                {editMode ? <Save className="w-4 h-4"/> : <Edit3 className="w-4 h-4"/>}
                {editMode ? 'SALVAR LAYOUT' : 'MODO BUILDER'}
             </button>
          )}
        </div>

        {/* CONTEÚDO RÍCO */}
        <div className="p-10 overflow-y-auto flex-1 bg-[#0d0f13] custom-scrollbar">
           <div className="max-w-4xl mx-auto w-full pb-20 flex flex-wrap gap-x-4 items-start">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={tabBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {tabBlocks.map((block, idx) => (
                    <BuilderBlock 
                      key={block.id} 
                      content={block} 
                      isEditMode={editMode} 
                      onMove={(dir) => reorderBlock(idx, dir)}
                      onDelete={deleteContent}
                      onUpdate={updateContent}
                      onNavigateSubPage={(id) => onNavigateSubPage(id)}
                      onAddBlock={handleAddBlock}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {tabBlocks.length === 0 && !editMode && (
                <div className="w-full py-40 flex flex-col items-center justify-center text-center opacity-20 group">
                    <div className="p-10 rounded-full bg-white/5 border-2 border-dashed border-transparent group-hover:scale-110 transition-transform">
                      <Layout className="w-20 h-20 text-gray-400" />
                    </div>
                    <p className="mt-8 text-sm font-black uppercase tracking-[0.4em] text-gray-400">Página em Construção</p>
                </div>
              )}

              {editMode && currentUser?.isAdmin && tabBlocks.length === 0 && (
                  <div className="w-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl group hover:border-steam-highlight/20 transition-all">
                      <div className="p-6 rounded-full bg-white/5 mb-6">
                        <Plus className="w-8 h-8 text-gray-500" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-8">Adicione o primeiro bloco para começar</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-4">
                        {[
                          { type: 'text', label: 'Texto', icon: <AlignLeft className="w-4 h-4" /> },
                          { type: 'image', label: 'Imagem', icon: <ImageIcon className="w-4 h-4" /> },
                          { type: 'video', label: 'Vídeo', icon: <Video className="w-4 h-4" /> },
                          { type: 'alert', label: 'Aviso', icon: <AlertTriangle className="w-4 h-4" /> },
                          { type: 'list', label: 'Lista', icon: <ListChecks className="w-4 h-4" /> },
                          { type: 'button', label: 'Botão', icon: <Square className="w-4 h-4" /> },
                          { type: 'interactive-image', label: 'Mapa', icon: <MousePointer2 className="w-4 h-4" /> }
                        ].map(item => (
                            <button key={item.type} onClick={() => handleAddBlock(item.type as ContentType, 0)} className="p-4 bg-white/5 rounded-xl hover:bg-steam-highlight hover:text-steam-dark flex flex-col items-center gap-2 transition-all text-gray-400 text-[9px] font-black uppercase tracking-widest border border-transparent">
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                      </div>
                  </div>
              )}

              {/* FEEDBACK (SÓ NO GUIA) */}
              {activeAchTab === 'GUIA' && !editMode && (
                  <div className="mt-20 border-t border-transparent pt-12 animate-fade-in">
                     <div className="flex items-center gap-3 mb-10">
                        <MessageSquare className="w-6 h-6 text-steam-highlight" />
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">Mural da Comunidade</h3>
                     </div>

                     <form onSubmit={handleSendComment} className="flex gap-5 mb-12">
                        <img src={currentUser?.avatar} className="w-12 h-12 rounded-xl border-2 border-transparent shrink-0 shadow-xl" alt="Me" />
                        <div className="flex-1 relative">
                           <textarea 
                             className="w-full bg-[#171a21] border border-transparent rounded-2xl p-5 text-white text-sm focus:border-steam-highlight outline-none resize-none h-24 font-sans pr-16 shadow-inner"
                             placeholder="Dê uma dica ou tire uma dúvida sobre esta conquista..."
                             value={newComment}
                             onChange={(e) => setNewComment(e.target.value)}
                           />
                           <button type="submit" className="absolute bottom-4 right-4 p-3 bg-steam-highlight text-steam-dark rounded-xl hover:scale-110 transition-all shadow-xl"><Send className="w-5 h-5" /></button>
                        </div>
                     </form>

                     <div className="space-y-6">
                        {achFeedbacks.length > 0 ? achFeedbacks.map(fb => (
                           <div key={fb.id} className="flex gap-5 p-6 bg-white/5 rounded-2xl border border-transparent group transition-all relative hover:bg-white/[0.08]">
                              <img 
                                src={fb.userAvatar} 
                                className="w-12 h-12 rounded-xl border border-transparent shrink-0 object-cover cursor-pointer hover:scale-105 transition-transform" 
                                alt={fb.userName} 
                                onClick={() => onNavigateProfile(fb.userId)}
                              />
                              <div className="flex-1 min-w-0">
                                 <div className="flex justify-between items-center mb-3">
                                    <div 
                                      className="font-black text-steam-highlight text-xs uppercase tracking-[0.2em] cursor-pointer hover:underline"
                                      onClick={() => onNavigateProfile(fb.userId)}
                                    >
                                      {fb.userName}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{new Date(fb.timestamp).toLocaleDateString()}</div>
                                        {currentUser?.isAdmin && (
                                            <button 
                                                type="button"
                                                onClick={(e) => { 
                                                    e.stopPropagation();
                                                    deleteFeedback(fb.id); 
                                                }} 
                                                className="text-red-500 hover:text-red-400 p-1 opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        )}
                                    </div>
                                 </div>
                                 <p className="text-gray-300 text-sm font-medium leading-relaxed break-words opacity-90 italic">"{fb.comment}"</p>
                              </div>
                           </div>
                        )) : (
                           <div className="text-center py-10 opacity-10 italic text-[10px] uppercase tracking-widest">Aguardando as primeiras dicas...</div>
                        )}
                     </div>
                  </div>
              )}
           </div>
        </div>
      </div>

      {showBaseSettings && (
         <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[110] p-4 backdrop-blur-2xl animate-fade-in">
            <div className="bg-[#1b2838] p-10 rounded-3xl w-full max-w-lg border border-transparent shadow-5xl">
               <h3 className="text-2xl font-black text-white mb-8 uppercase tracking-tighter border-b border-transparent pb-4">Configurações Gerais</h3>
               <form onSubmit={handleSaveBase} className="space-y-6">
                  <div>
                     <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Nome do Troféu</label>
                     <input 
                        className="w-full bg-[#171a21] border border-transparent rounded-xl p-4 text-white font-bold outline-none focus:border-steam-highlight" 
                        value={localMetadata.name} 
                        onChange={e => setLocalMetadata({...localMetadata, name: e.target.value})} 
                     />
                  </div>
                  <div>
                     <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Descrição</label>
                     <textarea 
                        className="w-full bg-[#171a21] border border-transparent rounded-xl p-4 text-white text-sm h-24 resize-none focus:border-steam-highlight" 
                        value={localMetadata.description} 
                        onChange={e => setLocalMetadata({...localMetadata, description: e.target.value})} 
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Dificuldade</label>
                        <select 
                           className="w-full bg-[#171a21] border border-transparent rounded-xl p-4 text-white text-xs" 
                           value={localMetadata.difficulty} 
                           onChange={e => setLocalMetadata({...localMetadata, difficulty: e.target.value as any})}
                        >
                           <option value="Fácil">Fácil</option>
                           <option value="Médio">Médio</option>
                           <option value="Difícil">Difícil</option>
                           <option value="Extremo">Extremo</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">XP</label>
                        <input 
                           type="number" 
                           className="w-full bg-[#171a21] border border-transparent rounded-xl p-4 text-white font-bold" 
                           value={localMetadata.xp} 
                           onChange={e => setLocalMetadata({...localMetadata, xp: Number(e.target.value)})} 
                        />
                     </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                     <button type="button" onClick={() => setShowBaseSettings(false)} className="flex-1 px-6 py-3 rounded-xl bg-white/5 text-gray-400 font-black uppercase tracking-widest text-[10px]">Cancelar</button>
                     <button type="submit" className="flex-1 px-6 py-3 rounded-xl bg-steam-highlight text-steam-dark font-black uppercase tracking-widest text-[10px]">Salvar Alterações</button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
    </>
  );
};

// --- COMPONENTE PRINCIPAL DETALHE DO JOGO ---
export const GameDetail: React.FC<GameDetailProps> = ({ game, onNavigateProfile }) => {
  const { achievements, contents, subPages, userProgress, toggleLibrary, toggleFavorite, currentUser, systemSettings, addContent, updateContent, deleteContent, addSubPage, updateSubPage, deleteSubPage } = useApp();
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showValidator, setShowValidator] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'easy' | 'hard'>('default');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'Todos'>('Todos');
  const [filterStatus, setFilterStatus] = useState<AchievementStatus | 'Todos'>('Todos');
  const [activeTab, setActiveTab] = useState<'achievements' | 'extras' | 'wiki'>('achievements');
  const [editMode, setEditMode] = useState(false);
  const [currentSubPageId, setCurrentSubPageId] = useState<string | null>(null);
  const [globalPercentages, setGlobalPercentages] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!game.steamAppId) return;
    let isMounted = true;
    api.getGlobalAchievementPercentages(game.steamAppId)
      .then(data => {
        if (!isMounted || !Array.isArray(data)) return;
        const map: Record<string, number> = {};
        data.forEach(item => {
          if (item && item.name) {
            map[item.name] = item.percent;
          }
        });
        setGlobalPercentages(map);
      })
      .catch(() => {
        // Fallback silencioso sem interromper a UI
      });
    return () => { isMounted = false; };
  }, [game.steamAppId]);

  const stats = useMemo(() => {
    const list = achievements.filter(a => a.gameId === game.id);
    const total = list.length;
    const completed = list.filter(a => userProgress[a.id]?.status === AchievementStatus.COMPLETED).length;
    const inAnalysis = list.filter(a => userProgress[a.id]?.status === AchievementStatus.IN_ANALYSIS).length;
    const inProgress = list.filter(a => userProgress[a.id]?.status === AchievementStatus.IN_PROGRESS).length;
    const locked = total - completed - inAnalysis - inProgress;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalXp = list.reduce((acc, a) => acc + (a.xp || 0), 0);
    const earnedXp = list.filter(a => userProgress[a.id]?.status === AchievementStatus.COMPLETED)
                         .reduce((acc, a) => acc + (a.xp || 0), 0);

    return { total, completed, inAnalysis, inProgress, locked, percentage, totalXp, earnedXp };
  }, [achievements, game.id, userProgress]);

  const currentSubPage = useMemo(() => 
    subPages.find(sp => sp.id === currentSubPageId),
    [subPages, currentSubPageId]
  );

  const breadcrumbs = useMemo(() => {
    if (!currentSubPageId) return [];
    const crumbs: { id: string | null; title: string }[] = [];
    let currentId: string | null = currentSubPageId;
    
    while (currentId) {
      const page = subPages.find(p => p.id === currentId);
      if (page) {
        crumbs.unshift({ id: page.id, title: page.title });
        // Find parent sub-page
        const parentContent = contents.find(c => c.id === page.parentContentId);
        currentId = parentContent?.subPageId || null;
      } else {
        currentId = null;
      }
    }
    
    crumbs.unshift({ id: null, title: 'WIKI PRINCIPAL' });
    return crumbs;
  }, [subPages, contents, currentSubPageId]);

  const gameAchievements = useMemo(() => {
    let list = achievements.filter(a => a.gameId === game.id);
    
    // Filtros
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(a => 
        a.name.toLowerCase().includes(term) || 
        a.description.toLowerCase().includes(term)
      );
    }

    if (filterDifficulty !== 'Todos') {
      list = list.filter(a => a.difficulty === filterDifficulty);
    }

    if (filterStatus !== 'Todos') {
      list = list.filter(a => {
        const status = userProgress[a.id]?.status || AchievementStatus.LOCKED;
        return status === filterStatus;
      });
    }

    const difficultyOrder: Record<Difficulty, number> = {
      'Fácil': 1,
      'Médio': 2,
      'Difícil': 3,
      'Extremo': 4
    };

    return [...list].sort((a, b) => {
      if (sortBy === 'default') return a.name.localeCompare(b.name);
      
      const orderA = difficultyOrder[a.difficulty] || 0;
      const orderB = difficultyOrder[b.difficulty] || 0;
      return sortBy === 'easy' ? orderA - orderB : orderB - orderA;
    });
  }, [achievements, game.id, sortBy, searchTerm, filterDifficulty, filterStatus, userProgress]);

  const extrasBlocks = useMemo(() => 
    contents.filter(c => c.gameId === game.id && !c.achievementId && c.category === 'EXTRAS')
            .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [contents, game.id]
  );

  const wikiBlocks = useMemo(() => 
    contents.filter(c => c.gameId === game.id && !c.achievementId && c.category === 'WIKI' && !c.subPageId)
            .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [contents, game.id]
  );

  const subPageBlocks = useMemo(() => 
    contents.filter(c => c.subPageId === currentSubPageId)
            .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [contents, currentSubPageId]
  );

  const handleAddSubPageBlock = (type: ContentType, order: number) => {
    if (!currentSubPageId) return;

    subPageBlocks
      .filter(b => (b.order || 0) >= order)
      .forEach(b => {
        updateContent({ ...b, order: (b.order || 0) + 1 });
      });

    const uniqueId = `spb_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newBlock: Content = {
      id: uniqueId,
      gameId: game.id,
      subPageId: currentSubPageId,
      category: 'SUBPAGE',
      title: type === 'interactive-map' ? 'Mapa Interativo' : 
             type === 'interactive-image' ? 'Imagem Interativa' : 'Novo Bloco',
      type: type,
      content: type === 'text' ? 'Digite aqui o conteúdo...' : 
               (type === 'interactive-map' || type === 'interactive-image') ? 'https://picsum.photos/seed/map/2000/2000' :
               'https://youtube.com/embed/dQw4w9WgXcQ',
      author: currentUser?.name || 'Admin',
      order: order,
      width: '100%',
      alignment: 'top',
      updatedAt: new Date().toISOString(),
      hotspots: []
    };
    addContent(newBlock);
  };

  const handleAddExtraBlock = (type: ContentType, order: number) => {
    extrasBlocks
      .filter(b => (b.order || 0) >= order)
      .forEach(b => {
        updateContent({ ...b, order: (b.order || 0) + 1 });
      });

    const uniqueId = `blk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newBlock: Content = {
      id: uniqueId,
      gameId: game.id,
      category: 'EXTRAS',
      title: type === 'interactive-map' ? 'Mapa Interativo' : 
             type === 'interactive-image' ? 'Imagem Interativa' : 'Novo Extra',
      type: type,
      content: type === 'text' ? 'Digite aqui seu conteúdo extra...' : 
               (type === 'interactive-map' || type === 'interactive-image') ? 'https://picsum.photos/seed/map/2000/2000' :
               'https://youtube.com/embed/dQw4w9WgXcQ',
      synopsis: (type === 'image' || type === 'video') ? 'Explicação rápida do contexto.' : '',
      author: currentUser?.name || 'Admin',
      order: order,
      width: '100%',
      alignment: 'top',
      updatedAt: new Date().toISOString(),
      hotspots: []
    };
    addContent(newBlock);
  };

  const handleAddWikiBlock = (type: ContentType, order: number) => {
    wikiBlocks
      .filter(b => (b.order || 0) >= order)
      .forEach(b => {
        updateContent({ ...b, order: (b.order || 0) + 1 });
      });

    const uniqueId = `wiki_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newBlock: Content = {
      id: uniqueId,
      gameId: game.id,
      category: 'WIKI',
      title: type === 'interactive-map' ? 'Mapa Interativo' : 
             type === 'interactive-image' ? 'Imagem Interativa' : 'Nova Seção Wiki',
      type: type,
      content: type === 'text' ? 'Digite aqui o conteúdo da wiki...' : 
               (type === 'interactive-map' || type === 'interactive-image') ? 'https://picsum.photos/seed/map/2000/2000' :
               'https://youtube.com/embed/dQw4w9WgXcQ',
      synopsis: (type === 'image' || type === 'video') ? 'Explicação rápida do contexto.' : '',
      author: currentUser?.name || 'Admin',
      order: order,
      width: '100%',
      alignment: 'top',
      updatedAt: new Date().toISOString(),
      hotspots: []
    };
    addContent(newBlock);
  };

  const reorderExtraBlock = (index: number, direction: 'up' | 'down') => {
    const list = [...extrasBlocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    
    const tempOrder = list[index].order || 0;
    list[index].order = list[targetIndex].order || 0;
    list[targetIndex].order = tempOrder;
    
    updateContent(list[index]);
    updateContent(list[targetIndex]);
  };

  const reorderWikiBlock = (index: number, direction: 'up' | 'down') => {
    const list = [...wikiBlocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    
    const tempOrder = list[index].order || 0;
    list[index].order = list[targetIndex].order || 0;
    list[targetIndex].order = tempOrder;
    
    updateContent(list[index]);
    updateContent(list[targetIndex]);
  };

  const reorderSubPageBlock = (index: number, direction: 'up' | 'down') => {
    const list = [...subPageBlocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    
    const tempOrder = list[index].order || 0;
    list[index].order = list[targetIndex].order || 0;
    list[targetIndex].order = tempOrder;
    
    updateContent(list[index]);
    updateContent(list[targetIndex]);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Se estamos arrastando sub-páginas
    if (String(active.id).startsWith('sp_')) {
      const activeId = String(active.id);
      const overId = String(over.id);
      
      const filteredSubPages = subPages
        .filter(sp => sp.gameId === game.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
        
      const oldIndex = filteredSubPages.findIndex(sp => sp.id === activeId);
      const newIndex = filteredSubPages.findIndex(sp => sp.id === overId);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(filteredSubPages, oldIndex, newIndex);
        reordered.forEach((sp, idx) => {
          updateSubPage({ ...sp, order: idx });
        });
      }
      return;
    }

    const findAndMove = (list: Content[]) => {
      const oldIndex = list.findIndex(b => b.id === active.id);
      const newIndex = list.findIndex(b => b.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newList = arrayMove(list, oldIndex, newIndex);
        newList.forEach((block, idx) => {
          updateContent({
            ...block,
            order: idx
          });
        });
        return true;
      }
      return false;
    };

    if (activeTab === 'wiki') {
      if (currentSubPageId) {
        findAndMove(subPageBlocks);
      } else {
        findAndMove(wikiBlocks);
      }
    } else if (activeTab === 'extras') {
      findAndMove(extrasBlocks);
    }
  };

  const unlockedCount = useMemo(() => 
    gameAchievements.filter(a => userProgress[a.id]?.status === AchievementStatus.COMPLETED).length,
    [gameAchievements, userProgress]
  );

  const progress = gameAchievements.length > 0 
    ? Math.round((unlockedCount / gameAchievements.length) * 100) 
    : 0;

  const isInLibrary = currentUser?.libraryGameIds.includes(game.id);
  const isFavorite = currentUser?.favoriteGameIds.includes(game.id);

  return (
    <>
      <div className="animate-fade-in pb-20">
      {/* Banner Section */}
      <div className="relative h-96 overflow-hidden">
        <img 
          src={game.bannerUrl} 
          className="w-full h-full object-cover scale-105 blur-[2px] opacity-40" 
          style={{ objectPosition: game.bannerPosition || 'center' }}
          alt="Banner" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-steam-base via-steam-base/60 to-transparent"></div>
        
        <div className="absolute inset-0 flex items-end p-8 md:p-12">
           <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-8 items-end">
              <img 
                src={game.coverUrl} 
                className="w-48 h-72 object-cover rounded-xl shadow-4xl border-2 border-transparent relative z-10" 
                style={{ objectPosition: game.coverPosition || 'center' }}
                alt={game.title} 
              />
              <div className="flex-1">
                 <div className="flex items-center gap-4 mb-4">
                    <button 
                      onClick={() => toggleLibrary(game.id)}
                      className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-2xl
                        ${isInLibrary ? 'bg-steam-green text-steam-dark' : 'bg-steam-light text-white hover:bg-steam-highlight hover:text-steam-dark'}
                      `}
                    >
                      <Library className="w-4 h-4" />
                      {isInLibrary ? 'Na Biblioteca' : 'Adicionar à Biblioteca'}
                    </button>
                    <button 
                      onClick={() => toggleFavorite(game.id)}
                      className={`p-2.5 rounded-lg transition-all shadow-2xl border
                        ${isFavorite ? 'bg-pink-500/20 border-transparent text-pink-400' : 'bg-white/5 border-transparent text-gray-400 hover:text-white'}
                      `}
                    >
                      <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                 </div>
                 <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none mb-2">{game.title}</h1>
                 <p className="text-steam-highlight font-black uppercase tracking-[0.4em] text-xs">{game.publisher}</p>
              </div>
              <div className="text-right hidden md:block">
                 <div className="text-6xl font-black text-white mb-1 leading-none">{progress}%</div>
                 <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Conclusão Total</div>
              </div>
           </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`max-w-7xl mx-auto px-8 md:px-12 mt-12 ${activeTab === 'wiki' ? 'flex flex-col gap-12' : 'grid grid-cols-1 lg:grid-cols-3 gap-12'}`}>
         {/* Left: Content Area */}
         <div className={`${activeTab === 'wiki' ? 'w-full max-w-5xl mx-auto space-y-8' : 'lg:col-span-2 space-y-8'}`}>
            <div className="flex flex-col gap-6 mb-8 border-b border-transparent pb-6">
               <div className="flex items-center justify-between">
                  <div className="flex gap-8">
                    <button 
                      onClick={() => setActiveTab('achievements')}
                      className={`pb-4 text-xl font-black uppercase tracking-tight flex items-center gap-3 transition-all relative ${activeTab === 'achievements' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      <Trophy className={activeTab === 'achievements' ? 'text-steam-highlight' : 'text-gray-600'} /> 
                      Conquistas do Jogo
                      {activeTab === 'achievements' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-steam-highlight rounded-full"></div>}
                    </button>
                    {systemSettings.isExtrasEnabled && (
                      <button 
                        onClick={() => setActiveTab('extras')}
                        className={`pb-4 text-xl font-black uppercase tracking-tight flex items-center gap-3 transition-all relative ${activeTab === 'extras' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        <Zap className={activeTab === 'extras' ? 'text-steam-highlight' : 'text-gray-600'} /> 
                        Extras e Ester egg
                        {activeTab === 'extras' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-steam-highlight rounded-full"></div>}
                      </button>
                    )}

                    <button 
                      onClick={() => setActiveTab('wiki')}
                      className={`pb-4 text-xl font-black uppercase tracking-tight flex items-center gap-3 transition-all relative ${activeTab === 'wiki' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      <Globe className={activeTab === 'wiki' ? 'text-steam-highlight' : 'text-gray-600'} /> 
                      Wiki
                      {activeTab === 'wiki' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-steam-highlight rounded-full"></div>}
                    </button>
                  </div>

                  {(activeTab === 'extras' || activeTab === 'wiki') && currentUser?.isAdmin && (
                    <button 
                      onClick={() => setEditMode(!editMode)}
                      className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-2xl ${editMode ? 'bg-green-600 text-white animate-pulse' : 'bg-steam-highlight text-steam-dark hover:scale-105'}`}
                    >
                      {editMode ? <Save className="w-4 h-4"/> : <Edit3 className="w-4 h-4"/>}
                      {editMode ? 'Salvar Layout' : 'Modo Builder'}
                    </button>
                  )}
               </div>

               {activeTab === 'achievements' && (
                 <div className="flex items-center justify-end">
                    <div className="flex gap-4 items-center">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setActiveTab('wiki')}
                          className="p-2.5 rounded-lg transition-all shadow-lg flex items-center gap-2 bg-black/40 text-gray-400 border border-transparent hover:bg-white/10"
                          title="Wiki do Jogo"
                        >
                          <Globe className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">WIKI</span>
                        </button>
                        <button 
                          onClick={() => setShowAI(true)}
                          className="bg-purple-600/20 text-purple-400 border border-purple-500/30 p-2.5 rounded-lg hover:bg-purple-600 hover:text-white transition-all shadow-lg"
                          title="Assistente IA (Lhama)"
                        >
                          <span className="text-xl">🦙</span>
                        </button>
                        <button 
                          onClick={() => setShowValidator(true)}
                          className="bg-steam-highlight text-steam-dark px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:scale-105 transition-all shadow-2xl shadow-blue-500/20"
                        >
                          <Scan className="w-4 h-4" /> Validar via Steam
                        </button>
                        {currentUser?.steamId && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-steam-green/10 border border-steam-green/20 rounded-lg animate-fade-in">
                            <div className="w-2 h-2 bg-steam-green rounded-full animate-pulse"></div>
                            <span className="text-[9px] font-black text-steam-green uppercase tracking-widest">Steam Vinculada</span>
                          </div>
                        )}
                      </div>
                    </div>
                 </div>
               )}
            </div>

            {activeTab === 'achievements' ? (
              <div className="space-y-8">
                {/* Dashboard de Progresso */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Trophy className="w-16 h-16" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-steam-highlight uppercase tracking-[0.2em] mb-1">Progresso Geral</p>
                      <h4 className="text-4xl font-black text-white tracking-tighter">{stats.percentage}%</h4>
                    </div>
                    <div className="mt-4">
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${stats.percentage}%` }}
                          className="h-full bg-steam-highlight"
                        />
                      </div>
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-2">
                        {stats.completed} de {stats.total} Conquistas
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Zap className="w-16 h-16" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-steam-highlight uppercase tracking-[0.2em] mb-1">XP Acumulado</p>
                      <h4 className="text-4xl font-black text-white tracking-tighter">{stats.earnedXp}</h4>
                    </div>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-2">
                      Total disponível: {stats.totalXp} XP
                    </p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Loader2 className="w-16 h-16" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-steam-highlight uppercase tracking-[0.2em] mb-1">Em Análise</p>
                      <h4 className="text-4xl font-black text-white tracking-tighter">{stats.inAnalysis}</h4>
                    </div>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-2">
                      Aguardando validação
                    </p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Lock className="w-16 h-16" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-steam-highlight uppercase tracking-[0.2em] mb-1">Bloqueadas</p>
                      <h4 className="text-4xl font-black text-white tracking-tighter">{stats.locked}</h4>
                    </div>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-2">
                      Continue jogando!
                    </p>
                  </div>
                </div>

                {/* Barra de Busca e Filtros */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-black/20 p-4 rounded-2xl border border-white/5">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="BUSCAR CONQUISTA..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-white placeholder:text-gray-600 outline-none focus:border-steam-highlight/50 transition-all"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-2">
                      <Target className="w-3.5 h-3.5 text-gray-500" />
                      <select 
                        value={filterDifficulty} 
                        onChange={(e) => setFilterDifficulty(e.target.value as any)}
                        className="bg-transparent text-[10px] font-black uppercase tracking-widest text-gray-300 outline-none cursor-pointer"
                      >
                        <option value="Todos">Todas Dificuldades</option>
                        <option value="Fácil">Fácil</option>
                        <option value="Médio">Médio</option>
                        <option value="Difícil">Difícil</option>
                        <option value="Extremo">Extremo</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
                      <select 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="bg-transparent text-[10px] font-black uppercase tracking-widest text-gray-300 outline-none cursor-pointer"
                      >
                        <option value="Todos">Todos Status</option>
                        <option value="COMPLETED">Concluído</option>
                        <option value="IN_ANALYSIS">Em Análise</option>
                        <option value="IN_PROGRESS">Em Progresso</option>
                        <option value="LOCKED">Bloqueado</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-2">
                      <Settings2 className="w-3.5 h-3.5 text-gray-500" />
                      <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-transparent text-[10px] font-black uppercase tracking-widest text-gray-300 outline-none cursor-pointer"
                      >
                        <option value="default">Ordem Padrão</option>
                        <option value="easy">Fácil → Difícil</option>
                        <option value="hard">Difícil → Fácil</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                 {gameAchievements.map(ach => {
                    const status = userProgress[ach.id]?.status || AchievementStatus.LOCKED;
                    const isUnlocked = status === AchievementStatus.COMPLETED;
                    const unlockPercent = ach.globalUnlockPercent ?? globalPercentages[ach.steamApiName || ''] ?? globalPercentages[ach.name];
                    
                    return (
                      <div 
                        key={ach.id}
                        onClick={() => setSelectedAchievement(ach)}
                        className={`group p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-5
                          ${isUnlocked ? 'bg-white/5 border-transparent hover:bg-white/10' : 'bg-black/20 border-transparent hover:border-transparent'}
                        `}
                      >
                        <RenderAchIcon 
                          icon={ach.icon} 
                          className={`w-16 h-16 transition-all duration-500 ${isUnlocked ? 'grayscale-0 shadow-[0_0_15px_rgba(102,192,244,0.3)]' : (userProgress[ach.id]?.status === AchievementStatus.IN_ANALYSIS ? 'grayscale-0' : 'grayscale opacity-30 group-hover:opacity-60')}`} 
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-black text-white uppercase tracking-tight group-hover:text-steam-highlight transition-colors">{ach.name}</h3>
                            {ach.isHidden && !isUnlocked && <EyeOff className="w-3 h-3 text-gray-600" />}
                            {status === AchievementStatus.IN_ANALYSIS && (
                              <span className="text-[8px] font-black bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse border border-blue-500/30">Em Análise</span>
                            )}
                            {status === AchievementStatus.IN_PROGRESS && (
                              <span className="text-[8px] font-black bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full uppercase tracking-widest border border-yellow-500/30">Em Progresso</span>
                            )}
                            {status === AchievementStatus.COMPLETED && (
                              <span className="text-[8px] font-black bg-steam-green/20 text-steam-green px-2 py-0.5 rounded-full uppercase tracking-widest border border-steam-green/30">Concluído</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-medium leading-relaxed truncate max-w-md">
                            {ach.isHidden && !isUnlocked ? 'Conquista secreta. Desbloqueie para ver os detalhes.' : ach.description}
                          </p>
                        </div>
                        <div className="text-right">
                           <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${getDifficultyColor(ach.difficulty)}`}>{ach.difficulty}</div>
                           <div className="text-xs font-black text-gray-600">{ach.xp} XP</div>
                           {unlockPercent !== undefined && (
                             <div className="text-[9px] font-bold text-steam-highlight/90 uppercase tracking-wider mt-1">
                               Apenas {unlockPercent.toFixed(1)}% conquistaram
                             </div>
                           )}
                        </div>
                      </div>
                    );
                 })}
              </div>
            </div>
            ) : (activeTab === 'wiki' || activeTab === 'extras') ? (
               <div className="animate-fade-in flex flex-col gap-8 w-full">
                 {/* Navegação Wiki */}
                 {(activeTab as string) === 'wiki' && (
                   <div className="w-full space-y-4">
                     <div className="bg-black/20 rounded-2xl border border-white/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                       <div className="flex items-center gap-2">
                         <BookOpen className="w-4 h-4 text-steam-highlight" />
                         <span className="text-[10px] font-black text-white uppercase tracking-widest">Navegação Wiki</span>
                       </div>
                       
                       {editMode && currentUser?.isAdmin && (
                         <button 
                           onClick={() => {
                             const newId = `sp_${Date.now()}`;
                             addSubPage({
                               id: newId,
                               gameId: game.id,
                               title: 'Nova Página',
                               order: subPages.filter(sp => sp.gameId === game.id).length,
                               createdAt: new Date().toISOString(),
                               updatedAt: new Date().toISOString()
                             });
                             setCurrentSubPageId(newId);
                           }}
                           className="px-4 py-2 bg-white/5 border border-dashed border-white/20 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:border-steam-highlight hover:text-steam-highlight transition-all flex items-center justify-center gap-1.5"
                         >
                           <Plus className="w-3.5 h-3.5" /> Criar Nova Página
                         </button>
                       )}
                     </div>

                     <div className="bg-black/10 rounded-2xl border border-white/5 p-3 flex flex-wrap items-center gap-2">
                       <button 
                         onClick={() => setCurrentSubPageId(null)}
                         className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!currentSubPageId ? 'bg-steam-highlight text-steam-dark shadow-lg' : 'text-gray-400 bg-white/5 border border-transparent hover:bg-white/10 hover:text-white'}`}
                       >
                         WIKI PRINCIPAL
                       </button>
                       
                       <div className="w-px h-6 bg-white/10 hidden sm:block mx-1" />

                       <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                         <SortableContext 
                           items={subPages.filter(sp => sp.gameId === game.id).sort((a, b) => (a.order || 0) - (b.order || 0)).map(sp => sp.id)} 
                           strategy={horizontalListSortingStrategy}
                         >
                           <div className="flex flex-wrap gap-2">
                             {subPages
                               .filter(sp => sp.gameId === game.id)
                               .sort((a, b) => (a.order || 0) - (b.order || 0))
                               .map(sp => (
                                 <SortableSubPageItem 
                                   key={sp.id}
                                   sp={sp}
                                   isActive={currentSubPageId === sp.id}
                                   isEditMode={editMode}
                                   onClick={() => setCurrentSubPageId(sp.id)}
                                   onDelete={(id) => {
                                    deleteSubPage(id);
                                    if (currentSubPageId === id) {
                                      setCurrentSubPageId(null);
                                    }
                                  }}
                                   onRename={(id, newTitle) => updateSubPage({ ...sp, title: newTitle, updatedAt: new Date().toISOString() })}
                                 />
                               ))}
                           </div>
                         </SortableContext>
                       </DndContext>
                     </div>
                   </div>
                 )}

                 <div className="flex-1 space-y-12">
                   {currentSubPageId ? (
                    <div className="animate-fade-in space-y-12">
                      <div className="flex flex-col gap-6 mb-8">
                        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
                          {breadcrumbs.map((crumb, idx) => (
                            <React.Fragment key={crumb.id || 'root'}>
                              <button 
                                onClick={() => setCurrentSubPageId(crumb.id)}
                                className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all
                                  ${idx === breadcrumbs.length - 1 ? 'text-steam-highlight' : 'text-gray-500 hover:text-white'}
                                `}
                              >
                                {crumb.title}
                              </button>
                              {idx < breadcrumbs.length - 1 && <span className="text-gray-700 text-[10px]">/</span>}
                            </React.Fragment>
                          ))}
                        </div>

                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => {
                              const parentCrumb = breadcrumbs[breadcrumbs.length - 2];
                              setCurrentSubPageId(parentCrumb?.id || null);
                            }}
                            className="p-3 bg-white/5 hover:bg-steam-highlight hover:text-steam-dark rounded-xl transition-all group"
                          >
                            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                          </button>
                          <div>
                            {editMode ? (
                              <input 
                                className="text-3xl font-black text-white uppercase tracking-tighter bg-transparent border-none outline-none focus:ring-0 w-full"
                                value={currentSubPage?.title || ''}
                                onChange={(e) => {
                                  if (currentSubPage) updateSubPage({ ...currentSubPage, title: e.target.value, updatedAt: new Date().toISOString() });
                                }}
                              />
                            ) : (
                              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{currentSubPage?.title}</h2>
                            )}
                            <p className="text-[10px] font-black text-steam-highlight uppercase tracking-[0.3em]">Sub-página Wiki</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-y-6 items-center w-full">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                          <SortableContext items={subPageBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                            {subPageBlocks.map((block, idx) => (
                              <BuilderBlock 
                                key={block.id} 
                                content={block} 
                                isEditMode={editMode} 
                                onMove={(dir) => reorderSubPageBlock(idx, dir)}
                                onDelete={deleteContent}
                                onUpdate={updateContent}
                                onNavigateSubPage={(id) => setCurrentSubPageId(id)}
                                onAddBlock={handleAddSubPageBlock}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                      </div>

                      {editMode && currentUser?.isAdmin && subPageBlocks.length === 0 && (
                        <div className="w-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl group hover:border-steam-highlight/20 transition-all">
                            <div className="p-6 rounded-full bg-white/5 mb-6">
                              <Plus className="w-8 h-8 text-gray-500" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-8">Adicione o primeiro bloco para esta página</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-4">
                              {[
                                { type: 'text', label: 'Texto', icon: <AlignLeft className="w-4 h-4" /> },
                                { type: 'image', label: 'Imagem', icon: <ImageIcon className="w-4 h-4" /> },
                                { type: 'video', label: 'Vídeo', icon: <Video className="w-4 h-4" /> },
                                { type: 'alert', label: 'Aviso', icon: <AlertTriangle className="w-4 h-4" /> },
                                { type: 'list', label: 'Lista', icon: <ListChecks className="w-4 h-4" /> },
                                { type: 'button', label: 'Botão', icon: <Square className="w-4 h-4" /> },
                                { type: 'interactive-image', label: 'Img Interativa', icon: <MousePointer2 className="w-4 h-4" /> },
                                { type: 'interactive-map', label: 'Mapa Interativo', icon: <Map className="w-4 h-4" /> }
                              ].map(item => (
                                  <button key={item.type} onClick={() => handleAddSubPageBlock(item.type as ContentType, 0)} className="p-4 bg-white/5 rounded-xl hover:bg-steam-highlight hover:text-steam-dark flex flex-col items-center gap-2 transition-all text-gray-400 text-[9px] font-black uppercase tracking-widest border border-transparent">
                                      {item.icon}
                                      {item.label}
                                  </button>
                              ))}
                            </div>
                        </div>
                      )}

                      {subPageBlocks.length === 0 && !editMode && (
                        <div className="w-full py-40 flex flex-col items-center justify-center text-center opacity-20 group">
                            <div className="p-10 rounded-full bg-white/5 border-2 border-dashed border-transparent group-hover:scale-110 transition-transform">
                              <BookOpen className="w-20 h-20 text-gray-400" />
                            </div>
                            <p className="mt-8 text-sm font-black uppercase tracking-[0.4em] text-gray-400">Página em Construção</p>
                        </div>
                      )}
                    </div>
                  ) : (activeTab as string) === 'wiki' ? (
                    <div className="animate-fade-in flex flex-col gap-y-6 items-center w-full">
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={wikiBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                          {wikiBlocks.map((block, idx) => (
                            <BuilderBlock 
                              key={block.id} 
                              content={block} 
                              isEditMode={editMode} 
                              onMove={(dir) => reorderWikiBlock(idx, dir)}
                              onDelete={deleteContent}
                              onUpdate={updateContent}
                              onNavigateSubPage={(id) => setCurrentSubPageId(id)}
                              onAddBlock={handleAddWikiBlock}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>

                      {wikiBlocks.length === 0 && !editMode && (
                         <div className="w-full py-40 flex flex-col items-center justify-center text-center opacity-20">
                             <div className="p-10 rounded-full bg-white/5 border-2 border-dashed border-transparent">
                               <Globe className="w-20 h-20 text-gray-400" />
                             </div>
                             <p className="mt-8 text-sm font-black uppercase tracking-[0.4em] text-gray-400">Nenhum Conteúdo Wiki</p>
                         </div>
                      )}

                      {editMode && currentUser?.isAdmin && wikiBlocks.length === 0 && (
                        <div className="w-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl group hover:border-steam-highlight/20 transition-all">
                            <div className="p-6 rounded-full bg-white/5 mb-6">
                              <Plus className="w-8 h-8 text-gray-500" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-8">Comece a construir sua Wiki</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-4">
                              {[
                                { type: 'text', label: 'Texto', icon: <AlignLeft className="w-4 h-4" /> },
                                { type: 'image', label: 'Imagem', icon: <ImageIcon className="w-4 h-4" /> },
                                { type: 'video', label: 'Vídeo', icon: <Video className="w-4 h-4" /> },
                                { type: 'alert', label: 'Aviso', icon: <AlertTriangle className="w-4 h-4" /> },
                                { type: 'list', label: 'Lista', icon: <ListChecks className="w-4 h-4" /> },
                                { type: 'button', label: 'Botão', icon: <Square className="w-4 h-4" /> },
                                { type: 'interactive-image', label: 'Img Interativa', icon: <MousePointer2 className="w-4 h-4" /> },
                                { type: 'interactive-map', label: 'Mapa Interativo', icon: <Map className="w-4 h-4" /> }
                              ].map(item => (
                                  <button key={item.type} onClick={() => handleAddWikiBlock(item.type as ContentType, 0)} className="p-4 bg-white/5 rounded-xl hover:bg-steam-highlight hover:text-steam-dark flex flex-col items-center gap-2 transition-all text-gray-400 text-[9px] font-black uppercase tracking-widest border border-transparent">
                                      {item.icon}
                                      {item.label}
                                  </button>
                              ))}
                            </div>
                        </div>
                      )}
                    </div>
                   ) : (
                <div className="animate-fade-in flex flex-col gap-y-6 items-center w-full">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={extrasBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                      {extrasBlocks.map((block, idx) => (
                    <BuilderBlock 
                      key={block.id} 
                      content={block} 
                      isEditMode={editMode} 
                      onMove={(dir) => reorderExtraBlock(idx, dir)}
                      onDelete={deleteContent}
                      onUpdate={updateContent}
                      onNavigateSubPage={(id) => setCurrentSubPageId(id)}
                      onAddBlock={handleAddExtraBlock}
                    />
                  ))}
                </SortableContext>
              </DndContext>

                 {extrasBlocks.length === 0 && !editMode && (
                    <div className="w-full py-40 flex flex-col items-center justify-center text-center opacity-20">
                        <div className="p-10 rounded-full bg-white/5 border-2 border-dashed border-transparent">
                          <Zap className="w-20 h-20 text-gray-400" />
                        </div>
                        <p className="mt-8 text-sm font-black uppercase tracking-[0.4em] text-gray-400">Nenhum Extra Encontrado</p>
                    </div>
                  )}

                  {editMode && currentUser?.isAdmin && extrasBlocks.length === 0 && (
                    <div className="w-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl group hover:border-steam-highlight/20 transition-all">
                        <div className="p-6 rounded-full bg-white/5 mb-6">
                          <Plus className="w-8 h-8 text-gray-500" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-8">Adicione o primeiro extra</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-4">
                          {[
                            { type: 'text', label: 'Texto', icon: <AlignLeft className="w-4 h-4" /> },
                            { type: 'image', label: 'Imagem', icon: <ImageIcon className="w-4 h-4" /> },
                            { type: 'video', label: 'Vídeo', icon: <Video className="w-4 h-4" /> },
                            { type: 'alert', label: 'Aviso', icon: <AlertTriangle className="w-4 h-4" /> },
                            { type: 'list', label: 'Lista', icon: <ListChecks className="w-4 h-4" /> },
                            { type: 'button', label: 'Botão', icon: <Square className="w-4 h-4" /> },
                            { type: 'interactive-image', label: 'Img Interativa', icon: <MousePointer2 className="w-4 h-4" /> },
                            { type: 'interactive-map', label: 'Mapa Interativo', icon: <Map className="w-4 h-4" /> }
                          ].map(item => (
                              <button key={item.type} onClick={() => handleAddExtraBlock(item.type as ContentType, 0)} className="p-4 bg-white/5 rounded-xl hover:bg-steam-highlight hover:text-steam-dark flex flex-col items-center gap-2 transition-all text-gray-400 text-[9px] font-black uppercase tracking-widest border border-transparent">
                                  {item.icon}
                                  {item.label}
                              </button>
                          ))}
                        </div>
                    </div>
                  )}
               </div>
            )}
         </div>
         </div>
       ) : null}
     </div>

         {/* Right: Stats & Sidebar Info */}
         <div className="space-y-8">
            <div className="bg-steam-dark p-8 rounded-2xl border border-transparent shadow-3xl">
               <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Status da Campanha</h3>
               <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-3">
                       <span className="text-white">Progresso Geral</span>
                       <span className="text-steam-highlight">{progress}%</span>
                    </div>
                    <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden border border-transparent">
                       <div className="h-full bg-gradient-to-r from-steam-highlight to-blue-500 shadow-[0_0_10px_rgba(102,192,244,0.4)]" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-black/20 p-4 rounded-xl border border-transparent">
                        <div className="text-2xl font-black text-white">{stats.completed}</div>
                        <div className="text-[8px] text-gray-500 uppercase font-black">Coletadas</div>
                     </div>
                     <div className="bg-black/20 p-4 rounded-xl border border-transparent">
                        <div className="text-2xl font-black text-white">{stats.locked}</div>
                        <div className="text-[8px] text-gray-500 uppercase font-black">Restantes</div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-gradient-to-br from-steam-highlight/10 to-transparent p-8 rounded-2xl border border-transparent">
               <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck className="text-steam-highlight w-6 h-6" />
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">Dica do Mestre</h3>
               </div>
               <p className="text-xs text-gray-300 font-medium leading-loose italic opacity-80">
                  "Utilize o scanner visual para validar suas conquistas sem precisar de capturas manuais. Nosso algoritmo reconhece os padrões de cores da Steam."
               </p>
             </div>
          </div>
        </div>
      </div>

      {selectedAchievement && (
        <AchievementModal 
          achievement={selectedAchievement} 
          game={game} 
          onClose={() => setSelectedAchievement(null)} 
          onNavigateProfile={onNavigateProfile}
          onNavigateSubPage={(id) => {
            setSelectedAchievement(null);
            setActiveTab('wiki');
            setCurrentSubPageId(id);
          }}
        />
      )}

      {showValidator && (
        <SteamValidator 
          gameId={game.id} 
          onClose={() => setShowValidator(false)} 
        />
      )}
      {showAI && (
        <AIAssistant 
          game={game}
          onClose={() => setShowAI(false)}
        />
      )}
    </>
  );
};

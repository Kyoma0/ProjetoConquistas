
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, ImageOverlay, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapHotspot } from '../types';
import { Map, Plus, Target, X, Edit2, Link as LinkIcon, Image as ImageIcon, Search } from 'lucide-react';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface InteractiveMapProps {
  imageUrl: string;
  hotspots: MapHotspot[];
  isAdmin?: boolean;
  onAddHotspot?: (x: number, y: number) => void;
  onEditHotspot?: (hotspot: MapHotspot) => void;
  onUpdateHotspot?: (hotspot: MapHotspot) => void;
  onDeleteHotspot?: (id: string) => void;
  onHotspotClick?: (hotspot: MapHotspot) => void;
}

const MapEvents = ({ 
  onMapClick, 
  onMouseMove 
}: { 
  onMapClick?: (e: L.LeafletMouseEvent) => void;
  onMouseMove?: (e: L.LeafletMouseEvent) => void;
}) => {
  useMapEvents({
    click: onMapClick || (() => {}),
    mousemove: onMouseMove || (() => {}),
  });
  return null;
};

const createCustomIcon = (hs: MapHotspot, currentZoom: number) => {
  const getIconSvg = (name: string) => {
    const icons: Record<string, string> = {
      'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>',
      'map': '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>',
      'flag': '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
      'info': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
      'camera': '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
      'trophy': '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55.47.98.97 1.21C11.47 18.44 12 19 12 19s.53-.56 1.03-.79c.5-.23.97-.66.97-1.21v-2.34c0-1.53-1.03-3.11-2.21-3.66a.5.5 0 0 1-.3-.46V7c0-1.1.9-2 2-2h-3c-1.1 0-2 .9-2 2v3.54a.5.5 0 0 1-.3.46c-1.18.55-2.21 2.13-2.21 3.66z"/>',
      'sword': '<path d="m14.5 17.5-2.5 2.5-2.5-2.5 2.5-2.5 2.5 2.5z"/><path d="m10 13 5-5"/><path d="m2 21 3-3"/><path d="m15 8 4-4 1 1-4 4-1-1z"/><path d="m17 10 1 1"/><path d="m13 6 1 1"/>',
      'search': '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
      'chest': '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V7a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v14"/><path d="M2 12h20"/>',
      'box': '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V7a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v14"/><path d="M2 12h20"/>',
      'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
      'skull': '<path d="M12 2a8 8 0 0 0-8 8v1c0 1.1.9 2 2 2h1v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3h1c1.1 0 2-.9 2-2v-1a8 8 0 0 0-8-8z"/><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M10 15h4"/>',
      'heart': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
      'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
      'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
      'crown': '<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/>',
      'key': '<path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 1.5 1.5M15.5 7.5 14 6"/>',
      'gem': '<path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
      'book': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'
    };
    const key = (name || 'target').toLowerCase().trim();
    return icons[key] || icons['target'];
  };

  // Base size is 32px (or user defined)
  const baseSize = hs.size || 32;
  
  // Dynamic Scaling: lower zoom level (zoomed out) -> slightly smaller (e.g., 0.75x) to avoid overlapping.
  // Higher zoom level (zoomed in) -> larger (e.g., 1.3x) to show rich details.
  const minScale = 0.75;
  const maxScale = 1.35;
  // Map zoom range goes from minZoom (e.g., -5) to maxZoom (e.g., 6). Let's normalize it nicely.
  const normalizedZoom = Math.max(0, currentZoom + 4); // offset by 4 so it's always positive for scaling
  const scale = minScale + (maxScale - minScale) * (Math.min(10, normalizedZoom) / 10);
  const iconInnerSize = baseSize * 0.5;

  const iconHtml = `
    <div class="relative group" style="width: ${baseSize}px; height: ${baseSize}px;">
      <div class="w-full h-full bg-steam-highlight rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(102,192,244,0.4)] border-2 border-steam-dark overflow-hidden transition-transform duration-300 ease-out"
           style="transform: scale(${scale});">
        ${hs.iconType === 'image' && hs.icon ? 
          `<img src="${hs.icon}" class="w-full h-full object-cover" />` : 
          `<svg xmlns="http://www.w3.org/2000/svg" width="${iconInnerSize}" height="${iconInnerSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-steam-dark">${getIconSvg(hs.icon || 'Target')}</svg>`
        }
      </div>
      <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-steam-dark/95 border border-white/10 px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none shadow-2xl z-50 backdrop-blur-md scale-90 group-hover:scale-100">
        <span class="text-[10px] font-black text-white uppercase tracking-widest">${hs.name}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker-icon',
    iconSize: [baseSize, baseSize],
    iconAnchor: [baseSize / 2, baseSize / 2]
  });
};

const MapController = ({ 
  bounds, 
  onZoomChange, 
  mapRef 
}: { 
  bounds: L.LatLngBoundsExpression, 
  onZoomChange: (zoom: number) => void, 
  mapRef: React.MutableRefObject<L.Map | null> 
}) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    mapRef.current = map;
    
    const updateMinZoom = () => {
      // Calcular o zoom que faz a imagem PREENCHER o container (sem barras pretas)
      // O parâmetro 'true' garante que a imagem ocupe todo o espaço disponível.
      const minZoom = map.getBoundsZoom(bounds, true);
      map.setMinZoom(minZoom);
      
      // Se o zoom atual for menor que o mínimo (ex: no carregamento), ajusta
      if (map.getZoom() < minZoom) {
        map.setZoom(minZoom);
      }
    };

    // Configuração inicial
    map.fitBounds(bounds); // Fit inicial
    updateMinZoom(); // Ajuste dinâmico do zoom mínimo
    
    // Centralizar o mapa dentro dos limites
    map.panInsideBounds(bounds, { animate: false });

    map.on('resize', updateMinZoom);
    onZoomChange(map.getZoom());
    
    return () => {
      map.off('resize', updateMinZoom);
      mapRef.current = null;
    };
  }, [map, bounds, mapRef, onZoomChange]);

  useMapEvents({
    zoom: () => onZoomChange(map.getZoom()),
    zoomend: () => onZoomChange(map.getZoom()),
  });

  return null;
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  imageUrl,
  hotspots,
  isAdmin,
  onAddHotspot,
  onEditHotspot,
  onUpdateHotspot,
  onDeleteHotspot,
  onHotspotClick
}) => {
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const mapRef = useRef<L.Map | null>(null);

  // Define bounds based on image size - memoized to avoid resetting map view on state/zoom updates
  const bounds = useMemo<L.LatLngBoundsExpression>(() => {
    if (!imageSize) return [[0, 0], [0, 0]];
    return [[0, 0], [imageSize.height, imageSize.width]];
  }, [imageSize]);

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      setMapReady(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  if (!imageSize) {
    return (
      <div className="w-full h-[600px] bg-steam-dark flex flex-col items-center justify-center rounded-2xl border border-white/5 animate-pulse">
        <Map className="w-12 h-12 text-gray-700 mb-4" />
        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando Mapa...</span>
      </div>
    );
  }

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (isAdmin && onAddHotspot) {
      // Convert latlng back to relative coordinates (0-1)
      const x = e.latlng.lng / imageSize.width;
      const y = (imageSize.height - e.latlng.lat) / imageSize.height;
      onAddHotspot(x, y);
    }
  };

  const handleMouseMove = (e: L.LeafletMouseEvent) => {
    const x = Math.min(100, Math.max(0, (e.latlng.lng / imageSize.width) * 100));
    const y = Math.min(100, Math.max(0, ((imageSize.height - e.latlng.lat) / imageSize.height) * 100));
    setHoverCoords({ x, y });
  };

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.fitBounds(bounds);
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  // Predefined marker categories for filter
  const filterCategories = [
    { key: 'target', label: 'Alvo' },
    { key: 'trophy', label: 'Troféu' },
    { key: 'sword', label: 'Combate' },
    { key: 'chest', label: 'Baú' },
    { key: 'key', label: 'Chave' },
    { key: 'skull', label: 'Chefe' },
    { key: 'star', label: 'Secreto' },
    { key: 'info', label: 'Info' }
  ];

  const toggleFilter = (key: string) => {
    setActiveFilters(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const filteredHotspots = hotspots.filter(hs => {
    const matchesSearch = hs.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilters.length === 0) return true;
    const hsIcon = (hs.icon || 'target').toLowerCase().trim();
    return activeFilters.includes(hsIcon);
  });

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0b0e14] group/map-container">
      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        maxBounds={bounds}
        maxBoundsViscosity={1.0}
        maxZoom={8}
        minZoom={-8}
        style={{ height: '100%', width: '100%', background: '#0b0e14' }}
        attributionControl={false}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        zoomControl={false}
      >
        <ImageOverlay
          url={imageUrl}
          bounds={bounds}
        />
        
        <MapEvents onMapClick={handleMapClick} onMouseMove={handleMouseMove} />
        <MapController bounds={bounds} onZoomChange={setCurrentZoom} mapRef={mapRef} />

        {filteredHotspots.map((hs) => {
          // Convert relative coordinates (0-1) to map coordinates
          const position: L.LatLngExpression = [imageSize.height * (1 - hs.y), imageSize.width * hs.x];
          
          return (
            <Marker 
              key={hs.id} 
              position={position}
              icon={createCustomIcon(hs, currentZoom)}
              draggable={isAdmin}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent?.stopPropagation();
                  if (!isAdmin) {
                    onHotspotClick?.(hs);
                  }
                },
                dragend: (e) => {
                  const marker = e.target;
                  const latlng = marker.getLatLng();
                  const x = latlng.lng / imageSize.width;
                  const y = (imageSize.height - latlng.lat) / imageSize.height;
                  onUpdateHotspot?.({ ...hs, x, y });
                }
              }}
            >
              <Popup className="custom-popup">
                <div 
                  className="p-3 min-w-[180px] bg-steam-base rounded-xl border border-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.nativeEvent?.stopPropagation();
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-2.5 pb-2 border-b border-white/5">
                    {hs.iconType === 'image' && hs.icon ? (
                      <img src={hs.icon} className="w-6 h-6 rounded object-cover" alt="" />
                    ) : (
                      <Target className="w-4 h-4 text-steam-highlight shrink-0" />
                    )}
                    <span className="font-black text-xs uppercase tracking-wider text-white truncate">{hs.name}</span>
                  </div>
                  
                  {isAdmin ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onEditHotspot?.(hs)}
                        className="flex-1 py-2 bg-steam-highlight text-steam-dark rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>
                      <button 
                        onClick={() => onDeleteHotspot?.(hs.id)}
                        className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                        title="Remover"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => onHotspotClick?.(hs)}
                      className="w-full py-2 bg-steam-highlight text-steam-dark rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <Search className="w-3 h-3" /> Explorar Guia
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Category Filters */}
      <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-2 max-w-[180px]">
        {isAdmin && (
          <div className="bg-steam-dark/95 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2 text-[10px] font-black text-steam-highlight uppercase tracking-[0.2em]">
              <Edit2 className="w-3 h-3" /> Modo Edição
            </div>
            <div className="text-[9px] text-gray-500 mt-1 font-bold">Clique no mapa para adicionar pontos</div>
          </div>
        )}

        <div className="bg-steam-dark/95 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-2xl flex flex-col gap-1.5">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Filtros de Ícones</span>
          <div className="grid grid-cols-2 gap-1.5">
            {filterCategories.map((cat) => {
              const active = activeFilters.includes(cat.key);
              return (
                <button
                  key={cat.key}
                  onClick={() => toggleFilter(cat.key)}
                  className={`px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border text-center ${active ? 'bg-steam-highlight/20 text-steam-highlight border-steam-highlight/40' : 'bg-[#10141d]/80 text-gray-400 border-white/5 hover:bg-white/5 hover:text-white'}`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
          {activeFilters.length > 0 && (
            <button
              onClick={() => setActiveFilters([])}
              className="mt-1 text-center text-[9px] font-black text-red-400 uppercase tracking-widest hover:text-red-300 transition-colors py-1 hover:bg-white/5 rounded-lg"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="absolute top-6 right-6 z-[1000] w-64">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-steam-highlight transition-colors" />
          <input 
            type="text"
            placeholder="Buscar no mapa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full !bg-[#10141d]/95 backdrop-blur-md border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-steam-highlight/50 focus:ring-1 focus:ring-steam-highlight/20 transition-all shadow-2xl"
          />
        </div>

        {searchQuery && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#10141d]/95 border border-white/10 rounded-xl overflow-hidden shadow-5xl max-h-60 overflow-y-auto backdrop-blur-md z-[1000] divide-y divide-white/5 animate-fade-in">
            {filteredHotspots.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500">
                Nenhum ponto encontrado
              </div>
            ) : (
              filteredHotspots.map((hs) => (
                <button
                  key={hs.id}
                  onClick={() => {
                    if (mapRef.current) {
                      const lat = imageSize.height * (1 - hs.y);
                      const lng = imageSize.width * hs.x;
                      mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 2));
                    }
                  }}
                  className="w-full text-left p-3 hover:bg-white/5 transition-all flex items-center gap-3 text-xs"
                >
                  <div className="w-6 h-6 rounded-full bg-steam-highlight/10 flex items-center justify-center text-steam-highlight shrink-0">
                    {hs.iconType === 'image' && hs.icon ? (
                      <img src={hs.icon} className="w-4 h-4 rounded object-cover" alt="" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-steam-highlight"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{hs.name}</p>
                    <p className="text-[10px] text-gray-400 truncate uppercase tracking-widest">
                      {hs.action === 'open_page' ? 'Abrir Página' : 'Criar Página'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Real-time Cursor Coordinates Display */}
      {hoverCoords && (
        <div className="absolute bottom-6 left-6 z-[1000] bg-steam-dark/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/10 shadow-2xl font-mono text-[10px] text-gray-400 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-steam-highlight font-black">X:</span>
            <span className="text-white font-bold">{hoverCoords.x.toFixed(1)}%</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span className="text-steam-highlight font-black">Y:</span>
            <span className="text-white font-bold">{hoverCoords.y.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* Custom Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-[1000]">
        <button 
          onClick={handleRecenter}
          className="w-10 h-10 bg-steam-dark/95 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-steam-highlight hover:border-steam-highlight/50 transition-all shadow-2xl group"
          title="Centralizar Mapa"
        >
          <Target className="w-5 h-5 group-active:scale-90 transition-transform" />
        </button>
        <div className="flex flex-col bg-steam-dark/95 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <button 
            onClick={handleZoomIn}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-steam-highlight hover:bg-white/5 transition-all border-b border-white/5"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button 
            onClick={handleZoomOut}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-steam-highlight hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5 rotate-45" />
          </button>
        </div>
      </div>

      <style>{`
        .leaflet-container {
          background-color: #0b0e14 !important;
        }
        .custom-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          color: white !important;
          border: none !important;
          border-radius: 12px !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .custom-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .custom-popup .leaflet-popup-tip-container {
          display: none !important;
        }
        .custom-marker-icon {
          background: none !important;
          border: none !important;
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .leaflet-marker-icon {
          filter: drop-shadow(0 0 8px rgba(102,192,244,0.4));
        }
      `}</style>
    </div>
  );
};


import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, ImageOverlay, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapHotspot } from '../types';
import { Map, Plus, Target, X, Edit2, Link as LinkIcon, Image as ImageIcon, Search, HelpCircle, Check, Award, Info, Sparkles } from 'lucide-react';

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
  mapId?: string;
  onUpdateImageUrl?: (url: string) => void;
  hotspots: MapHotspot[];
  isAdmin?: boolean;
  isEditingHotspot?: boolean;
  onAddHotspot?: (x: number, y: number) => void;
  onEditHotspot?: (hotspot: MapHotspot) => void;
  onUpdateHotspot?: (hotspot: MapHotspot) => void;
  onDeleteHotspot?: (id: string) => void;
  onHotspotClick?: (hotspot: MapHotspot) => void;
  categories?: { key: string; label: string; icon?: string }[];
  onUpdateCategories?: (categories: { key: string; label: string; icon?: string }[]) => void;
  mapWidth?: number;
  mapHeight?: number;
  onUpdateMapDimensions?: (width: number, height: number) => void;
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

const createCustomIcon = (hs: MapHotspot, currentZoom: number, isCompleted: boolean, categories: { key: string; label: string; icon?: string }[] = []) => {
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
    if (icons[key]) return icons[key];

    // Check custom category fallback
    const customCat = categories.find(c => c.key.toLowerCase().trim() === key);
    if (customCat && customCat.icon && icons[customCat.icon.toLowerCase().trim()]) {
      return icons[customCat.icon.toLowerCase().trim()];
    }

    return icons['target'];
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
      <div class="w-full h-full rounded-full flex items-center justify-center border-2 overflow-hidden transition-all duration-300 ease-out ${
        isCompleted 
          ? 'bg-green-500/20 border-green-500/80 shadow-[0_0_15px_rgba(34,197,94,0.4)] opacity-60' 
          : 'bg-steam-highlight border-steam-dark shadow-[0_0_20px_rgba(102,192,244,0.4)]'
      }" style="transform: scale(${scale});">
        ${hs.iconType === 'image' && hs.icon ? 
          `<img src="${hs.icon}" class="w-full h-full object-cover ${isCompleted ? 'grayscale' : ''}" />` : 
          `<svg xmlns="http://www.w3.org/2000/svg" width="${iconInnerSize}" height="${iconInnerSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="${isCompleted ? 'text-green-400' : 'text-steam-dark'}">${getIconSvg(hs.icon || 'Target')}</svg>`
        }
      </div>
      ${isCompleted ? `
        <div class="absolute -top-1 -right-1 w-4.5 h-4.5 bg-green-500 rounded-full border border-steam-dark flex items-center justify-center shadow-md animate-scale-in">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      ` : ''}
      <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-steam-dark/95 border border-white/10 px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none shadow-2xl z-50 backdrop-blur-md scale-90 group-hover:scale-100">
        <span class="text-[10px] font-black text-white uppercase tracking-widest">${hs.name} ${isCompleted ? '(Concluído)' : ''}</span>
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
  mapRef,
  setMapInstance
}: { 
  bounds: L.LatLngBoundsExpression, 
  onZoomChange: (zoom: number) => void, 
  mapRef: React.MutableRefObject<L.Map | null>,
  setMapInstance: (map: L.Map | null) => void
}) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    mapRef.current = map;
    setMapInstance(map);
    
    // Invalida o tamanho interno do Leaflet para se ajustar perfeitamente ao novo container
    map.invalidateSize();
    
    const updateMinZoom = () => {
      // Calcular o zoom que faz a imagem cobrir todo o container
      // O parâmetro 'true' garante que a imagem preencha todo o espaço (cover)
      const minZoom = map.getBoundsZoom(bounds, true);
      map.setMinZoom(minZoom); // Clampa estritamente para o mapa cobrir o fundo
      
      // Se o zoom atual for menor que o mínimo ajustado, ajusta
      if (map.getZoom() < minZoom) {
        map.setZoom(minZoom);
      }
    };

    // Configuração inicial
    const initialZoom = map.getBoundsZoom(bounds, true);
    const boundsArr = bounds as number[][];
    const center: L.LatLngExpression = [boundsArr[1][0] / 2, boundsArr[1][1] / 2];
    map.setView(center, initialZoom);
    updateMinZoom(); // Ajuste dinâmico do zoom mínimo
    
    // Aplicar limite máximo de arrasto de forma estrita no mapa
    const isBoundsValid = Array.isArray(bounds) && 
      bounds[1] && 
      (bounds[1] as any)[0] > 0 && 
      (bounds[1] as any)[1] > 0;

    if (isBoundsValid) {
      map.setMaxBounds(bounds);
      // @ts-ignore
      map.options.maxBoundsViscosity = 1.0;
    }
    
    // Centralizar o mapa dentro dos limites
    map.panInsideBounds(bounds, { animate: false });

    map.on('resize', updateMinZoom);
    onZoomChange(map.getZoom());
    
    return () => {
      map.off('resize', updateMinZoom);
      mapRef.current = null;
      setMapInstance(null);
    };
  }, [map, bounds, mapRef, onZoomChange, setMapInstance]);

  useMapEvents({
    zoom: () => onZoomChange(map.getZoom()),
    zoomend: () => onZoomChange(map.getZoom()),
  });

  return null;
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  imageUrl,
  mapId,
  onUpdateImageUrl,
  hotspots,
  isAdmin,
  isEditingHotspot,
  onAddHotspot,
  onEditHotspot,
  onUpdateHotspot,
  onDeleteHotspot,
  onHotspotClick,
  categories = [],
  onUpdateCategories,
  mapWidth,
  mapHeight,
  onUpdateMapDimensions
}) => {
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(() => {
    if (mapWidth && mapHeight) {
      return { width: mapWidth, height: mapHeight };
    }
    return null;
  });

  useEffect(() => {
    if (mapWidth && mapHeight) {
      setImageSize({ width: mapWidth, height: mapHeight });
    }
  }, [mapWidth, mapHeight]);

  const [isTiledMap, setIsTiledMap] = useState(false);
  const [isTiling, setIsTiling] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('completed_hotspots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHelp, setShowHelp] = useState(false);
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [newFilterLabel, setNewFilterLabel] = useState('');
  const [newFilterIcon, setNewFilterIcon] = useState('target');
  const [filterError, setFilterError] = useState('');
  const [editingFilter, setEditingFilter] = useState<{ key: string; label: string; icon: string } | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleCompleted = (id: string) => {
    setCompletedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('completed_hotspots', JSON.stringify(next));
      return next;
    });
  };

  const totalCount = hotspots.length;
  const completedCount = hotspots.filter(h => completedIds.includes(h.id)).length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Define bounds based on image size - memoized to avoid resetting map view on state/zoom updates
  const bounds = useMemo<L.LatLngBoundsExpression>(() => {
    if (!imageSize) return [[0, 0], [0, 0]];
    return [[0, 0], [imageSize.height, imageSize.width]];
  }, [imageSize]);

  // Strictly constrain the map bounds to the image dimensions to prevent leaking
  const maxBounds = useMemo<L.LatLngBoundsExpression | undefined>(() => {
    if (!imageSize) return undefined;
    return [[0, 0], [imageSize.height, imageSize.width]];
  }, [imageSize]);

  useEffect(() => {
    if (!containerRef.current || !mapInstance) return;

    const resizeObserver = new ResizeObserver(() => {
      mapInstance.invalidateSize();
      // Recalculate zoom and fit bounds if necessary (using true for cover behavior)
      const minZoom = mapInstance.getBoundsZoom(bounds, true);
      mapInstance.setMinZoom(minZoom);
      if (mapInstance.getZoom() < minZoom) {
        mapInstance.setZoom(minZoom);
      }
    });

    resizeObserver.observe(containerRef.current);

    // Immediate calculation after mounting / stabilization
    mapInstance.invalidateSize();
    const minZoom = mapInstance.getBoundsZoom(bounds, true);
    mapInstance.setMinZoom(minZoom);
    if (mapInstance.getZoom() < minZoom) {
      mapInstance.setZoom(minZoom);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [mapInstance, imageSize, bounds]);

  useEffect(() => {
    if (!imageUrl) return;

    if (imageUrl.startsWith('/tiles/')) {
      // It is a tiled map! Fetch metadata info.json
      fetch(`${imageUrl}/info.json`)
        .then(res => res.json())
        .then(data => {
          setImageSize({ width: data.width, height: data.height });
          setIsTiledMap(true);
          setMapReady(true);
          if (onUpdateMapDimensions && (!mapWidth || !mapHeight)) {
            onUpdateMapDimensions(data.width, data.height);
          }
        })
        .catch(err => {
          console.error("Error fetching tile info, using default size:", err);
          setImageSize({ width: 4000, height: 4000 });
          setIsTiledMap(true);
          setMapReady(true);
        });
    } else {
      setIsTiledMap(false);
      const img = new Image();
      img.onload = () => {
        const detectedWidth = img.width;
        const detectedHeight = img.height;
        setImageSize({ width: detectedWidth, height: detectedHeight });
        setMapReady(true);
        if (onUpdateMapDimensions && (!mapWidth || !mapHeight || mapWidth !== detectedWidth || mapHeight !== detectedHeight)) {
          onUpdateMapDimensions(detectedWidth, detectedHeight);
        }
      };
      img.onerror = () => {
        console.error("Error loading map image:", imageUrl);
        // Fallback for failed images
        setImageSize({ width: 2000, height: 2000 });
        setMapReady(true);
      };
      img.src = imageUrl;
    }
  }, [imageUrl, mapWidth, mapHeight, onUpdateMapDimensions]);

  // Predefined marker categories for filter
  const defaultFilterCategories = useMemo(() => [
    { key: 'target', label: 'Alvo', icon: 'target' },
    { key: 'trophy', label: 'Troféu', icon: 'trophy' },
    { key: 'sword', label: 'Combate', icon: 'sword' },
    { key: 'chest', label: 'Baú', icon: 'chest' },
    { key: 'key', label: 'Chave', icon: 'key' },
    { key: 'skull', label: 'Chefe', icon: 'skull' },
    { key: 'star', label: 'Secreto', icon: 'star' },
    { key: 'info', label: 'Info', icon: 'info' }
  ], []);

  const filterCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories.map(cat => ({
        key: cat.key.toLowerCase().trim(),
        label: cat.label,
        icon: cat.icon || 'target'
      }));
    }
    return defaultFilterCategories;
  }, [categories, defaultFilterCategories]);

  if (!imageSize) {
    return (
      <div 
        className="w-full h-[500px] md:h-[600px] bg-steam-dark flex flex-col items-center justify-center rounded-2xl border border-white/5 animate-pulse mx-auto"
      >
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
    if (mapRef.current && imageSize) {
      const minZoom = mapRef.current.getBoundsZoom(bounds, true);
      mapRef.current.setView([imageSize.height / 2, imageSize.width / 2], minZoom);
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

  const handleTileImage = async () => {
    if (!imageUrl || isTiling) return;
    
    if (imageUrl.startsWith('/tiles/')) {
      alert("Este mapa já está otimizado para alta resolução.");
      return;
    }

    if (!window.confirm("Deseja processar esta imagem para o formato de alta resolução? Isso fatiará o mapa em pequenos blocos (tiling) no servidor, eliminando o lag e permitindo carregar mapas gigantes sem travamentos.")) {
      return;
    }

    setIsTiling(true);
    try {
      const generatedMapId = mapId || `map_${Date.now()}`;
      const response = await fetch('/api/tile-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          mapId: generatedMapId
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao processar imagem');
      }

      const data = await response.json();
      if (data.baseUrl) {
        if (onUpdateImageUrl) {
          onUpdateImageUrl(data.baseUrl);
        }
        alert("Mapa processado com sucesso! Agora ele está otimizado para alta definição e rodará liso.");
      }
    } catch (err: any) {
      console.error("Error tiling map:", err);
      alert(`Falha ao otimizar o mapa: ${err.message}`);
    } finally {
      setIsTiling(false);
    }
  };

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

  const maxContainerHeight = 600;
  const maxContainerWidth = imageSize ? (maxContainerHeight * (imageSize.width / imageSize.height)) : undefined;
  const aspectRatioString = imageSize ? `${imageSize.width}/${imageSize.height}` : undefined;

  return (
    <div 
      id="map-container"
      ref={containerRef}
      className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0b0e14] group/map-container mx-auto"
      style={{ 
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        maxBounds={maxBounds}
        maxBoundsViscosity={1.0}
        maxZoom={10}
        minZoom={-12}
        style={{ height: '100%', width: '100%', background: '#0b0e14' }}
        attributionControl={false}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        zoomControl={false}
      >
        {isTiledMap ? (
          <TileLayer
            url={`${imageUrl}/{z}/{x}/{y}.png`}
            noWrap={true}
            bounds={bounds}
            maxZoom={10}
            minZoom={-12}
          />
        ) : (
          <ImageOverlay
            url={imageUrl}
            bounds={bounds}
          />
        )}
        
        <MapEvents onMapClick={handleMapClick} onMouseMove={handleMouseMove} />
        <MapController bounds={bounds} onZoomChange={setCurrentZoom} mapRef={mapRef} setMapInstance={setMapInstance} />

        {filteredHotspots.map((hs) => {
          // Convert relative coordinates (0-1) to map coordinates
          const position: L.LatLngExpression = [imageSize.height * (1 - hs.y), imageSize.width * hs.x];
          
          return (
            <Marker 
              key={hs.id} 
              position={position}
              icon={createCustomIcon(hs, currentZoom, completedIds.includes(hs.id), filterCategories)}
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
                  
                  {/* Completion Toggle Button */}
                  <div className="mb-2.5">
                    <button
                      onClick={() => toggleCompleted(hs.id)}
                      className={`w-full py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 border ${
                        completedIds.includes(hs.id)
                          ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                          : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {completedIds.includes(hs.id) ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" /> Concluído
                        </>
                      ) : (
                        <>
                          <Award className="w-3.5 h-3.5 text-gray-400 animate-pulse" /> Concluir Ponto
                        </>
                      )}
                    </button>
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
      <div className={`absolute top-6 left-6 z-[1000] flex flex-col gap-2 max-w-[180px] transition-all duration-300 ${isEditingHotspot ? 'opacity-30 pointer-events-none scale-95 blur-[1px]' : ''}`}>
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
          
          <button
            onClick={() => setActiveFilters([])}
            className={`w-full py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border text-center ${
              activeFilters.length === 0 
                ? 'bg-steam-highlight text-steam-dark border-steam-highlight shadow-[0_0_10px_rgba(102,192,244,0.2)]' 
                : 'bg-[#10141d]/80 text-gray-400 border-white/5 hover:bg-white/5 hover:text-white'
            }`}
          >
            Todos ({totalCount})
          </button>

          <div className="grid grid-cols-2 gap-1.5 mt-1">
            {filterCategories.map((cat) => {
              const active = activeFilters.includes(cat.key);
              const count = hotspots.filter(h => (h.icon || 'target').toLowerCase().trim() === cat.key).length;
              const completedOfCat = hotspots.filter(h => (h.icon || 'target').toLowerCase().trim() === cat.key && completedIds.includes(h.id)).length;

              return (
                <div key={cat.key} className="relative group/cat">
                  <button
                    onClick={() => toggleFilter(cat.key)}
                    className={`w-full px-1.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border flex flex-col items-center justify-center ${
                      active 
                        ? 'bg-steam-highlight/20 text-steam-highlight border-steam-highlight/40' 
                        : 'bg-[#10141d]/80 text-gray-400 border-white/5 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="truncate max-w-full text-center">{cat.label}</span>
                    <span className="text-[8px] opacity-60 mt-0.5 font-mono">{completedOfCat}/{count}</span>
                  </button>
                  {isAdmin && onUpdateCategories && (
                    <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover/cat:opacity-100 transition-all z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setEditingFilter({
                            key: cat.key,
                            label: cat.label,
                            icon: cat.icon || 'target'
                          });
                          setShowAddFilter(false);
                        }}
                        className="w-4 h-4 bg-steam-highlight hover:bg-white text-steam-dark rounded-full flex items-center justify-center transition-all shadow-lg"
                        title="Editar Filtro"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (window.confirm(`Excluir o filtro "${cat.label}"?`)) {
                            const currentCats = categories && categories.length > 0 ? categories : defaultFilterCategories;
                            const nextCats = currentCats.filter(c => c.key !== cat.key);
                            onUpdateCategories(nextCats);
                          }
                        }}
                        className="w-4 h-4 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all shadow-lg"
                        title="Excluir Filtro"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Admin filter editing */}
          {isAdmin && editingFilter && onUpdateCategories && (
            <div className="mt-2 border-t border-white/5 pt-2">
              <div className="space-y-2 text-left bg-black/40 p-2 rounded-lg border border-steam-highlight/30 animate-fade-in">
                <div className="flex items-center gap-1 text-[8px] font-black text-steam-highlight uppercase tracking-wider">
                  <Edit2 className="w-2.5 h-2.5" /> Editar Filtro
                </div>
                <div>
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Nome</label>
                  <input
                    type="text"
                    value={editingFilter.label}
                    onChange={e => setEditingFilter({ ...editingFilter, label: e.target.value })}
                    className="w-full bg-[#10141d] border border-white/10 rounded px-1.5 py-1 text-[10px] text-white font-bold outline-none focus:border-steam-highlight"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Símbolo</label>
                  <select
                    value={editingFilter.icon}
                    onChange={e => setEditingFilter({ ...editingFilter, icon: e.target.value })}
                    className="w-full bg-[#10141d] border border-white/10 rounded px-1 py-1 text-[10px] text-white font-bold outline-none focus:border-steam-highlight"
                  >
                    <option value="target">Alvo</option>
                    <option value="map">Mapa</option>
                    <option value="flag">Bandeira</option>
                    <option value="info">Informação</option>
                    <option value="camera">Câmera</option>
                    <option value="trophy">Troféu</option>
                    <option value="sword">Espada</option>
                    <option value="chest">Baú</option>
                    <option value="star">Estrela</option>
                    <option value="skull">Caveira</option>
                    <option value="heart">Coração</option>
                    <option value="zap">Raio</option>
                    <option value="shield">Escudo</option>
                    <option value="crown">Coroa</option>
                    <option value="key">Chave</option>
                    <option value="gem">Gema</option>
                    <option value="book">Livro</option>
                  </select>
                </div>
                <div className="flex gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = editingFilter.label.trim();
                      if (!trimmed) return;
                      const currentCats = categories && categories.length > 0 ? categories : defaultFilterCategories;
                      const nextCats = currentCats.map(c => 
                        c.key === editingFilter.key ? { ...c, label: trimmed, icon: editingFilter.icon } : c
                      );
                      onUpdateCategories(nextCats);
                      setEditingFilter(null);
                    }}
                    className="flex-1 py-1 bg-steam-highlight text-steam-dark hover:bg-white rounded text-[8px] font-black uppercase tracking-wider transition-colors"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingFilter(null)}
                    className="py-1 px-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded text-[8px] font-black uppercase tracking-wider transition-colors"
                  >
                    Sair
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Admin filter creation */}
          {isAdmin && onUpdateCategories && (
            <div className="mt-2 border-t border-white/5 pt-2 flex flex-col gap-1.5">
              {!showAddFilter ? (
                <>
                  <button
                    onClick={() => {
                      setFilterError('');
                      setShowAddFilter(true);
                      setEditingFilter(null);
                    }}
                    className="w-full py-1.5 bg-steam-highlight/10 text-steam-highlight border border-steam-highlight/20 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-steam-highlight hover:text-steam-dark transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3 h-3" /> Novo Filtro
                  </button>
                  {categories && categories.length > 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm("Restaurar todos os filtros para o padrão original? Isso removerá as suas customizações de categorias de filtros.")) {
                          onUpdateCategories([]);
                        }
                      }}
                      className="w-full py-1 text-[8px] text-gray-500 hover:text-steam-highlight uppercase tracking-wider transition-colors text-center font-bold"
                    >
                      Restaurar Padrões
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-2 text-left bg-black/40 p-2 rounded-lg border border-white/5 animate-fade-in">
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Nome do Filtro</label>
                    <input
                      type="text"
                      placeholder="Ex: Santuário"
                      value={newFilterLabel}
                      onChange={e => {
                        setNewFilterLabel(e.target.value);
                        setFilterError('');
                      }}
                      className="w-full bg-[#10141d] border border-white/10 rounded px-1.5 py-1 text-[10px] text-white font-bold outline-none focus:border-steam-highlight"
                    />
                  </div>

                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Símbolo Base</label>
                    <select
                      value={newFilterIcon}
                      onChange={e => setNewFilterIcon(e.target.value)}
                      className="w-full bg-[#10141d] border border-white/10 rounded px-1 py-1 text-[10px] text-white font-bold outline-none focus:border-steam-highlight"
                    >
                      <option value="target">Alvo (Círculo)</option>
                      <option value="map">Mapa</option>
                      <option value="flag">Bandeira</option>
                      <option value="info">Informação</option>
                      <option value="camera">Câmera</option>
                      <option value="trophy">Troféu</option>
                      <option value="sword">Espada</option>
                      <option value="chest">Baú</option>
                      <option value="star">Estrela</option>
                      <option value="skull">Caveira</option>
                      <option value="heart">Coração</option>
                      <option value="zap">Raio</option>
                      <option value="shield">Escudo</option>
                      <option value="crown">Coroa</option>
                      <option value="key">Chave</option>
                      <option value="gem">Gema</option>
                      <option value="book">Livro</option>
                    </select>
                  </div>

                  {filterError && (
                    <p className="text-[8px] font-bold text-red-400 uppercase tracking-wider leading-tight">{filterError}</p>
                  )}

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newFilterLabel.trim();
                        if (!trimmed) {
                          setFilterError('Digite o nome do filtro.');
                          return;
                        }
                        
                        // Generate key
                        const key = trimmed
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9]/g, '_')
                          .replace(/_+/g, '_');

                        if (!key) {
                          setFilterError('Nome inválido.');
                          return;
                        }

                        // Check if key already exists
                        const alreadyExists = filterCategories.some(c => c.key === key);
                        if (alreadyExists) {
                          setFilterError('Filtro já existe.');
                          return;
                        }

                        const currentCats = categories && categories.length > 0 ? categories : defaultFilterCategories;
                        const newFilter = { key, label: trimmed, icon: newFilterIcon };
                        onUpdateCategories([...currentCats, newFilter]);
                        
                        setNewFilterLabel('');
                        setNewFilterIcon('target');
                        setShowAddFilter(false);
                      }}
                      className="flex-1 py-1 bg-steam-highlight text-steam-dark hover:bg-white rounded text-[8px] font-black uppercase tracking-wider transition-colors"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewFilterLabel('');
                        setNewFilterIcon('target');
                        setShowAddFilter(false);
                        setFilterError('');
                      }}
                      className="py-1 px-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded text-[8px] font-black uppercase tracking-wider transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeFilters.length > 0 && (
            <button
              onClick={() => setActiveFilters([])}
              className="mt-1 text-center text-[9px] font-black text-red-400 uppercase tracking-widest hover:text-red-300 transition-colors py-1 hover:bg-white/5 rounded-lg"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {/* Progress Tracker Panel */}
        <div className="bg-steam-dark/95 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-2xl flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-steam-highlight uppercase tracking-wider">Progresso</span>
            <span className="text-[9px] font-mono font-bold text-white">
              {completedCount}/{totalCount}
            </span>
          </div>
          <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden border border-white/5">
            <div 
              className="bg-gradient-to-r from-steam-highlight to-green-500 h-full transition-all duration-500" 
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-[8px] text-gray-400 font-bold text-center mt-0.5 uppercase tracking-widest">{percent}% Concluído</span>
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
        <div className={`absolute bottom-6 left-6 z-[1000] bg-steam-dark/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/10 shadow-2xl font-mono text-[10px] text-gray-400 flex items-center gap-3 transition-all duration-300 ${isEditingHotspot ? 'opacity-30 pointer-events-none' : ''}`}>
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
      <div className={`absolute bottom-6 right-6 flex flex-col gap-2 z-[1000] transition-all duration-300 ${isEditingHotspot ? 'opacity-30 pointer-events-none scale-95 blur-[1px]' : ''}`}>
        {isAdmin && !imageUrl.startsWith('/tiles/') && (
          <button 
            onClick={handleTileImage}
            disabled={isTiling}
            className={`w-10 h-10 bg-steam-dark/95 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-steam-highlight hover:border-steam-highlight/50 transition-all shadow-2xl group ${isTiling ? 'animate-pulse' : ''}`}
            title="Otimizar para Alta Resolução (Tiling)"
          >
            <Sparkles className={`w-5 h-5 group-active:scale-90 transition-transform ${isTiling ? 'text-steam-highlight animate-spin' : ''}`} />
          </button>
        )}
        <button 
          onClick={() => setShowHelp(true)}
          className="w-10 h-10 bg-steam-dark/95 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-steam-highlight hover:border-steam-highlight/50 transition-all shadow-2xl group"
          title="Como Usar o Mapa"
        >
          <HelpCircle className="w-5 h-5 group-active:scale-90 transition-transform" />
        </button>
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

      {/* Backdrop overlay covering map when editing hotspot */}
      {isEditingHotspot && (
        <div className="absolute inset-0 bg-[#080b11]/60 backdrop-blur-[1.5px] z-[1200] flex items-center justify-center pointer-events-auto transition-all duration-300">
          <div className="bg-[#1b2838]/95 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl max-w-xs text-center flex flex-col items-center gap-3 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-steam-highlight/10 flex items-center justify-center text-steam-highlight animate-pulse">
              <Target className="w-6 h-6 animate-spin-slow" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Edição de Ponto Ativa</h4>
            <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
              O painel de filtros e controles do mapa estão desativados enquanto você configura este ponto no formulário superior.
            </p>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-[2000] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[#1b2838] p-6 rounded-3xl w-full max-w-sm border border-white/10 shadow-5xl relative animate-scale-in">
            <button 
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
              <div className="w-8 h-8 rounded-lg bg-steam-highlight/10 flex items-center justify-center text-steam-highlight">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Guia do Caçador</h3>
            </div>
            <div className="space-y-3.5 text-xs text-gray-300">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center font-mono text-[10px] text-steam-highlight font-black shrink-0">1</div>
                <div>
                  <p className="font-bold text-white mb-0.5">Filtrar e Buscar</p>
                  <p className="text-[11px] text-gray-400">Use o menu lateral esquerdo para filtrar por categorias ou a barra de busca no topo para achar pontos de interesse específicos.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center font-mono text-[10px] text-steam-highlight font-black shrink-0">2</div>
                <div>
                  <p className="font-bold text-white mb-0.5">Acompanhar Progresso</p>
                  <p className="text-[11px] text-gray-400">Clique em qualquer ponto do mapa e marque-o como <span className="text-green-400 font-bold">"Concluído"</span> para acompanhar seu avanço em tempo real no painel de progresso.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center font-mono text-[10px] text-steam-highlight font-black shrink-0">3</div>
                <div>
                  <p className="font-bold text-white mb-0.5">Navegação e Zoom</p>
                  <p className="text-[11px] text-gray-400">Arraste o mapa com o mouse, role a rodinha para zoom, ou use os botões rápidos no canto inferior direito para navegar.</p>
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-start gap-2.5 p-2.5 bg-steam-highlight/5 rounded-xl border border-steam-highlight/10">
                  <div className="w-5 h-5 rounded-full bg-steam-highlight/10 flex items-center justify-center font-mono text-[10px] text-steam-highlight font-black shrink-0">🛠️</div>
                  <div>
                    <p className="font-bold text-steam-highlight mb-0.5 uppercase tracking-wide text-[10px]">Ações de Administrador</p>
                    <p className="text-[10px] text-gray-400">Clique em qualquer parte vazia do mapa para inserir um novo ponto ou arraste os ícones existentes para ajustar as coordenadas.</p>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="w-full mt-5 py-2.5 bg-steam-highlight text-steam-dark rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-md"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <style>{`
        .leaflet-container {
          background-color: #0b0e14 !important;
        }
        .leaflet-container img {
          max-width: none !important;
          max-height: none !important;
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

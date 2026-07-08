
import React, { useEffect, useRef, useState } from 'react';
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

const MapEvents = ({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) => {
  useMapEvents({
    click: onMapClick,
  });
  return null;
};

const createCustomIcon = (hs: MapHotspot, currentZoom: number) => {
  const getIconSvg = (name: string) => {
    const icons: Record<string, string> = {
      'Target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>',
      'Map': '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>',
      'Flag': '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
      'Info': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
      'Camera': '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
      'Trophy': '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55.47.98.97 1.21C11.47 18.44 12 19 12 19s.53-.56 1.03-.79c.5-.23.97-.66.97-1.21v-2.34c0-1.53-1.03-3.11-2.21-3.66a.5.5 0 0 1-.3-.46V7c0-1.1.9-2 2-2h-3c-1.1 0-2 .9-2 2v3.54a.5.5 0 0 1-.3.46c-1.18.55-2.21 2.13-2.21 3.66z"/>',
      'Sword': '<path d="m14.5 17.5-2.5 2.5-2.5-2.5 2.5-2.5 2.5 2.5z"/><path d="m10 13 5-5"/><path d="m2 21 3-3"/><path d="m15 8 4-4 1 1-4 4-1-1z"/><path d="m17 10 1 1"/><path d="m13 6 1 1"/>',
      'Search': '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'
    };
    return icons[name] || icons['Target'];
  };

  // Base size is 32px (or user defined)
  const baseSize = hs.size || 32;
  
  // More aggressive inverse scaling to ensure the pin stays small when zoomed in
  // At zoom 0, scale is 1. At zoom 6, scale is ~0.25
  const scale = Math.max(0.3, Math.pow(0.82, currentZoom));
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
  const [tileBaseUrl, setTileBaseUrl] = useState<string | null>(null);
  const [isTiling, setIsTiling] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      setMapReady(true);
    };
    img.src = imageUrl;

    // Attempt to get tiles for better performance
    const getTiles = async () => {
      setIsTiling(true);
      try {
        // Sanitize URL to create a safe mapId
        const mapId = imageUrl.split('/').pop()?.split('?')[0].replace(/[^a-zA-Z0-9]/g, '').substring(0, 32) || 'default_map';
        const response = await fetch('/api/tile-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl, mapId })
        });
        if (response.ok) {
          const data = await response.json();
          setTileBaseUrl(data.baseUrl);
        }
      } catch (err) {
        console.error('Error getting tiles:', err);
      } finally {
        setIsTiling(false);
      }
    };

    getTiles();
  }, [imageUrl]);

  if (!imageSize) {
    return (
      <div className="w-full aspect-video bg-steam-dark flex flex-col items-center justify-center rounded-2xl border border-white/5 animate-pulse">
        <Map className="w-12 h-12 text-gray-700 mb-4" />
        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Carregando Mapa...</span>
      </div>
    );
  }

  // Define bounds based on image size
  // We use a simple CRS where 1 unit = 1 pixel
  const bounds: L.LatLngBoundsExpression = [[0, 0], [imageSize.height, imageSize.width]];

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (isAdmin && onAddHotspot) {
      // Convert latlng back to relative coordinates (0-1)
      const x = e.latlng.lng / imageSize.width;
      const y = (imageSize.height - e.latlng.lat) / imageSize.height;
      onAddHotspot(x, y);
    }
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

  const filteredHotspots = hotspots.filter(hs => 
    hs.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0b0e14] group/map-container">
      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        maxBounds={bounds}
        maxBoundsViscosity={1.0}
        maxZoom={6}
        minZoom={0}
        style={{ height: '100%', width: '100%', background: '#0b0e14' }}
        attributionControl={false}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        zoomControl={false}
      >
        {tileBaseUrl ? (
          <TileLayer
            url={`${tileBaseUrl}/{z}/{x}/{y}.png`}
            noWrap={true}
            bounds={bounds}
            maxNativeZoom={6}
            minZoom={0}
            tileSize={256}
          />
        ) : (
          <ImageOverlay
            url={imageUrl}
            bounds={bounds}
          />
        )}
        
        {isAdmin && <MapEvents onMapClick={handleMapClick} />}
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
                click: () => !isAdmin && onHotspotClick?.(hs),
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
                <div className="p-2 min-w-[150px]">
                  <div className="flex items-center gap-2 mb-2">
                    {hs.iconType === 'image' && hs.icon ? (
                      <img src={hs.icon} className="w-6 h-6 rounded object-cover" alt="" />
                    ) : (
                      <Target className="w-4 h-4 text-steam-highlight" />
                    )}
                    <span className="font-black text-xs uppercase tracking-tight text-white">{hs.name}</span>
                  </div>
                  
                  {isAdmin ? (
                    <div className="flex gap-2 pt-2 border-t border-white/10">
                      <button 
                        onClick={() => onEditHotspot?.(hs)}
                        className="flex-1 py-1.5 bg-steam-highlight text-steam-dark rounded text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>
                      <button 
                        onClick={() => onDeleteHotspot?.(hs.id)}
                        className="p-1.5 bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => onHotspotClick?.(hs)}
                      className="w-full py-2 bg-steam-highlight text-steam-dark rounded text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
                    >
                      <Search className="w-3 h-3" /> Explorar
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Search Bar */}
      <div className="absolute top-6 right-6 z-[1000] w-64">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-steam-highlight transition-colors" />
          <input 
            type="text"
            placeholder="Buscar no mapa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-steam-dark/90 backdrop-blur-md border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-steam-highlight/50 transition-all shadow-2xl"
          />
        </div>
      </div>

      {/* Custom Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-[1000]">
        <button 
          onClick={handleRecenter}
          className="w-10 h-10 bg-steam-dark/90 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-steam-highlight hover:border-steam-highlight/50 transition-all shadow-2xl group"
          title="Centralizar Mapa"
        >
          <Target className="w-5 h-5 group-active:scale-90 transition-transform" />
        </button>
        <div className="flex flex-col bg-steam-dark/90 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl">
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

      {isAdmin && (
        <div className="absolute top-4 left-4 z-[1000] bg-steam-dark/90 backdrop-blur-xl p-3 rounded-xl border border-white/10 shadow-2xl">
          <div className="flex items-center gap-2 text-[10px] font-black text-steam-highlight uppercase tracking-[0.2em]">
            <Edit2 className="w-3 h-3" /> Modo Edição
          </div>
          <div className="text-[9px] text-gray-500 mt-1">Clique no mapa para adicionar um ponto</div>
        </div>
      )}

      <style>{`
        .leaflet-container {
          background-color: #0b0e14 !important;
        }
        .custom-popup .leaflet-popup-content-wrapper {
          background: #1b2838 !important;
          color: white !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 12px !important;
          padding: 0 !important;
        }
        .custom-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .custom-popup .leaflet-popup-tip {
          background: #1b2838 !important;
        }
        .leaflet-marker-icon {
          filter: drop-shadow(0 0 5px rgba(102,192,244,0.5));
        }
      `}</style>
    </div>
  );
};

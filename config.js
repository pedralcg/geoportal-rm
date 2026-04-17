// --- CONFIGURACIÓN DE CONEXIÓN ---
export const supabaseUrl = "https://tiaqwlekecxotislizbe.supabase.co";
export const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpYXF3bGVrZWN4b3Rpc2xpemJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjM4NjEsImV4cCI6MjA3NDgzOTg2MX0.lSX1YeIXGoWDWSaDS0Z_ByTvZb7HnPlYNMRQW70nnSo";

// --- CONFIGURACIÓN DE CAPAS DEL MAPA ---
export const layersConfig = {
  arboles_monumentales: {
    name: "Árboles Monumentales",
    color: "#00d31c73",
    type: "point",
    active: false,
    attribution: "Geocatálogo oficial de la Región de Murcia",
  },
  vias_pecuarias: {
    name: "Vías Pecuarias",
    color: "#ffbb00bd",
    type: "line",
    active: false,
    attribution: "Geocatálogo oficial de la Región de Murcia",
  },
  enp: {
    name: "ENP",
    fullName: "Espacios Naturales Protegidos",
    color: "#90e47cff",
    type: "polygon",
    active: false,
    attribution: "Geocatálogo oficial de la Región de Murcia",
  },
  lic_zec: {
    name: "LIC/ZEC",
    fullName: "Lugares de Interés Comunitario / Zonas de Especial Conservación",
    color: "#8b5cf6",
    type: "polygon",
    active: false,
    attribution: "Geocatálogo oficial de la Región de Murcia",
  },
  zepa: {
    name: "ZEPA",
    fullName: "Zonas de Especial Protección para las Aves",
    color: "#789ce0ff",
    type: "polygon",
    active: false,
    attribution: "Geocatálogo oficial de la Región de Murcia",
  },
  municipios_rm: {
    name: "Municipios RM",
    color: "#000000ff",
    type: "polygon",
    active: true,
    attribution: "Geocatálogo oficial de la Región de Murcia",
  },
};

// --- CONFIGURACIÓN DE MAPAS BASE (LEAFLET) ---
export const BASES = {
  osm: {
    name: "OpenStreetMap",
    icon: "fas fa-map",
    layer: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }),
  },
  esri: {
    name: "Satélite",
    icon: "fas fa-satellite",
    layer: L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "© Esri, Maxar, Earthstar Geographics" }
    ),
  },
  carto: {
    name: "Claro",
    icon: "fas fa-map-marked",
    layer: L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      { attribution: "© OpenStreetMap © CartoDB" }
    ),
  },
  streets: {
    name: "Calles",
    icon: "fas fa-road",
    layer: L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      { attribution: "© Esri, HERE, Garmin" }
    ),
  },
};

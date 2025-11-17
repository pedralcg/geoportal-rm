import { BASES } from "./config.js";
import {
  buildBasemapUI,
  buildLayersUI,
  setupEventListeners,
  setStatus,
} from "./ui.js";
import { loadDefaultLayers, safeParseJSON } from "./data.js";
import { preloadMunicipios } from "./search.js";
import { setAnotacionLocationFromMap, mapPickingMode } from "./anotacion.js";

// --- VARIABLES GLOBALES DEL MAPA ---
export let map;
export let layerGroups = {};
export let currentBasemap = "osm";
export let municipiosHighlight = null;

// --- INICIALIZACIÓN ---

export function init() {
  // 1. Inicialización del mapa
  map = L.map("map", {
    center: [38.0, -1.3], // Coordenadas de Murcia, España
    zoom: 9,
    zoomControl: true,
    layers: [BASES[currentBasemap].layer],
  });

  L.control.zoom({ position: "bottomright" }).addTo(map);
  map.invalidateSize();

  map.on("click", (e) => {
    if (mapPickingMode) {
      setAnotacionLocationFromMap(e.latlng);
    }
  });

  // 2. Construcción de UI y carga de datos
  buildBasemapUI();
  buildLayersUI();
  loadDefaultLayers();
  preloadMunicipios();
  setupEventListeners();

  setStatus("success", "Geoportal cargado correctamente");
}

// --- MAPAS BASE LÓGICA ---

export function changeBasemap(id) {
  if (id === currentBasemap) return;

  map.removeLayer(BASES[currentBasemap].layer);

  BASES[id].layer.addTo(map);
  currentBasemap = id;

  setStatus("info", `Cambiado a: ${BASES[id].name}`);
}

// --- LÓGICA DE POPUP ---

export function showPopup(layer, props, title) {
  // CLAVE: Determinar la fuente del color, ya sea de .options.style (Path) o
  // de .options (CircleMarker/Point)
  const color = layer.options.style
    ? layer.options.style.color // Path (Polygon, Polyline)
    : layer.options.color; // CircleMarker (Point)

  let html = `<div style="min-width: 220px; font-size: 0.875rem;">`;
  html += `<h4 style="color: ${
    color || "#333"
  }; margin-bottom: 5px;">${title}</h4><hr style="border-color: #eee; margin-bottom: 5px;">`;

  html += Object.entries(props)
    .map(([k, v]) => {
      if (k.toLowerCase() === "id" && !isNaN(Number(v))) return "";
      return `<div><strong>${k.replace(/_/g, " ")}:</strong> ${v}</div>`;
    })
    .join("");

  html += `</div>`;

  try {
    const center = layer.getBounds
      ? layer.getBounds().getCenter()
      : layer.getLatLng();
    L.popup().setLatLng(center).setContent(html).openOn(map);
  } catch (e) {
    console.error("Error al abrir popup:", e);
  }
}

// --- MUNICIPIOS HIGHLIGHT LÓGICA (Borde del Clip) ---

export function highlightMunicipiosBoundary(geom) {
  // 1. Eliminar el highlight anterior
  removeMunicipiosHighlight();

  // 2. Añadir la nueva capa de borde
  municipiosHighlight = L.geoJSON(geom, {
    style: {
      color: "#ff0000", // Borde rojo para el clip
      weight: 5,
      opacity: 1,
      fillOpacity: 0, // Sin relleno
      dashArray: "8, 4",
    },
  }).addTo(map);

  // Asegurar que el borde se dibuje por encima de todas las otras capas
  if (municipiosHighlight.bringToFront) {
    municipiosHighlight.bringToFront();
  }
}

export function removeMunicipiosHighlight() {
  if (municipiosHighlight) {
    map.removeLayer(municipiosHighlight);
    municipiosHighlight = null;
  }
}

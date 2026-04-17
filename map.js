import { BASES } from "./config.js";
import {
  buildBasemapUI,
  buildLayersUI,
  setupEventListeners,
  setStatus,
} from "./ui.js";
import { loadDefaultLayers, safeParseJSON } from "./data.js";
import { preloadMunicipios } from "./search.js";

// --- VARIABLES GLOBALES DEL MAPA ---
export let map;
export let layerGroups = {};
export let currentBasemap = "osm";
export let municipiosHighlight = null;

// --- INICIALIZACIÓN ---

export async function init() {
  // 1. Inicialización del mapa
  map = L.map("map", {
    center: [38.0, -1.3], // Coordenadas de Murcia, España
    zoom: 9,
    zoomControl: true,
    layers: [BASES[currentBasemap].layer],
  });

  L.control.zoom({ position: "bottomright" }).addTo(map);
  map.invalidateSize();

  // 2. Construcción de UI y carga de datos
  buildBasemapUI();
  buildLayersUI();

  // IMPORTANTE: Esperar a que se carguen los municipios antes de continuar
  await preloadMunicipios();

  loadDefaultLayers();
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

// --- UTILIDADES ---

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// --- LÓGICA DE POPUP MEJORADA ---

export function showPopup(layer, props, title) {
  // Determinar el color de la capa
  const color = layer.options.style
    ? layer.options.style.color
    : layer.options.color;

  // Campos técnicos a filtrar
  const technicalFields = [
    "id",
    "geom",
    "geometry",
    "created_at",
    "updated_at",
    "gid",
    "objectid",
  ];

  // Función para formatear nombres de campos
  const formatFieldName = (key) => {
    return escapeHtml(
      key
        .replace(/_/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
    );
  };

  // Función para formatear valores
  const formatValue = (value) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "number") {
      return escapeHtml(value.toLocaleString("es-ES", { maximumFractionDigits: 2 }));
    }
    if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        const date = new Date(value);
        return escapeHtml(date.toLocaleDateString("es-ES"));
      } catch (e) {
        return escapeHtml(value);
      }
    }
    return escapeHtml(String(value));
  };

  const popupColor = color || "var(--forest-green)";

  let html = `<div class="feature-popup">`;
  html += `<h4 class="feature-popup-title" style="color:${popupColor};border-bottom-color:${popupColor};">${escapeHtml(title)}</h4>`;

  // Filtrar y formatear propiedades
  const filteredProps = Object.entries(props)
    .filter(([key]) => !technicalFields.includes(key.toLowerCase()))
    .filter(
      ([key, value]) => value !== null && value !== undefined && value !== ""
    );

  if (filteredProps.length === 0) {
    html += `<p class="feature-popup-empty">No hay información adicional disponible</p>`;
  } else {
    html += `<div class="feature-popup-grid">`;
    filteredProps.forEach(([key, value]) => {
      html += `
        <div class="feature-popup-row">
          <strong class="feature-popup-key">${formatFieldName(key)}:</strong>
          <span class="feature-popup-value">${formatValue(value)}</span>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `</div>`;

  try {
    const center = layer.getBounds
      ? layer.getBounds().getCenter()
      : layer.getLatLng();
    L.popup({ maxWidth: 350 }).setLatLng(center).setContent(html).openOn(map);
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

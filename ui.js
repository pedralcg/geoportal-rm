import { map, currentBasemap, changeBasemap, layerGroups } from "./map.js";
import { BASES, layersConfig } from "./config.js";
import { toggleLayer } from "./data.js";
import { onSearch, setupSearchEvents } from "./search.js";

// --- SETUP DE EVENTOS ---

export function setupEventListeners() {
  // Search
  document.getElementById("search-input").addEventListener("input", onSearch);
  setupSearchEvents();

  // Basemap selector
  document
    .getElementById("basemap-select")
    .addEventListener("change", (e) => changeBasemap(e.target.value));
}

// --- MAPAS BASE (Selector Desplegable) ---

export function buildBasemapUI() {
  const select = document.getElementById("basemap-select");
  select.innerHTML = "";

  Object.entries(BASES).forEach(([id, bm]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = bm.name;
    if (id === currentBasemap) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

// --- CAPAS (Diseño Elegante) ---

function getLayerIcon(type) {
  switch (type) {
    case "point":
      return '<i class="fas fa-circle"></i>';
    case "line":
      return '<i class="fas fa-minus"></i>';
    case "polygon":
      return '<i class="fas fa-square"></i>';
    default:
      return '<i class="fas fa-question"></i>';
  }
}

// --- CONSTRUCCIÓN DE LA UI DE CAPAS (ÚNICA FUNCIÓN CORRECTA) ---
export function buildLayersUI() {
  const container = document.getElementById("layers");
  container.innerHTML = "";

  Object.entries(layersConfig).forEach(([key, cfg]) => {
    const layerName = cfg.name;
    const iconHtml = getLayerIcon(cfg.type);

    const item = document.createElement("div");
    item.className = "layer-item";

    item.innerHTML = `
        <div class="layer-left">
            <span class="layer-badge" style="color: ${
              cfg.color
            };">${iconHtml}</span>
            <span class="layer-label">${layerName}</span>
        </div>
        <div class="layer-right">
            <label class="layer-switch">
                <input type="checkbox" id="toggle-${key}" ${
      cfg.active ? "checked" : ""
    }>
                <span class="layer-slider"></span>
            </label>
        </div>
    `;

    const checkbox = item.querySelector("input");
    checkbox.addEventListener("change", (e) =>
      toggleLayer(key, e.target.checked)
    );
    container.appendChild(item);
  });
}

// --- PANEL DE ESTADO ---

export function setStatus(type, message) {
  const statusPanel = document.getElementById("status");
  statusPanel.className = `status-panel show ${type}`;

  const icons = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-circle",
    warning: "fas fa-exclamation-triangle",
    info: "fas fa-info-circle",
  };

  statusPanel.innerHTML = `<i class="${icons[type]}"></i> ${message}`;

  setTimeout(() => {
    statusPanel.classList.remove("show");
  }, 5000);
}

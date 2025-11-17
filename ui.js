import { map, currentBasemap, changeBasemap, layerGroups } from "./map.js";
import { BASES, layersConfig } from "./config.js";
// Se importa getAnotacionIcon y ANOTACION_TYPES para construir la leyenda
import { toggleLayer, getAnotacionIcon, ANOTACION_TYPES } from "./data.js";
import { onSearch } from "./search.js";
// Se asume que usas './anotacion.js' para la lógica de reportes
import {
  startMapPicking,
  setManualCoords,
  sendAnotacion,
} from "./anotacion.js";

// --- LOGICA DE MODALES Y BARRAS LATERALES ---

export function toggleContactModal() {
  const overlay = document.getElementById("contact-modal-overlay");
  const rightSidebar = document.getElementById("right-sidebar");

  overlay.classList.toggle("active");

  const isModalActive = overlay.classList.contains("active");

  if (isModalActive && rightSidebar.classList.contains("expanded")) {
    toggleRightSidebar();
  }
}

export function toggleRightSidebar() {
  const sidebar = document.getElementById("right-sidebar");
  const mapContainer = document.querySelector(".map-container");

  const isExpanded = sidebar.classList.toggle("expanded");

  const overlay = document.getElementById("contact-modal-overlay");
  if (overlay.classList.contains("active")) {
    toggleContactModal();
  }

  // Comprueba si no es un dispositivo móvil antes de ajustar el margen
  if (window.innerWidth > 1024) {
    mapContainer.style.marginRight = isExpanded ? "var(--sidebar-width)" : "0";
  }

  setTimeout(() => map.invalidateSize(), 300);
}

// --- SETUP DE EVENTOS ---

export function setupEventListeners() {
  document.getElementById("search-input").addEventListener("input", onSearch);
  document
    .getElementById("pick-on-map")
    .addEventListener("click", startMapPicking);
  document
    .getElementById("set-manual-coords")
    .addEventListener("click", setManualCoords);
  document
    .getElementById("anotacion-send")
    .addEventListener("click", sendAnotacion);

  document
    .getElementById("toggle-anotacion-sidebar")
    .addEventListener("click", toggleRightSidebar);
  document
    .getElementById("close-anotacion-sidebar")
    .addEventListener("click", toggleRightSidebar);

  document
    .getElementById("basemap-select")
    .addEventListener("change", (e) => changeBasemap(e.target.value));

  document.querySelectorAll("#toggle-contact").forEach((button) => {
    button.addEventListener("click", toggleContactModal);
  });

  document
    .getElementById("contact-modal-overlay")
    .addEventListener("click", (e) => {
      if (e.target.id === "contact-modal-overlay") {
        toggleContactModal();
      }
    });
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
    // Nombre de la capa (siempre 'Anotaciones' si la clave es 'anotaciones')
    const layerName = key === "anotaciones" ? "Anotaciones" : cfg.name;
    const isAnotaciones = key === "anotaciones";

    // Icono base para la capa. Si es Anotaciones, usamos un marcador genérico.
    const iconHtml = isAnotaciones
      ? '<i class="fas fa-map-pin"></i>'
      : getLayerIcon(cfg.type);

    // 1. DIBUJAR CAPA PRINCIPAL (Toggle)
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
            ${
              isAnotaciones
                ? // Botón de colapso/expansión para la leyenda de anotaciones
                  `<button class="collapse-btn" data-target="legend-${key}" title="Mostrar/Ocultar leyenda detallada">
                    <i class="fas fa-chevron-up"></i>
                </button>`
                : ""
            }
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

    // 2. AÑADIR LEYENDA DETALLADA PARA LA CAPA DE ANOTACIONES
    if (isAnotaciones) {
      const legendDetailsContainer = document.createElement("div");
      // Se inicia colapsada (clase 'collapsed')
      legendDetailsContainer.className = "legend-container collapsed";
      legendDetailsContainer.id = `legend-${key}`; // ID para el control JS

      const legendDetails = document.createElement("div");
      legendDetails.className = "layer-legend-details";

      // Crear evento para el botón de colapso
      const collapseButton = item.querySelector(".collapse-btn");
      collapseButton.addEventListener("click", (e) => {
        e.preventDefault();
        // Alternar la clase 'collapsed'
        legendDetailsContainer.classList.toggle("collapsed");

        // Cambiar icono de la flecha
        const icon = collapseButton.querySelector("i");
        if (legendDetailsContainer.classList.contains("collapsed")) {
          icon.className = "fas fa-chevron-up";
        } else {
          icon.className = "fas fa-chevron-down";
        }
      });

      // Iterar sobre todos los tipos de anotación definidos en data.js
      ANOTACION_TYPES.forEach((type) => {
        const iconData = getAnotacionIcon(type.key);
        const legendItem = document.createElement("div");
        legendItem.className = "legend-item";

        // Usamos el mismo HTML que en data.js para el ícono
        legendItem.innerHTML = `
                <span class="legend-icon">
                    <i class='${iconData.icon}' style='color: ${iconData.color}; font-size: 16px;'></i>
                </span>
                <span>${type.name}</span>
            `;
        legendDetails.appendChild(legendItem);
      });

      legendDetailsContainer.appendChild(legendDetails);
      container.appendChild(legendDetailsContainer);
    }
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

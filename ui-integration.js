import { map } from "./map.js";
import { setStatus } from "./ui.js";
import {
  setupAdvancedContextMenu,
  injectAdvancedStyles,
} from "./advanced-features.js";

// Variable global para almacenar el municipio actual
let currentMunicipality = null;

// ==============================================================
// INICIALIZACIÓN DE FUNCIONES AVANZADAS (MVP - SIMPLIFICADO)
// ==============================================================

export function setupAdvancedUI() {
  // Inyectar estilos personalizados
  injectAdvancedStyles();

  // Configurar menú contextual
  setupAdvancedContextMenu();

  // Configurar event listeners
  setupToolButtons();
  setupModalButtons();
  setupMapControls();

  console.log("✅ UI MVP inicializada correctamente");
}

// ==============================================================
// BOTONES DE HERRAMIENTAS (MVP - SIMPLIFICADO)
// ==============================================================

function setupToolButtons() {
  // Funcionalidades avanzadas removidas en MVP
  // Los botones de herramientas avanzadas han sido eliminados del HTML
  console.log("MVP: Funcionalidades avanzadas deshabilitadas");
}

// ==============================================================
// CONTROLES DEL MAPA
// ==============================================================

function setupMapControls() {
  // Botón Limpiar Filtros
  const btnClearFilters = document.getElementById("btn-clear-filters");
  if (btnClearFilters) {
    btnClearFilters.addEventListener("click", () => {
      currentMunicipality = null;
      setStatus("success", "Filtros espaciales eliminados");
      document.getElementById("search-input").value = "";
    });
  }

  // Botón Mi Ubicación
  const btnMyLocation = document.getElementById("btn-my-location");
  if (btnMyLocation) {
    btnMyLocation.addEventListener("click", () => {
      if (!navigator.geolocation) {
        setStatus("error", "La geolocalización no está disponible");
        return;
      }

      setStatus("warning", "Obteniendo tu ubicación...");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], 15);

          // Agregar marcador temporal
          const marker = L.marker([latitude, longitude], {
            icon: L.divIcon({
              className: "my-location-marker",
              html: '<i class="fas fa-street-view" style="color: #3b82f6; font-size: 32px;"></i>',
              iconSize: [32, 32],
              iconAnchor: [16, 32],
            }),
          }).addTo(map);

          setStatus("success", "Ubicación obtenida correctamente");

          // Remover marcador después de 5 segundos
          setTimeout(() => {
            map.removeLayer(marker);
          }, 5000);
        },
        (error) => {
          console.error("Error de geolocalización:", error);
          setStatus("error", "No se pudo obtener tu ubicación");
        }
      );
    });
  }

  // Botón Ajustar Vista
  const btnFitBounds = document.getElementById("btn-fit-bounds");
  if (btnFitBounds) {
    btnFitBounds.addEventListener("click", () => {
      // Coordenadas aproximadas de la Región de Murcia
      const murciaCenter = [38.0, -1.3];
      map.setView(murciaCenter, 9);
      setStatus("info", "Vista ajustada a la Región de Murcia");
    });
  }
}

// ==============================================================
// GESTIÓN DE MODALES (MVP - SOLO CONTACTO)
// ==============================================================

function setupModalButtons() {
  // Modal de Contacto
  const toggleContactBtns = document.querySelectorAll("#toggle-contact");
  const closeContactBtn = document.getElementById("close-contact-modal");

  toggleContactBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      toggleModal("contact-modal-overlay");
    });
  });

  if (closeContactBtn) {
    closeContactBtn.addEventListener("click", () => {
      closeModal("contact-modal-overlay");
    });
  }

  // Modales avanzados removidos en MVP (búsqueda avanzada, exportación)

  // Cerrar modales al hacer click en el overlay
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
  }
}

function toggleModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.toggle("active");
  }
}

// ==============================================================
// FUNCIÓN PARA ACTUALIZAR MUNICIPIO ACTUAL
// ==============================================================

export function setCurrentMunicipality(municipalityName) {
  currentMunicipality = municipalityName;
  console.log("Municipio actual:", currentMunicipality);
}

// ==============================================================
// HELPER: CREAR TOAST NOTIFICATIONS
// ==============================================================

export function showToast(message, type = "info", duration = 3000) {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fas fa-${getToastIcon(type)}"></i>
    <span>${message}</span>
  `;

  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add("show"), 10);

  // Remove after duration
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function getToastIcon(type) {
  const icons = {
    success: "check-circle",
    error: "exclamation-circle",
    warning: "exclamation-triangle",
    info: "info-circle",
  };
  return icons[type] || "info-circle";
}

// ==============================================================
// EXPORTAR FUNCIONES PÚBLICAS
// ==============================================================

export { openModal, closeModal, toggleModal };

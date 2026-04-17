import { map } from "./map.js";
import { setStatus } from "./ui.js";
import { setupAdvancedContextMenu } from "./features/context-menu.js";

// Variable global para almacenar el municipio actual
let currentMunicipality = null;

// ==============================================================
// INICIALIZACIÓN DE FUNCIONES AVANZADAS
// ==============================================================

export function setupAdvancedUI() {
  setupAdvancedContextMenu();
  setupToolButtons();
  setupModalButtons();
  setupMapControls();
}

// ==============================================================
// BOTONES DE HERRAMIENTAS
// ==============================================================

function setupToolButtons() {
  // Las herramientas avanzadas se activan a través del menú contextual
  // y la interacción con el mapa (clic derecho en elementos).
}

// ==============================================================
// CONTROLES DEL MAPA
// ==============================================================

function setupMapControls() {
  const btnClearFilters = document.getElementById("btn-clear-filters");
  if (btnClearFilters) {
    btnClearFilters.addEventListener("click", async () => {
      const { selectMunicipio } = await import("./search.js");
      await selectMunicipio(null);
      setStatus("success", "Filtros espaciales eliminados");
    });
  }

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

          const marker = L.marker([latitude, longitude], {
            icon: L.divIcon({
              className: "my-location-marker",
              html: '<i class="fas fa-street-view" style="color: #3b82f6; font-size: 32px;"></i>',
              iconSize: [32, 32],
              iconAnchor: [16, 32],
            }),
          }).addTo(map);

          setStatus("success", "Ubicación obtenida correctamente");
          setTimeout(() => map.removeLayer(marker), 5000);
        },
        (error) => {
          console.error("Error de geolocalización:", error);
          setStatus("error", "No se pudo obtener tu ubicación");
        }
      );
    });
  }

  const btnFitBounds = document.getElementById("btn-fit-bounds");
  if (btnFitBounds) {
    btnFitBounds.addEventListener("click", () => {
      map.setView([38.0, -1.3], 9);
      setStatus("info", "Vista ajustada a la Región de Murcia");
    });
  }
}

// ==============================================================
// GESTIÓN DE MODALES
// ==============================================================

function setupModalButtons() {
  const toggleContactBtns = document.querySelectorAll("#toggle-contact");
  const closeContactBtn = document.getElementById("close-contact-modal");

  toggleContactBtns.forEach((btn) => {
    btn.addEventListener("click", () => toggleModal("contact-modal-overlay"));
  });

  if (closeContactBtn) {
    closeContactBtn.addEventListener("click", () =>
      closeModal("contact-modal-overlay")
    );
  }

  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

function openModal(modalId) {
  document.getElementById(modalId)?.classList.add("active");
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.remove("active");
}

function toggleModal(modalId) {
  document.getElementById(modalId)?.classList.toggle("active");
}

// ==============================================================
// MUNICIPIO ACTUAL
// ==============================================================

export function setCurrentMunicipality(municipalityName) {
  currentMunicipality = municipalityName;
}

// ==============================================================
// TOAST NOTIFICATIONS
// ==============================================================

export function showToast(message, type = "info", duration = 3000) {
  const icons = {
    success: "check-circle",
    error: "exclamation-circle",
    warning: "exclamation-triangle",
    info: "info-circle",
  };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fas fa-${icons[type] || "info-circle"}"></i>
    <span>${message}</span>
  `;

  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export { openModal, closeModal, toggleModal };

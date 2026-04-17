import { map } from "../map.js";
import { getNearbyFeatures } from "./proximity.js";

// ================================================================
// MENÚ CONTEXTUAL DEL MAPA (clic derecho)
// ================================================================

export function setupAdvancedContextMenu() {
  map.on("contextmenu", async (e) => {
    const { lat, lng } = e.latlng;

    L.popup({ closeButton: true, maxWidth: 300 })
      .setLatLng(e.latlng)
      .setContent(
        `<div class="context-menu">
          <h4>Acciones</h4>
          <button class="context-btn" data-action="nearby">
            <i class="fas fa-search-location"></i> Buscar Cercanos (10km)
          </button>
          <hr>
          <div class="coords-info">
            <small>Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</small>
          </div>
        </div>`
      )
      .openOn(map);

    setTimeout(() => {
      document.querySelectorAll(".context-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const action = btn.dataset.action;
          map.closePopup();
          if (action === "nearby") {
            await getNearbyFeatures(lat, lng, 10000);
          }
        });
      });
    }, 100);
  });
}

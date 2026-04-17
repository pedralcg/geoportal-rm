import { supabaseUrl, supabaseKey } from "../config.js";
import { map } from "../map.js";
import { setStatus } from "../ui.js";

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ================================================================
// BÚSQUEDA DE ELEMENTOS CERCANOS
// ================================================================

export async function getNearbyFeatures(lat, lng, radiusMeters = 1000) {
  try {
    setStatus(
      "warning",
      `Buscando elementos cercanos (radio: ${radiusMeters}m)...`
    );

    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_nearby_features`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          p_lat: lat,
          p_lng: lng,
          p_radius_meters: radiusMeters,
          p_layer_name: null,
          p_limit: 20,
        }),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const nearby = await response.json();
    displayNearbyFeatures(nearby, lat, lng, radiusMeters);
    return nearby;
  } catch (error) {
    console.error("Error al buscar elementos cercanos:", error);
    setStatus("error", "Error al buscar elementos cercanos");
    return [];
  }
}

function displayNearbyFeatures(features, centerLat, centerLng, radius) {
  const circle = L.circle([centerLat, centerLng], {
    radius,
    color: "#3b82f6",
    fillColor: "#3b82f6",
    fillOpacity: 0.1,
    weight: 2,
    dashArray: "5, 5",
  }).addTo(map);

  const layerIcons = {
    arboles_monumentales: "🌳",
    vias_pecuarias: "🐄",
    enp: "🏞️",
    lic_zec: "🦅",
    zepa: "🦜",
  };
  const layerNames = {
    arboles_monumentales: "Árbol Monumental",
    vias_pecuarias: "Vía Pecuaria",
    enp: "ENP",
    lic_zec: "LIC/ZEC",
    zepa: "ZEPA",
  };

  const formatDistance = (m) =>
    m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(2)}km`;

  const radiusKm = (radius / 1000).toFixed(1);

  const html = `
    <div class="nearby-results">
      <h3>📍 Elementos Cercanos</h3>
      <p class="nearby-info">Radio: ${radiusKm}km | Encontrados: ${features.length}</p>
      <div class="nearby-list">
        ${features
          .map((f) => {
            const coords = f.geom?.coordinates || [0, 0];
            return `
            <div class="nearby-item" data-lat="${coords[1]}" data-lng="${coords[0]}">
              <div class="nearby-header">
                <span class="nearby-icon">${layerIcons[f.layer] || "📍"}</span>
                <strong>${escapeHtml(f.feature_name)}</strong>
              </div>
              <div class="nearby-meta">
                <span class="nearby-layer">${layerNames[f.layer] || escapeHtml(f.layer)}</span>
                <span class="nearby-distance">${formatDistance(f.distance_meters)}</span>
              </div>
            </div>`;
          })
          .join("")}
      </div>
    </div>
  `;

  L.popup({ maxWidth: 450 })
    .setLatLng([centerLat, centerLng])
    .setContent(html)
    .openOn(map);

  setTimeout(() => {
    document.querySelectorAll(".nearby-item").forEach((item) => {
      item.addEventListener("click", () => {
        map.flyTo(
          [parseFloat(item.dataset.lat), parseFloat(item.dataset.lng)],
          16
        );
      });
    });
  }, 100);

  setStatus("success", `${features.length} elementos encontrados`);
  setTimeout(() => map.removeLayer(circle), 10000);
}

// ================================================================
// ZONAS DE PROTECCIÓN
// ================================================================

export async function getProtectionZones(lat, lng) {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_protection_zones`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ p_lat: lat, p_lng: lng }),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const zones = await response.json();
    displayProtectionZones(zones, lat, lng);
    return zones;
  } catch (error) {
    console.error("Error al obtener zonas de protección:", error);
    setStatus("error", "Error al obtener información de zonas protegidas");
    return null;
  }
}

function displayProtectionZones(zones, lat, lng) {
  let html = `
    <div class="protection-zones">
      <h3>🛡️ Zonas de Protección</h3>
      <p><strong>Municipio:</strong> ${escapeHtml(zones.municipality || "Desconocido")}</p>
  `;

  if (zones.enp?.length) {
    html += `
      <div class="zone-section">
        <h4>ENP (Espacios Naturales Protegidos)</h4>
        <ul>${zones.enp.map((z) => `<li>${escapeHtml(z.nombre)} - ${escapeHtml(z.tipo)}</li>`).join("")}</ul>
      </div>`;
  }
  if (zones.lic_zec?.length) {
    html += `
      <div class="zone-section">
        <h4>LIC/ZEC</h4>
        <ul>${zones.lic_zec.map((z) => `<li>${escapeHtml(z.nombre)} (${escapeHtml(z.codigo)})</li>`).join("")}</ul>
      </div>`;
  }
  if (zones.zepa?.length) {
    html += `
      <div class="zone-section">
        <h4>ZEPA</h4>
        <ul>${zones.zepa.map((z) => `<li>${escapeHtml(z.nombre)} (${escapeHtml(z.codigo)})</li>`).join("")}</ul>
      </div>`;
  }

  if (!zones.enp?.length && !zones.lic_zec?.length && !zones.zepa?.length) {
    html += `<p class="no-zones">No se encuentra en zonas protegidas</p>`;
  }

  html += `</div>`;

  L.popup({ maxWidth: 400 })
    .setLatLng([lat, lng])
    .setContent(html)
    .openOn(map);

  setStatus("success", "Información de zonas protegidas cargada");
}

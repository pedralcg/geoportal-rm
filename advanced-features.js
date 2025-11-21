import { supabaseUrl, supabaseKey } from "./config.js";
import { map, showPopup } from "./map.js";
import { setStatus } from "./ui.js";

// ==============================================================
// BÚSQUEDA AVANZADA GLOBAL
// ==============================================================

export async function searchAllLayers(searchTerm, filters = {}) {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/search_all_layers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          p_search_term: searchTerm || null,
          p_layer_type: filters.layerType || null,
          p_municipality: filters.municipality || null,
          p_bbox: filters.bbox || null,
          p_limit: filters.limit || 50,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(`HTTP ${response.status}`);
    }

    const results = await response.json();
    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.error("Error en búsqueda avanzada:", error);
    setStatus("error", "Error al realizar la búsqueda");
    return [];
  }
}

// ==============================================================
// ESTADÍSTICAS POR MUNICIPIO
// ==============================================================

export async function getMunicipalityStats(municipalityName) {
  try {
    setStatus("warning", `Cargando estadísticas de ${municipalityName}...`);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_municipality_statistics`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          p_municipality_name: municipalityName,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(`HTTP ${response.status}`);
    }

    const stats = await response.json();

    if (stats.error) {
      setStatus("error", stats.error);
      return null;
    }

    displayMunicipalityStats(stats);
    return stats;
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    setStatus("error", "Error al cargar estadísticas del municipio");
    return null;
  }
}

function displayMunicipalityStats(stats) {
  const html = `
    <div class="stats-dashboard">
      <div class="stats-header">
        <h3>📊 Estadísticas: ${stats.municipality}</h3>
        <div class="stats-area">Superficie: ${stats.area_km2} km²</div>
      </div>
      
      <div class="stats-grid">
        <!-- Árboles Monumentales -->
        <div class="stat-card clickable" data-category="arboles">
          <div class="stat-icon">🌳</div>
          <div class="stat-content">
            <div class="stat-value">${stats.arboles_monumentales.count}</div>
            <div class="stat-label">Árboles Monumentales</div>
            <div class="stat-sublabel">${stats.arboles_monumentales.densidad_por_km2} por km²</div>
          </div>
        </div>
        
        <!-- Vías Pecuarias -->
        <div class="stat-card clickable" data-category="vias">
          <div class="stat-icon">🐄</div>
          <div class="stat-content">
            <div class="stat-value">${stats.vias_pecuarias.count}</div>
            <div class="stat-label">Vías Pecuarias</div>
            <div class="stat-sublabel">${stats.vias_pecuarias.longitud_km} km totales</div>
          </div>
        </div>
        
        <!-- ENP -->
        <div class="stat-card clickable" data-category="enp">
          <div class="stat-icon">🏞️</div>
          <div class="stat-content">
            <div class="stat-value">${stats.enp.superficie_km2} km²</div>
            <div class="stat-label">ENP</div>
            <div class="stat-sublabel">${stats.enp.count} espacios (${stats.enp.porcentaje_protegido}%)</div>
          </div>
        </div>
        
        <!-- LIC/ZEC -->
        <div class="stat-card clickable" data-category="lic_zec">
          <div class="stat-icon">🦅</div>
          <div class="stat-content">
            <div class="stat-value">${stats.lic_zec.superficie_km2} km²</div>
            <div class="stat-label">LIC/ZEC</div>
            <div class="stat-sublabel">${stats.lic_zec.count} zonas (${stats.lic_zec.porcentaje_protegido}%)</div>
          </div>
        </div>
        
        <!-- ZEPA -->
        <div class="stat-card clickable" data-category="zepa">
          <div class="stat-icon">🦜</div>
          <div class="stat-content">
            <div class="stat-value">${stats.zepa.superficie_km2} km²</div>
            <div class="stat-label">ZEPA</div>
            <div class="stat-sublabel">${stats.zepa.count} zonas (${stats.zepa.porcentaje_protegido}%)</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Mostrar en popup
  const popup = L.popup({ maxWidth: 600, className: "stats-popup" })
    .setLatLng(map.getCenter())
    .setContent(html)
    .openOn(map);

  // Añadir event listeners después de que el popup esté renderizado
  setTimeout(() => {
    document.querySelectorAll(".stat-card.clickable").forEach((card) => {
      card.addEventListener("click", () => {
        const category = card.dataset.category;
        showStatDetails(stats, category);
      });
    });
  }, 100);

  setStatus("success", "Estadísticas cargadas correctamente");
}

function showStatDetails(stats, category) {
  const categoryData = {
    arboles: {
      title: "🌳 Árboles Monumentales",
      items: stats.arboles_monumentales.items,
      formatItem: (item) => `<strong>${item.nombre}</strong>`,
    },
    vias: {
      title: "🐄 Vías Pecuarias",
      items: stats.vias_pecuarias.items,
      formatItem: (item) =>
        `<strong>${item.nombre}</strong> - ${item.longitud_km} km`,
    },
    enp: {
      title: "🏞️ Espacios Naturales Protegidos",
      items: stats.enp.items,
      formatItem: (item) =>
        `<strong>${item.nombre}</strong> - ${item.superficie_km2} km²`,
    },
    lic_zec: {
      title: "🦅 LIC/ZEC",
      items: stats.lic_zec.items,
      formatItem: (item) =>
        `<strong>${item.nombre}</strong> - ${item.superficie_km2} km²`,
    },
    zepa: {
      title: "🦜 ZEPA",
      items: stats.zepa.items,
      formatItem: (item) =>
        `<strong>${item.nombre}</strong> - ${item.superficie_km2} km²`,
    },
  };

  const data = categoryData[category];
  if (!data || !data.items || data.items.length === 0) {
    setStatus("info", "No hay elementos en esta categoría");
    return;
  }

  const html = `
    <div class="stat-details">
      <h3>${data.title}</h3>
      <div class="stat-details-count">Total: ${
        data.items.length
      } elementos</div>
      <div class="stat-details-list">
        ${data.items
          .map(
            (item) => `
          <div class="stat-detail-item">
            ${data.formatItem(item)}
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;

  // Mostrar en nuevo popup
  const popup = L.popup({ maxWidth: 500, className: "stat-details-popup" })
    .setLatLng(map.getCenter())
    .setContent(html)
    .openOn(map);
}

// ==============================================================
// ANÁLISIS DE PROXIMIDAD
// ==============================================================

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(`HTTP ${response.status}`);
    }

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
  // Dibujar círculo de radio
  const circle = L.circle([centerLat, centerLng], {
    radius: radius,
    color: "#3b82f6",
    fillColor: "#3b82f6",
    fillOpacity: 0.1,
    weight: 2,
    dashArray: "5, 5",
  }).addTo(map);

  // Función helper para obtener icono según el tipo de capa
  const getLayerIcon = (layer) => {
    const icons = {
      arboles_monumentales: "🌳",
      vias_pecuarias: "🐄",
      enp: "🏞️",
      lic_zec: "🦅",
      zepa: "🦜",
    };
    return icons[layer] || "📍";
  };

  // Función helper para obtener nombre legible de la capa
  const getLayerName = (layer) => {
    const names = {
      arboles_monumentales: "Árbol Monumental",
      vias_pecuarias: "Vía Pecuaria",
      enp: "ENP",
      lic_zec: "LIC/ZEC",
      zepa: "ZEPA",
    };
    return names[layer] || layer;
  };

  // Función helper para formatear distancia en km
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  // Crear HTML para resultados
  const radiusKm = (radius / 1000).toFixed(1);
  let html = `
    <div class="nearby-results">
      <h3>📍 Elementos Cercanos</h3>
      <p class="nearby-info">Radio: ${radiusKm}km | Encontrados: ${features.length}</p>
      <div class="nearby-list">
  `;

  features.forEach((feature) => {
    const coords = feature.geom?.coordinates || [0, 0];
    const icon = getLayerIcon(feature.layer);
    const layerName = getLayerName(feature.layer);
    const distance = formatDistance(feature.distance_meters);

    html += `
      <div class="nearby-item" data-lat="${coords[1]}" data-lng="${coords[0]}">
        <div class="nearby-header">
          <span class="nearby-icon">${icon}</span>
          <strong>${feature.feature_name}</strong>
        </div>
        <div class="nearby-meta">
          <span class="nearby-layer">${layerName}</span>
          <span class="nearby-distance">${distance}</span>
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  const popup = L.popup({ maxWidth: 450 })
    .setLatLng([centerLat, centerLng])
    .setContent(html)
    .openOn(map);

  // Agregar eventos para hacer zoom a cada elemento
  setTimeout(() => {
    document.querySelectorAll(".nearby-item").forEach((item) => {
      item.addEventListener("click", () => {
        const lat = parseFloat(item.dataset.lat);
        const lng = parseFloat(item.dataset.lng);
        map.flyTo([lat, lng], 16);
      });
    });
  }, 100);

  setStatus("success", `${features.length} elementos encontrados`);

  // Limpiar círculo después de 10 segundos
  setTimeout(() => {
    map.removeLayer(circle);
  }, 10000);
}

// ==============================================================
// ZONAS DE PROTECCIÓN
// ==============================================================

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
        body: JSON.stringify({
          p_lat: lat,
          p_lng: lng,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(`HTTP ${response.status}`);
    }

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
      <p><strong>Municipio:</strong> ${zones.municipality || "Desconocido"}</p>
  `;

  if (zones.enp && zones.enp.length > 0) {
    html += `
      <div class="zone-section">
        <h4>ENP (Espacios Naturales Protegidos)</h4>
        <ul>
          ${zones.enp.map((z) => `<li>${z.nombre} - ${z.tipo}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  if (zones.lic_zec && zones.lic_zec.length > 0) {
    html += `
      <div class="zone-section">
        <h4>LIC/ZEC</h4>
        <ul>
          ${zones.lic_zec
            .map((z) => `<li>${z.nombre} (${z.codigo})</li>`)
            .join("")}
        </ul>
      </div>
    `;
  }

  if (zones.zepa && zones.zepa.length > 0) {
    html += `
      <div class="zone-section">
        <h4>ZEPA</h4>
        <ul>
          ${zones.zepa
            .map((z) => `<li>${z.nombre} (${z.codigo})</li>`)
            .join("")}
        </ul>
      </div>
    `;
  }

  if (!zones.enp && !zones.lic_zec && !zones.zepa) {
    html += `<p class="no-zones">No se encuentra en zonas protegidas</p>`;
  }

  html += `</div>`;

  const popup = L.popup({ maxWidth: 400 })
    .setLatLng([lat, lng])
    .setContent(html)
    .openOn(map);

  setStatus("success", "Información de zonas protegidas cargada");
}

// ==============================================================
// ACTIVIDAD RECIENTE
// ==============================================================

export async function getRecentActivity(days = 7) {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_recent_activity`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          p_days: days,
          p_limit: 10,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // La función ahora devuelve un JSONB directamente, no una tabla
    // Si es un array, úsalo; si no, intenta extraerlo
    const activities = Array.isArray(data) ? data : data.data || [];

    if (activities.length === 0) {
      setStatus(
        "info",
        "No hay actividad reciente en los últimos " + days + " días"
      );
      return [];
    }

    displayRecentActivity(activities);
    return activities;
  } catch (error) {
    console.error("Error al obtener actividad reciente:", error);
    setStatus("error", "Error al cargar actividad reciente");
    return [];
  }
}

function displayRecentActivity(activities) {
  if (activities.length === 0) {
    setStatus("info", "No hay actividad reciente");
    return;
  }

  let html = `
    <div class="recent-activity">
      <h3>🕐 Actividad Reciente</h3>
      <div class="activity-list">
  `;

  activities.forEach((act) => {
    const date = new Date(act.activity_timestamp);
    const dateStr = date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    html += `
      <div class="activity-item">
        <div class="activity-header">
          <strong>${act.feature_name}</strong>
          <span class="activity-date">${dateStr}</span>
        </div>
        <div class="activity-meta">
          <span class="activity-type">${
            act.details?.tipo || act.activity_type
          }</span>
        </div>
        ${
          act.details?.comentarios
            ? `<p class="activity-comment">${act.details.comentarios.substring(
                0,
                100
              )}${act.details.comentarios.length > 100 ? "..." : ""}</p>`
            : ""
        }
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  const popup = L.popup({ maxWidth: 400 })
    .setLatLng(map.getCenter())
    .setContent(html)
    .openOn(map);

  setStatus("success", `${activities.length} actividades recientes cargadas`);
}

// ==============================================================
// GEOCODIFICACIÓN INVERSA
// ==============================================================

export async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/reverse_geocode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        p_lat: lat,
        p_lng: lng,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error en geocodificación inversa:", error);
    return null;
  }
}

// ==============================================================
// EXPORTAR CAPA A GEOJSON
// ==============================================================

export async function exportLayerGeoJSON(layerName, municipality = null) {
  try {
    setStatus("warning", `Exportando ${layerName}...`);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/export_layer_geojson`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          p_layer_name: layerName,
          p_municipality: municipality || null,
          p_bbox: null,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(`HTTP ${response.status}`);
    }

    const geojson = await response.json();

    if (geojson.error) {
      setStatus("error", geojson.error);
      return null;
    }

    // Descargar archivo
    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${layerName}_${municipality || "completo"}_${
      new Date().toISOString().split("T")[0]
    }.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatus("success", "GeoJSON exportado correctamente");
    return geojson;
  } catch (error) {
    console.error("Error al exportar GeoJSON:", error);
    setStatus("error", "Error al exportar datos");
    return null;
  }
}

// ==============================================================
// VALIDAR GEOMETRÍA
// ==============================================================

export async function validateGeometry(geojson) {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/validate_geometry`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          p_geojson: geojson,
        }),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const validation = await response.json();
    return validation;
  } catch (error) {
    console.error("Error al validar geometría:", error);
    return { valid: false, error: error.message };
  }
}

// ==============================================================
// MENÚ CONTEXTUAL DEL MAPA
// ==============================================================

export function setupAdvancedContextMenu() {
  map.on("contextmenu", async (e) => {
    const { lat, lng } = e.latlng;

    // Crear menú contextual
    const menu = L.popup({ closeButton: true, maxWidth: 300 })
      .setLatLng(e.latlng)
      .setContent(
        `
      <div class="context-menu">
        <h4>Acciones Avanzadas</h4>
        <button class="context-btn" data-action="nearby">
          <i class="fas fa-search-location"></i> Buscar Cercanos (10km)
        </button>
        <hr>
        <div class="coords-info">
          <small>Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</small>
        </div>
      </div>
    `
      )
      .openOn(map);

    // Agregar event listeners después de que el popup esté renderizado
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

function displayReverseGeocodeInfo(info, lat, lng) {
  let html = `
    <div class="geocode-info">
      <h3>📍 Información del Lugar</h3>
      <p><strong>Municipio:</strong> ${info.municipality || "Desconocido"}</p>
  `;

  if (info.nearest_via_pecuaria) {
    html += `
      <p><strong>Vía Pecuaria más cercana:</strong><br>
      ${info.nearest_via_pecuaria.name}<br>
      <small>Distancia: ${info.nearest_via_pecuaria.distance_meters}m</small></p>
    `;
  }

  html += `</div>`;

  L.popup({ maxWidth: 400 }).setLatLng([lat, lng]).setContent(html).openOn(map);
}

// ==============================================================
// ESTILOS CSS ADICIONALES PARA LAS NUEVAS FUNCIONES
// ==============================================================

export function injectAdvancedStyles() {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    .stats-panel, .nearby-results, .protection-zones, .recent-activity, .geocode-info {
      font-family: var(--font-family);
      color: var(--on-surface);
    }

    .stats-panel h3, .nearby-results h3, .protection-zones h3, .recent-activity h3, .geocode-info h3 {
      margin-bottom: 12px;
      color: var(--primary);
      font-size: 16px;
      border-bottom: 2px solid var(--outline);
      padding-bottom: 8px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin: 16px 0;
    }

    .stat-item {
      background: var(--surface-dim);
      padding: 12px;
      border-radius: var(--radius-md);
      border: 1px solid var(--outline);
      text-align: center;
    }

    .stat-label {
      display: block;
      font-size: 11px;
      color: var(--on-surface-variant);
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-value {
      display: block;
      font-size: 24px;
      font-weight: 700;
      color: var(--primary);
    }

    .stats-breakdown {
      margin-top: 16px;
      padding: 12px;
      background: var(--surface-variant);
      border-radius: var(--radius-md);
    }

    .stats-breakdown h4 {
      font-size: 13px;
      margin-bottom: 8px;
      color: var(--on-surface);
    }

    .stats-breakdown ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .stats-breakdown li {
      padding: 4px 0;
      font-size: 13px;
      color: var(--on-surface-variant);
    }

    .nearby-list, .activity-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .nearby-item, .activity-item {
      padding: 10px;
      margin: 8px 0;
      background: var(--surface-dim);
      border: 1px solid var(--outline);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .nearby-item:hover, .activity-item:hover {
      border-color: var(--primary);
      box-shadow: var(--shadow-sm);
    }

    .nearby-header, .activity-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .nearby-distance, .activity-date {
      font-size: 11px;
      color: var(--on-surface-variant);
      font-weight: 600;
    }

    .nearby-meta, .activity-meta {
      font-size: 11px;
      color: var(--on-surface-variant);
    }

    .nearby-layer, .activity-type {
      background: var(--primary-light);
      color: var(--primary);
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
    }

    .activity-comment {
      margin-top: 8px;
      font-size: 12px;
      color: var(--on-surface-variant);
      line-height: 1.4;
    }

    .zone-section {
      margin: 12px 0;
      padding: 12px;
      background: var(--surface-dim);
      border-radius: var(--radius-md);
    }

    .zone-section h4 {
      font-size: 13px;
      color: var(--primary);
      margin-bottom: 8px;
    }

    .zone-section ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .zone-section li {
      padding: 4px 0;
      font-size: 13px;
      color: var(--on-surface);
    }

    .no-zones {
      text-align: center;
      padding: 20px;
      color: var(--on-surface-variant);
      font-style: italic;
    }

    .context-menu {
      padding: 8px;
    }

    .context-menu h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: var(--on-surface);
    }

    .context-btn {
      width: 100%;
      padding: 10px;
      margin: 4px 0;
      border: none;
      background: var(--surface-dim);
      color: var(--on-surface);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all var(--transition-fast);
    }

    .context-btn:hover {
      background: var(--primary);
      color: white;
    }

    .context-btn i {
      font-size: 14px;
    }

    .coords-info {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--outline);
      text-align: center;
    }

    .coords-info small {
      color: var(--on-surface-variant);
      font-size: 11px;
    }
  `;
  document.head.appendChild(styleSheet);
}

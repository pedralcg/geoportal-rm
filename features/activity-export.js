import { supabaseUrl, supabaseKey } from "../config.js";
import { map } from "../map.js";
import { setStatus } from "../ui.js";

// ================================================================
// ACTIVIDAD RECIENTE
// ================================================================

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
        body: JSON.stringify({ p_days: days, p_limit: 10 }),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const activities = Array.isArray(data) ? data : data.data || [];

    if (activities.length === 0) {
      setStatus("info", `No hay actividad reciente en los últimos ${days} días`);
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
  const html = `
    <div class="recent-activity">
      <h3>🕐 Actividad Reciente</h3>
      <div class="activity-list">
        ${activities
          .map((act) => {
            const dateStr = new Date(act.activity_timestamp).toLocaleDateString(
              "es-ES",
              { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
            );
            return `
            <div class="activity-item">
              <div class="activity-header">
                <strong>${act.feature_name}</strong>
                <span class="activity-date">${dateStr}</span>
              </div>
              <div class="activity-meta">
                <span class="activity-type">${act.details?.tipo || act.activity_type}</span>
              </div>
              ${
                act.details?.comentarios
                  ? `<p class="activity-comment">${act.details.comentarios.substring(0, 100)}${act.details.comentarios.length > 100 ? "..." : ""}</p>`
                  : ""
              }
            </div>`;
          })
          .join("")}
      </div>
    </div>
  `;

  L.popup({ maxWidth: 400 })
    .setLatLng(map.getCenter())
    .setContent(html)
    .openOn(map);

  setStatus("success", `${activities.length} actividades recientes cargadas`);
}

// ================================================================
// EXPORTAR CAPA A GEOJSON
// ================================================================

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

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const geojson = await response.json();
    if (geojson.error) {
      setStatus("error", geojson.error);
      return null;
    }

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

// ================================================================
// VALIDAR GEOMETRÍA
// ================================================================

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
        body: JSON.stringify({ p_geojson: geojson }),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    return await response.json();
  } catch (error) {
    console.error("Error al validar geometría:", error);
    return { valid: false, error: error.message };
  }
}

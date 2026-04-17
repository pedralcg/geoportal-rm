import { supabaseUrl, supabaseKey } from "../config.js";
import { map } from "../map.js";
import { setStatus } from "../ui.js";

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ================================================================
// ESTADÍSTICAS POR MUNICIPIO
// ================================================================

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
        body: JSON.stringify({ p_municipality_name: municipalityName }),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

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
        <h3>📊 Estadísticas: ${escapeHtml(stats.municipality)}</h3>
        <div class="stats-area">Superficie: ${escapeHtml(String(stats.area_km2))} km²</div>
      </div>
      <div class="stats-grid">
        <div class="stat-card clickable" data-category="arboles">
          <div class="stat-icon">🌳</div>
          <div class="stat-content">
            <div class="stat-value">${escapeHtml(String(stats.arboles_monumentales.count))}</div>
            <div class="stat-label">Árboles Monumentales</div>
            <div class="stat-sublabel">${escapeHtml(String(stats.arboles_monumentales.densidad_por_km2))} por km²</div>
          </div>
        </div>
        <div class="stat-card clickable" data-category="vias">
          <div class="stat-icon">🐄</div>
          <div class="stat-content">
            <div class="stat-value">${escapeHtml(String(stats.vias_pecuarias.count))}</div>
            <div class="stat-label">Vías Pecuarias</div>
            <div class="stat-sublabel">${escapeHtml(String(stats.vias_pecuarias.longitud_km))} km totales</div>
          </div>
        </div>
        <div class="stat-card clickable" data-category="enp">
          <div class="stat-icon">🏞️</div>
          <div class="stat-content">
            <div class="stat-value">${escapeHtml(String(stats.enp.superficie_km2))} km²</div>
            <div class="stat-label">ENP</div>
            <div class="stat-sublabel">${escapeHtml(String(stats.enp.count))} espacios (${escapeHtml(String(stats.enp.porcentaje_protegido))}%)</div>
          </div>
        </div>
        <div class="stat-card clickable" data-category="lic_zec">
          <div class="stat-icon">🦅</div>
          <div class="stat-content">
            <div class="stat-value">${escapeHtml(String(stats.lic_zec.superficie_km2))} km²</div>
            <div class="stat-label">LIC/ZEC</div>
            <div class="stat-sublabel">${escapeHtml(String(stats.lic_zec.count))} zonas (${escapeHtml(String(stats.lic_zec.porcentaje_protegido))}%)</div>
          </div>
        </div>
        <div class="stat-card clickable" data-category="zepa">
          <div class="stat-icon">🦜</div>
          <div class="stat-content">
            <div class="stat-value">${escapeHtml(String(stats.zepa.superficie_km2))} km²</div>
            <div class="stat-label">ZEPA</div>
            <div class="stat-sublabel">${escapeHtml(String(stats.zepa.count))} zonas (${escapeHtml(String(stats.zepa.porcentaje_protegido))}%)</div>
          </div>
        </div>
      </div>
    </div>
  `;

  L.popup({ maxWidth: 600, className: "stats-popup" })
    .setLatLng(map.getCenter())
    .setContent(html)
    .openOn(map);

  setTimeout(() => {
    document.querySelectorAll(".stat-card.clickable").forEach((card) => {
      card.addEventListener("click", () =>
        showStatDetails(stats, card.dataset.category)
      );
    });
  }, 100);

  setStatus("success", "Estadísticas cargadas correctamente");
}

function showStatDetails(stats, category) {
  const categoryData = {
    arboles: {
      title: "🌳 Árboles Monumentales",
      items: stats.arboles_monumentales.items,
      formatItem: (item) => `<strong>${escapeHtml(item.nombre)}</strong>`,
    },
    vias: {
      title: "🐄 Vías Pecuarias",
      items: stats.vias_pecuarias.items,
      formatItem: (item) =>
        `<strong>${escapeHtml(item.nombre)}</strong> - ${escapeHtml(String(item.longitud_km))} km`,
    },
    enp: {
      title: "🏞️ Espacios Naturales Protegidos",
      items: stats.enp.items,
      formatItem: (item) =>
        `<strong>${escapeHtml(item.nombre)}</strong> - ${escapeHtml(String(item.superficie_km2))} km²`,
    },
    lic_zec: {
      title: "🦅 LIC/ZEC",
      items: stats.lic_zec.items,
      formatItem: (item) =>
        `<strong>${escapeHtml(item.nombre)}</strong> - ${escapeHtml(String(item.superficie_km2))} km²`,
    },
    zepa: {
      title: "🦜 ZEPA",
      items: stats.zepa.items,
      formatItem: (item) =>
        `<strong>${escapeHtml(item.nombre)}</strong> - ${escapeHtml(String(item.superficie_km2))} km²`,
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
      <div class="stat-details-count">Total: ${data.items.length} elementos</div>
      <div class="stat-details-list">
        ${data.items
          .map((item) => `<div class="stat-detail-item">${data.formatItem(item)}</div>`)
          .join("")}
      </div>
    </div>
  `;

  L.popup({ maxWidth: 500, className: "stat-details-popup" })
    .setLatLng(map.getCenter())
    .setContent(html)
    .openOn(map);
}

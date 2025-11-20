import { supabaseUrl, supabaseKey } from "./config.js";
import { setStatus } from "./ui.js";
import { map } from "./map.js";
import { safeParseJSON, reloadAllActiveLayers } from "./data.js";
import { setCurrentMunicipality } from "./ui-integration.js";

export let municipiosIndex = [];
export let highlightLayer = null;

// ================================================================
// UTILIDADES DE OPTIMIZACIÓN
// ================================================================

// Debounce para optimizar búsqueda
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Caché simple para geometrías de municipios
const geometryCache = new Map();

// ================================================================
// PRECARGA DE MUNICIPIOS
// ================================================================

export async function preloadMunicipios() {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/municipios_rm?select=Municipio`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    const data = await response.json();
    municipiosIndex = [
      ...new Set(data.map((item) => item.Municipio).filter(Boolean)),
    ].sort();

    console.log(`📍 ${municipiosIndex.length} municipios cargados`);
  } catch (error) {
    console.error("Error cargando municipios:", error);
  }
}

// ================================================================
// BÚSQUEDA CON DEBOUNCING
// ================================================================

// ================================================================
// BÚSQUEDA CON DEBOUNCING
// ================================================================

function performSearch(query) {
  const resultsDiv = document.getElementById("search-results");
  const clearBtn = document.getElementById("search-clear");

  if (query.length > 0) {
    clearBtn.classList.remove("hidden");
  } else {
    clearBtn.classList.add("hidden");
  }

  if (query.length < 2) {
    resultsDiv.classList.remove("active");
    resultsDiv.innerHTML = "";
    return;
  }

  const matches = municipiosIndex
    .filter((municipio) => municipio.toLowerCase().includes(query))
    .slice(0, 7);

  if (matches.length === 0) {
    resultsDiv.classList.remove("active");
    resultsDiv.innerHTML = "";
    return;
  }

  resultsDiv.innerHTML = matches
    .map((municipio) => `<div data-name="${municipio}">${municipio}</div>`)
    .join("");

  resultsDiv.classList.add("active");

  resultsDiv.querySelectorAll("div").forEach((div) => {
    div.addEventListener("click", () => selectMunicipio(div.dataset.name));
  });
}

// Exportar versión con debounce (300ms)
export const onSearch = debounce((e) => {
  const query = e.target.value.trim().toLowerCase();
  performSearch(query);
}, 300);

// ================================================================
// SELECCIÓN DE MUNICIPIO OPTIMIZADA
// ================================================================

export async function selectMunicipio(name) {
  const resultsDiv = document.getElementById("search-results");
  const searchInput = document.getElementById("search-input");
  const clearBtn = document.getElementById("search-clear");

  resultsDiv.classList.remove("active");
  resultsDiv.innerHTML = "";

  // Limpiar el resaltado anterior
  if (highlightLayer) {
    map.removeLayer(highlightLayer);
    highlightLayer = null;
  }

  // Lógica para eliminar el filtro (si name es null o vacío)
  if (!name) {
    searchInput.value = "";
    clearBtn.classList.add("hidden");
    setCurrentMunicipality(null);
    setStatus(
      "info",
      "Filtro espacial de municipio eliminado. Recargando capas..."
    );
    await reloadAllActiveLayers(null);
    return;
  }

  // Actualizar input y mostrar botón limpiar
  searchInput.value = name;
  clearBtn.classList.remove("hidden");

  setStatus("warning", `Localizando y filtrando por municipio ${name}...`);

  try {
    // Verificar caché primero
    let geom = geometryCache.get(name);

    if (!geom) {
      // Si no está en caché, hacer petición
      const url = `${supabaseUrl}/rest/v1/municipios_rm?select=geom,Municipio&Municipio=eq.${encodeURIComponent(
        name
      )}&limit=1`;
      const response = await fetch(url, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });

      const data = await response.json();

      if (data.length && data[0].geom) {
        geom =
          typeof data[0].geom === "string"
            ? safeParseJSON(data[0].geom)
            : data[0].geom;

        // Guardar en caché
        if (geom) {
          geometryCache.set(name, geom);
        }
      }
    }

    if (geom) {
      // Crear resaltado temporal
      highlightLayer = L.geoJSON(geom, {
        style: {
          color: "#7a9b76", // sage-green
          weight: 3,
          opacity: 1,
          fillOpacity: 0.08,
          dashArray: "8, 4",
        },
      }).addTo(map);

      // Ajustar zoom
      map.fitBounds(highlightLayer.getBounds(), { padding: [30, 30] });

      // Actualizar municipio actual
      setCurrentMunicipality(name);

      // Filtrar capas
      await reloadAllActiveLayers(geom);

      setStatus("success", `Municipio ${name} localizado y capas filtradas.`);
    } else {
      await reloadAllActiveLayers(null);
      setCurrentMunicipality(null);
      setStatus(
        "info",
        `Municipio localizado. No se pudo dibujar la geometría. Se ha limpiado el filtro.`
      );
    }
  } catch (error) {
    console.error(error);
    setStatus(
      "error",
      "No se pudo localizar el municipio o filtrar las capas."
    );
    await reloadAllActiveLayers(null);
    setCurrentMunicipality(null);
  }
}

// ================================================================
// LIMPIAR CACHÉ (útil para desarrollo)
// ================================================================

export function clearGeometryCache() {
  geometryCache.clear();
  console.log("🧹 Caché de geometrías limpiado");
}

// Inicializar evento del botón limpiar
export function setupSearchEvents() {
  const clearBtn = document.getElementById("search-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      selectMunicipio(null);
    });
  }
}

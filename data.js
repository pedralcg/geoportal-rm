import { supabaseUrl, supabaseKey, layersConfig } from "./config.js";
import { map, layerGroups, showPopup } from "./map.js";
import { setStatus } from "./ui.js";

// ================================================================
// TIPOS DE ANOTACIÓN Y CONFIGURACIÓN
// ================================================================

// ================================================================
// CACHÉ DE CAPAS
// ================================================================

const layerDataCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

function getCachedData(key, filterHash) {
  const cacheKey = `${key}_${filterHash || "all"}`;
  const cached = layerDataCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  return null;
}

function setCachedData(key, filterHash, data) {
  const cacheKey = `${key}_${filterHash || "all"}`;
  layerDataCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

// ================================================================
// UTILIDADES
// ================================================================

export function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

// Iconos optimizados con colores medioambientales

export function featureStyle(key) {
  const color = layersConfig[key].color;
  const type = layersConfig[key].type;

  if (type === "line") {
    return { color: color, weight: 2.5, opacity: 0.9 };
  }

  if (type === "point") {
    return {
      color: color,
      weight: 2,
      opacity: 1,
      fillColor: color,
      fillOpacity: 0.8,
    };
  }

  return {
    color: color,
    weight: 2,
    opacity: 0.9,
    fillColor: color,
    fillOpacity: 0.15,
  };
}

// ================================================================
// FILTRO ESPACIAL GLOBAL
// ================================================================

export let currentSpatialFilterGeom = null;

function getActiveLayerKeys() {
  const activeKeys = [];
  for (const [key] of Object.entries(layersConfig)) {
    const checkbox = document.getElementById(`toggle-${key}`);
    if (checkbox && checkbox.checked) {
      activeKeys.push(key);
    }
  }
  return activeKeys;
}

export async function reloadAllActiveLayers(geom = null) {
  currentSpatialFilterGeom = geom;
  const activeKeys = getActiveLayerKeys();

  // Remover capas existentes
  for (const key of activeKeys) {
    if (layerGroups[key]) {
      map.removeLayer(layerGroups[key]);
      delete layerGroups[key];
    }
  }

  // Recargar capas activas
  for (const key of activeKeys) {
    if (key !== "municipios_rm" || !geom) {
      await loadLayer(key);
    }
  }

  if (!geom) {
    currentSpatialFilterGeom = null;
  }
}

// ================================================================
// CARGA DE CAPAS OPTIMIZADA
// ================================================================

export async function loadDefaultLayers() {
  const defaultLayers = Object.entries(layersConfig)
    .filter(([_, cfg]) => cfg.active)
    .map(([key]) => key);

  // Cargar capas en paralelo para mejor rendimiento
  await Promise.all(defaultLayers.map((key) => loadLayer(key)));
}

export async function toggleLayer(key, visible) {
  if (visible) {
    if (!layerGroups[key]) {
      await loadLayer(key);
    } else {
      map.addLayer(layerGroups[key]);
      setStatus("info", `${layersConfig[key].name} activada.`);
    }
  } else {
    if (layerGroups[key]) {
      map.removeLayer(layerGroups[key]);
      setStatus("info", `${layersConfig[key].name} desactivada.`);
    }
  }
}

export async function loadLayer(key) {
  setStatus("warning", `Cargando ${layersConfig[key].name}...`);

  try {
    const geomToFilter =
      key === "municipios_rm" ? null : currentSpatialFilterGeom;
    const filterHash = geomToFilter
      ? JSON.stringify(geomToFilter).substring(0, 50)
      : null;

    // Verificar caché primero
    const cachedData = getCachedData(key, filterHash);
    if (cachedData) {
      renderLayerData(key, cachedData);
      setStatus(
        "success",
        `${layersConfig[key].name}: ${cachedData.length} elementos (caché)`
      );
      return;
    }

    // Preparar petición
    let url, options;
    const baseHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    };

    if (geomToFilter) {
      // Usar RPC para filtro espacial
      url = `${supabaseUrl}/rest/v1/rpc/get_spatial_features`;
      options = {
        method: "POST",
        headers: {
          ...baseHeaders,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          layer_name: key,
          geojson_filter: geomToFilter,
        }),
      };
    } else {
      // GET normal con límite optimizado
      url = `${supabaseUrl}/rest/v1/${key}?select=*,geom&limit=2000`;
      options = { headers: baseHeaders };
    }

    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    // Guardar en caché
    setCachedData(key, filterHash, data);

    // Renderizar
    renderLayerData(key, data);
    setStatus("success", `${layersConfig[key].name}: ${data.length} elementos`);
  } catch (error) {
    console.error(error);
    setStatus(
      "error",
      `Error cargando ${layersConfig[key].name} (${error.message})`
    );
  }
}

// ================================================================
// RENDERIZADO DE CAPAS
// ================================================================

function renderLayerData(key, data) {
  const group = L.layerGroup();
  const style = featureStyle(key);

  data.forEach((item) => {
    if (!item.geom) return;

    const geom =
      typeof item.geom === "string" ? safeParseJSON(item.geom) : item.geom;
    if (!geom) return;

    const layer = L.geoJSON(geom, {
      style: style,
      attribution: layersConfig[key].attribution,
      pointToLayer: (feature, latlng) => {
        // Iconos temáticos para anotaciones

        // Puntos por defecto
        return L.circleMarker(latlng, {
          ...style,
          radius: 6,
          weight: 2,
          fillOpacity: 0.7,
        });
      },
    });

    // Event listeners optimizados
    layer.eachLayer((l) => {
      l.on("click", () => {
        const props = { ...item };
        delete props.geom;
        const title = layersConfig[key].name;
        showPopup(l, props, title);
      });
    });

    group.addLayer(layer);
  });

  layerGroups[key] = group;
  group.addTo(map);
}

// ================================================================
// LIMPIEZA DE CACHÉ
// ================================================================

export function clearLayerCache() {
  layerDataCache.clear();
  console.log("🧹 Caché de capas limpiado");
}

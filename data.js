import { supabaseUrl, supabaseKey, layersConfig } from "./config.js";
import { map, layerGroups, showPopup } from "./map.js";
import { setStatus } from "./ui.js";

// --- LISTA DE TIPOS DE ANOTACIÓN PARA LA LEYENDA Y EL MAPA (EXPORTADO) ---
export const ANOTACION_TYPES = [
  { key: "riesgo_incendio", name: "Riesgo de Incendio" },
  { key: "plaga_forestal", name: "Plaga Forestal" },
  { key: "inventario_forestal", name: "Inventario Forestal" },
  { key: "fauna", name: "Fauna Silvestre" },
  { key: "punto_control_lidar", name: "Punto de Control LiDAR" },
  { key: "validacion_datos_gis", name: "Validación Datos GIS" },
  { key: "otro", name: "Otro Tipo" },
];

// --- UTILIDADES ---

export function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

// Función para obtener el icono según el tipo de anotación (EXPORTADO)
export function getAnotacionIcon(tipo) {
  // Mapeo de los valores del <select> a un icono de Font Awesome
  switch (tipo) {
    case "riesgo_incendio":
      return { icon: "fas fa-fire-alt", color: "#ef4444" }; // Rojo
    case "plaga_forestal":
      return { icon: "fas fa-bug", color: "#84cc16" }; // Verde Lima
    case "inventario_forestal":
      return { icon: "fas fa-tree", color: "#10b981" }; // Verde Esmeralda
    case "fauna":
      return { icon: "fas fa-paw", color: "#7c3aed" }; // Púrpura
    case "punto_control_lidar":
      return { icon: "fas fa-location-dot", color: "#0ea5e9" }; // Azul Claro
    case "validacion_datos_gis":
      return { icon: "fas fa-map-marked-alt", color: "#f97316" }; // Naranja
    case "otro":
    default:
      // Caso por defecto, incluyendo si 'tipo' es null/undefined
      return { icon: "fas fa-exclamation-triangle", color: "#f59e0b" };
  }
}

export function featureStyle(key) {
  const color = layersConfig[key].color;
  const type = layersConfig[key].type;

  if (type === "line") {
    return { color: color, weight: 2.5, opacity: 0.9 };
  }

  // Excluir la capa 'anotaciones' del estilo de punto por defecto
  if (type === "point" && key !== "anotaciones") {
    return {
      color: color,
      weight: 2,
      opacity: 1,
      fillColor: color,
      fillOpacity: 0.8,
    };
  }

  // Estilo por defecto (para polígonos y para la capa 'anotaciones' L.geoJSON)
  return {
    color: color,
    weight: 2,
    opacity: 0.9,
    fillColor: color,
    fillOpacity: 0.15,
  };
}

// ------------------------------------------
// --- GESTIÓN DE FILTRO ESPACIAL GLOBAL ---
// ------------------------------------------

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

  // 1. Remover las capas existentes del mapa para forzar la recarga
  for (const key of activeKeys) {
    if (layerGroups[key]) {
      map.removeLayer(layerGroups[key]);
      delete layerGroups[key];
    }
  }

  // 2. Recargar las capas.
  for (const key of activeKeys) {
    // Solo cargar capas que no sean 'municipios_rm' cuando hay un filtro (geom).
    if (key !== "municipios_rm" || !geom) {
      await loadLayer(key);
    }
  }

  if (!geom) {
    currentSpatialFilterGeom = null;
  }
}

// ------------------------------------------
// --- CARGA Y GESTIÓN DE CAPAS ---
// ------------------------------------------

export async function loadDefaultLayers() {
  for (const [key, cfg] of Object.entries(layersConfig)) {
    if (cfg.active) {
      await loadLayer(key);
    }
  }
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
    let url;
    let options;

    const baseHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    };

    const geomToFilter =
      key === "municipios_rm" ? null : currentSpatialFilterGeom;

    if (geomToFilter) {
      // Usar el endpoint RPC para filtro espacial
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
      // Caso normal: GET para la carga predeterminada
      url = `${supabaseUrl}/rest/v1/${key}?select=*,geom&limit=2000`;
      options = { headers: baseHeaders };
    }

    const response = await fetch(url, options);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const group = L.layerGroup();

    data.forEach((item) => {
      if (!item.geom) return;

      const geom =
        typeof item.geom === "string" ? safeParseJSON(item.geom) : item.geom;
      if (!geom) return;

      const style = featureStyle(key);

      const layer = L.geoJSON(geom, {
        style: style,
        pointToLayer: (feature, latlng) => {
          // LÓGICA DE ICONO TEMÁTICO PARA ANOTACIONES
          if (key === "anotaciones") {
            // ¡CORREGIDO! Antes era "reportes"
            // Comprobación defensiva: asegura que item existe y tiene el tipo
            const tipo =
              item && item.tipo_anotacion ? item.tipo_anotacion : "otro";
            const iconData = getAnotacionIcon(tipo);

            return L.marker(latlng, {
              icon: L.divIcon({
                className: "custom-anotacion-icon",
                html: `<i class='${iconData.icon}' style='color: ${iconData.color}; font-size: 24px;'></i>`,
                iconSize: [24, 24],
                iconAnchor: [12, 24],
                popupAnchor: [0, -24],
              }),
            });
          }

          // LÓGICA DE PUNTO POR DEFECTO PARA OTRAS CAPAS
          return L.circleMarker(latlng, {
            ...style,
            radius: 6,
            weight: 2,
            fillOpacity: 0.7,
          });
        },
      });

      layer.eachLayer((l) => {
        l.on("click", () => {
          const props = Object.assign({}, item);
          delete props.geom;

          // Título específico para las anotaciones
          const title =
            key === "anotaciones" // ¡CORREGIDO! Antes era "reportes"
              ? "Detalle de Anotación"
              : layersConfig[key].name;

          showPopup(l, props, title);
        });
      });

      group.addLayer(layer);
    });

    layerGroups[key] = group;
    group.addTo(map);
    setStatus("success", `${layersConfig[key].name}: ${data.length} elementos`);
  } catch (error) {
    console.error(error);
    setStatus(
      "error",
      `Error cargando ${layersConfig[key].name} (Error: ${error.message})`
    );
  }
}

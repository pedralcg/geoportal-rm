import { map, layerGroups } from "./map.js";
import { setStatus, toggleRightSidebar } from "./ui.js";
import { supabaseUrl, supabaseKey } from "./config.js";
import { loadLayer } from "./data.js";

export let anotacionLocation = null;
export let anotacionMarker = null;
export let mapPickingMode = false;

// --- GESTIÓN DE COORDENADAS ---

export function clearAnotacionLocation() {
  anotacionLocation = null;
  if (anotacionMarker) {
    map.removeLayer(anotacionMarker);
    anotacionMarker = null;
  }
  updateCoordsDisplay();
}

export function updateCoordsDisplay() {
  const coordsText = document.getElementById("coords-text");
  const coordsDisplay = document.querySelector(".coords-display");

  if (anotacionLocation) {
    coordsText.textContent = `${anotacionLocation.lat.toFixed(
      6
    )}, ${anotacionLocation.lng.toFixed(6)}`;
    coordsDisplay.classList.add("selected");
  } else {
    coordsText.textContent = "No seleccionada";
    coordsDisplay.classList.remove("selected");
  }
}

export function setAnotacionLocation(latlng) {
  anotacionLocation = latlng;

  if (anotacionMarker) {
    map.removeLayer(anotacionMarker);
  }

  anotacionMarker = L.marker([latlng.lat, latlng.lng], {
    icon: L.divIcon({
      className: "anotacion-marker-icon",
      html: '<i class="fas fa-map-pin" style="color: #ef4444; font-size: 24px;"></i>',
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24],
    }),
  }).addTo(map);

  updateCoordsDisplay();
}

// --- SELECCIÓN EN MAPA Y MANUAL ---

export function startMapPicking() {
  stopMapPicking();
  mapPickingMode = true;
  document.getElementById("pick-on-map").classList.add("active-picking");
  map.getContainer().classList.add("map-picking");
  setStatus(
    "warning",
    "Haz clic en el mapa para seleccionar la ubicación de la anotación"
  );
}

export function stopMapPicking() {
  mapPickingMode = false;
  document.getElementById("pick-on-map").classList.remove("active-picking");
  map.getContainer().classList.remove("map-picking");
}

export function setAnotacionLocationFromMap(latlng) {
  stopMapPicking();
  setAnotacionLocation(latlng);
  setStatus("success", "Ubicación seleccionada en el mapa");
}

export function setManualCoords() {
  const latInput = document.getElementById("lat-input");
  const lngInput = document.getElementById("lng-input");

  const lat = parseFloat(latInput.value);
  const lng = parseFloat(lngInput.value);

  if (isNaN(lat) || isNaN(lng)) {
    setStatus("error", "Ingresa coordenadas válidas");
    return;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    setStatus("error", "Coordenadas fuera de rango válido");
    return;
  }

  setAnotacionLocation({ lat, lng });
  map.setView([lat, lng], 16);
  setStatus("success", "Coordenadas fijadas manualmente");
}

export function resetAnotacionForm() {
  document.getElementById("nombre").value = "";
  // ID CORREGIDO: Usar 'tipo' para el campo select (según tu HTML)
  document.getElementById("tipo").value = "";
  document.getElementById("comentarios").value = "";
  document.getElementById("lat-input").value = "";
  document.getElementById("lng-input").value = "";
  clearAnotacionLocation();
  stopMapPicking();
}

// --- ENVÍO DE ANOTACIÓN ---

export async function sendAnotacion() {
  const nombre = document.getElementById("nombre").value.trim();
  // ID CORREGIDO AQUÍ: Usar 'tipo' para el campo select (según tu HTML)
  const tipo = document.getElementById("tipo").value;
  const comentarios = document.getElementById("comentarios").value.trim();

  // VALIDACIÓN: Todos los campos son obligatorios.
  if (!nombre || !tipo || !comentarios) {
    setStatus(
      "error",
      "Completa los campos obligatorios: Nombre, Tipo de Anotación y Comentarios"
    );
    return;
  }

  if (!anotacionLocation) {
    setStatus("error", "Selecciona una ubicación para la anotación");
    return;
  }

  const sendButton = document.getElementById("anotacion-send");
  sendButton.disabled = true;
  sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

  try {
    setStatus("warning", "Enviando anotación...");

    // LLAMADA RPC CORREGIDA: Usando 'add_new_anotacion' (la que creamos en Supabase)
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/add_new_anotacion`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          p_nombre: nombre,
          // PARÁMETRO RPC CORREGIDO: p_tipo_anotacion (coincide con la función Supabase)
          p_tipo_anotacion: tipo,
          p_comentarios: comentarios,
          p_lat: anotacionLocation.lat,
          p_lng: anotacionLocation.lng,
        }),
      }
    );

    if (response.ok) {
      setStatus("success", "Anotación enviada correctamente");
      resetAnotacionForm();

      // Si la capa 'anotaciones' está activa, la recargamos
      if (layerGroups["anotaciones"]) {
        map.removeLayer(layerGroups["anotaciones"]);
        delete layerGroups["anotaciones"];
        await loadLayer("anotaciones");
      }
    } else {
      const errorResult = await response.json();
      setStatus("error", "No se pudo enviar la anotación.");
      console.error("Error del servidor:", errorResult);
    }
  } catch (error) {
    console.error("Error enviando anotación:", error);
    setStatus("error", "Error de conexión al enviar anotación");
  } finally {
    sendButton.disabled = false;
    sendButton.innerHTML =
      '<i class="fas fa-share-square"></i> Guardar Anotación';

    setTimeout(() => {
      const sidebar = document.getElementById("right-sidebar");
      if (sidebar.classList.contains("expanded")) {
        toggleRightSidebar();
      }
    }, 1000);
  }
}

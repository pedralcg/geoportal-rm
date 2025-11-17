import { supabaseUrl, supabaseKey } from "./config.js";
import { setStatus } from "./ui.js";
import { map } from "./map.js";
import { safeParseJSON, reloadAllActiveLayers } from "./data.js";

export let municipiosIndex = [];
export let highlightLayer = null; // CLAVE: Variable para el resaltado del municipio

// --- PRECARGA DE MUNICIPIOS ---

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
  } catch (error) {
    console.error("Error cargando municipios:", error);
  }
}

// --- LÓGICA DE BÚSQUEDA ---

export function onSearch(e) {
  const query = e.target.value.trim().toLowerCase();
  const resultsDiv = document.getElementById("search-results");

  if (query.length < 2) {
    resultsDiv.classList.remove("show");
    resultsDiv.innerHTML = "";
    return;
  }

  const matches = municipiosIndex
    .filter((municipio) => municipio.toLowerCase().includes(query))
    .slice(0, 7);

  // Añadir una opción explícita para limpiar el filtro en los resultados
  const clearOption = '<div data-name="Limpiar">❌ Limpiar Filtro</div>';

  resultsDiv.innerHTML =
    matches
      .map((municipio) => `<div data-name="${municipio}">${municipio}</div>`)
      .join("") + clearOption; // Mostrar la opción de limpiar

  resultsDiv.classList.add("show");

  resultsDiv.querySelectorAll("div").forEach((div) => {
    div.addEventListener("click", () => selectMunicipio(div.dataset.name));
  });
}

export async function selectMunicipio(name) {
  const resultsDiv = document.getElementById("search-results");
  resultsDiv.classList.remove("show");
  resultsDiv.innerHTML = "";

  // 1. Limpiar el resaltado anterior
  if (highlightLayer) {
    map.removeLayer(highlightLayer);
    highlightLayer = null;
  }

  // 2. Lógica para ELIMINAR EL FILTRO (si se busca 'limpiar', 'reset' o cadena vacía)
  const lowerName = name.trim().toLowerCase();
  if (lowerName === "" || lowerName === "limpiar" || lowerName === "reset") {
    document.getElementById("search-input").value = ""; // Vaciar la barra
    setStatus(
      "info",
      "Filtro espacial de municipio eliminado. Recargando capas..."
    );
    await reloadAllActiveLayers(null); // CLAVE: Llama a null para recargar sin filtro
    return;
  }

  // 3. Vaciar la barra de búsqueda después de la selección
  document.getElementById("search-input").value = "";

  setStatus("warning", `Localizando y filtrando por municipio ${name}...`);

  try {
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
      const geom =
        typeof data[0].geom === "string"
          ? safeParseJSON(data[0].geom)
          : data[0].geom;

      if (geom) {
        // CREACIÓN del Resaltado Temporal (soluciona la visibilidad)
        highlightLayer = L.geoJSON(geom, {
          style: {
            color: "#f59e0b", // Naranja
            weight: 4,
            opacity: 1,
            fillOpacity: 0.05,
            dashArray: "5, 5",
          },
        }).addTo(map);

        // Ajusta el zoom al nuevo resaltado
        map.fitBounds(highlightLayer.getBounds(), { padding: [20, 20] });

        // Filtra las capas de datos (Árboles, etc.)
        await reloadAllActiveLayers(geom);

        setStatus("success", `Municipio ${name} localizado y capas filtradas.`);
      } else {
        await reloadAllActiveLayers(null);
        setStatus(
          "info",
          `Municipio localizado. No se pudo dibujar la geometría. Se ha limpiado el filtro.`
        );
      }
    } else {
      await reloadAllActiveLayers(null);
      setStatus(
        "info",
        `Municipio ${name} no encontrado o sin geometría. Filtro limpiado.`
      );
    }
  } catch (error) {
    console.error(error);
    setStatus(
      "error",
      "No se pudo localizar el municipio o filtrar las capas."
    );
    await reloadAllActiveLayers(null);
  }
}

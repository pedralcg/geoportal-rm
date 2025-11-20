import { init } from "./map.js";
import { setupAdvancedUI } from "./ui-integration.js";

// Inicia el Geoportal cuando el DOM esté completamente cargado.
window.addEventListener("load", async () => {
  // Inicializar el mapa básico
  await init();

  // Inicializar funcionalidades avanzadas
  setupAdvancedUI();

  console.log("🗺️ Geoportal Ambiental RM - Completamente Cargado");
});

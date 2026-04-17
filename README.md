# Geoportal Ambiental — Región de Murcia

Aplicación web interactiva para visualizar y analizar datos ambientales de la Región de Murcia.

## Características

- **Visualización de capas geográficas**: Árboles monumentales, vías pecuarias, espacios naturales protegidos (ENP, LIC/ZEC, ZEPA)
- **Búsqueda de municipios**: Filtrado espacial por municipio con caché optimizado
- **Dashboard de estadísticas**: Estadísticas calculadas con PostGIS para cada municipio (superficie, recuentos, porcentajes de protección)
- **Detalles clickeables**: Click en cards de estadísticas para ver listas detalladas
- **Búsqueda de elementos cercanos**: Encuentra elementos en un radio configurable (clic derecho en el mapa)

## Demo en línea

🌐 [https://pedralcg.github.io/geoportal-rm/](https://pedralcg.github.io/geoportal-rm/)

## Fuentes de datos

- **Coberturas (Capas)**: [Geocatálogo oficial de la Región de Murcia](https://murcianatural.carm.es/geocatalogo)
- **Mapas Base**: OpenStreetMap · Esri World Imagery · CartoDB Light · Esri World Street Map

## Estructura del proyecto

```
geoportal-rm/
├── index.html              # Página principal
├── main.js                 # Punto de entrada
├── config.js               # Configuración de Supabase y capas
├── styles.css              # Estilos globales
├── map.js                  # Gestión del mapa Leaflet
├── data.js                 # Carga y gestión de datos
├── ui.js                   # Componentes UI básicos
├── ui-integration.js       # Integración UI/Mapa
├── search.js               # Búsqueda de municipios
├── advanced-features.js    # Stub — ver features/
├── features/
│   ├── stats.js            # Estadísticas por municipio
│   ├── proximity.js        # Búsqueda de elementos cercanos y zonas de protección
│   ├── activity-export.js  # Actividad reciente, exportación GeoJSON
│   └── context-menu.js     # Menú contextual (clic derecho en el mapa)
└── sql/
    ├── municipality_statistics.sql  # Estadísticas por municipio (PostGIS)
    └── advanced_features.sql        # Búsqueda cercana, zonas de protección
```

## Deploy

### 1. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta los scripts SQL en orden:

   ```sql
   -- 1. Funciones avanzadas
   sql/advanced_features.sql

   -- 2. Estadísticas por municipio
   sql/municipality_statistics.sql
   ```

### 2. Configurar credenciales

Edita `config.js` con tus credenciales de Supabase:

```javascript
export const supabaseUrl = "TU_SUPABASE_URL";
export const supabaseKey = "TU_SUPABASE_ANON_KEY";
```

> La anon key de Supabase está diseñada para ser pública. La seguridad real se gestiona mediante Row Level Security (RLS) en Supabase.

### 3. Desplegar

Sube los archivos a cualquier servidor web estático:

- **GitHub Pages**: Activa Pages en la configuración del repositorio
- **Netlify**: Arrastra la carpeta al dashboard
- **Vercel**: Conecta el repositorio Git

## Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript ES Modules (sin bundler)
- **Mapa**: [Leaflet.js](https://leafletjs.com/) 1.9.4
- **Backend/Base de datos**: [Supabase](https://supabase.com/) (PostgreSQL + PostGIS)
- **Tipografía**: Inter (Google Fonts)

## Funciones SQL (Supabase RPC)

| Función | Descripción |
|---|---|
| `get_municipality_statistics(p_municipality_name)` | Estadísticas completas de un municipio: superficie, árboles, vías pecuarias, ENP, LIC/ZEC, ZEPA |
| `get_nearby_features(p_lat, p_lng, p_radius_meters, ...)` | Elementos de cualquier capa en un radio dado |
| `get_protection_zones(p_lat, p_lng)` | Zonas de protección que contienen un punto |
| `get_spatial_features(layer_name, geojson_filter)` | Filtrado espacial de capas por geometría |
| `export_layer_geojson(p_layer_name, p_municipality)` | Exporta una capa a GeoJSON |

## Licencia

MIT © [Pedro Alcoba Gómez](https://pedralcg.dev)

## Contacto

- 🌐 Web: [pedralcg.dev](https://pedralcg.dev)
- 📧 Email: [pedro@pedralcg.dev](mailto:pedro@pedralcg.dev)
- 💾 GitHub: [github.com/pedralcg](https://github.com/pedralcg)

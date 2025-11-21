# Geoportal Ambiental - Región de Murcia

Aplicación web interactiva para visualizar y analizar datos ambientales de la Región de Murcia.

## 🌟 Características

- **Visualización de capas geográficas**: Árboles monumentales, vías pecuarias, espacios naturales protegidos (ENP, LIC/ZEC, ZEPA)
- **Búsqueda de municipios**: Filtrado espacial por municipio con caché optimizado
- **Dashboard de estadísticas**: Estadísticas precisas calculadas con PostGIS para cada municipio
- **Detalles clickeables**: Click en cards de estadísticas para ver listas detalladas
- **Búsqueda de elementos cercanos**: Encuentra elementos en un radio configurable
- **Zonas de protección**: Verifica si un punto está en zonas protegidas
- **Interfaz responsive**: Diseño adaptable a diferentes dispositivos

## � Fuentes de Datos

- **Coberturas (Capas)**: [Geocatálogo oficial de la Región de Murcia](https://murcianatural.carm.es/geocatalogo)
- **Mapas Base**:
  - OpenStreetMap
  - Esri World Imagery
  - CartoDB Light
  - Esri World Street Map

## �📁 Estructura del Proyecto

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
├── advanced-features.js    # Funcionalidades avanzadas
└── sql/                    # Funciones SQL
    ├── municipality_statistics.sql  # Estadísticas por municipio
    └── advanced_features.sql        # Búsqueda cercana, zonas protección
```

## 🚀 Deploy

### 1. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta los scripts SQL en orden:

   ```sql
   -- 1. Funciones avanzadas
   sql/advanced_features.sql

   -- 2. Estadísticas por municipio
   sql/municipality_statistics.sql
   ```

### 2. Configurar Variables

Edita `config.js` con tus credenciales:

```javascript
export const supabaseUrl = "TU_SUPABASE_URL";
export const supabaseKey = "TU_SUPABASE_ANON_KEY";
```

### 3. Desplegar

Sube los archivos a tu servidor web o usa servicios como:

- **Netlify**: Arrastra la carpeta al dashboard
- **Vercel**: Conecta el repositorio Git
- **GitHub Pages**: Activa Pages en la configuración del repo

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapa**: Leaflet.js
- **Backend**: Supabase (PostgreSQL + PostGIS)
- **Estilos**: CSS Variables, Grid, Flexbox

## 📊 Funciones SQL

### `get_municipality_statistics(municipio)`

Calcula estadísticas precisas usando intersecciones espaciales PostGIS:

- Superficie del municipio
- Árboles monumentales (cantidad, densidad, lista)
- Vías pecuarias (cantidad, longitud total, lista con longitudes)
- Espacios protegidos (ENP, LIC/ZEC, ZEPA) con superficies y porcentajes

### `get_nearby_features(lat, lng, radio)`

Busca elementos cercanos en un radio especificado.

### `get_protection_zones(lat, lng)`

Verifica zonas de protección en un punto.

### `reverse_geocode(lat, lng)`

Obtiene información del lugar (municipio, vía pecuaria y árbol más cercanos).

## 📝 Licencia

Este proyecto está disponible bajo la licencia MIT.

Puedes usarlo, modificarlo y distribuirlo libremente, incluso con fines comerciales, siempre que mantengas los créditos del autor original.

Consulta el archivo LICENSE para más información.

## 👥 Contacto

- 🌐 Web: [pedralcg.github.io](https://pedralcg.github.io)
- 📧 Email: [pedralcg.dev@gmail.com](mailto:pedralcg.dev@gmail.com)
- 👤 LinkedIn: [linkedin.com/in/pedro-alcoba-gomez](https://www.linkedin.com/in/pedro-alcoba-gomez)
- 💾 Repositorios: [github.com/pedralcg](https://github.com/pedralcg?tab=repositories)

## 🤝 Cómo colaborar

Si te interesa colaborar en alguno de mis proyectos o quieres aportar ideas, puedes:

- Abrir un issue en el repositorio correspondiente.
- Enviar un pull request con mejoras o correcciones.
- Contactarme directamente por [email](mailto:pedralcg.dev@gmail.com) o [LinkedIn](https://www.linkedin.com/in/pedro-alcoba-gomez) para propuestas de colaboración.

Todas las contribuciones son bienvenidas, especialmente si te interesa SIG, teledetección o desarrollo web GIS.

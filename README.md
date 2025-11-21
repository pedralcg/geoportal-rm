- **Zonas de protección**: Verifica si un punto está en zonas protegidas
- **Interfaz responsive**: Diseño adaptable a diferentes dispositivos

## 🔗 Fuentes de Datos

- **Coberturas (Capas)**: [Geocatálogo oficial de la Región de Murcia](https://murcianatural.carm.es/geocatalogo)
- **Mapas Base**:
  - OpenStreetMap
  - Esri World Imagery
  - CartoDB Light
  - Esri World Street Map

## 📁 Estructura del Proyecto

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

Este proyecto está bajo la Licencia **Creative Commons Atribución-NoComercial 4.0 Internacional (CC BY-NC 4.0)**.

Esto significa que puedes:

- **Compartir**: Copiar y redistribuir el material en cualquier medio o formato.
- **Adaptar**: Remezclar, transformar y construir a partir del material.

Bajo las siguientes condiciones:

- **Atribución**: Debes dar crédito de manera adecuada, brindar un enlace a la licencia, e indicar si se han realizado cambios.
- **NoComercial**: No puedes hacer uso del material con propósitos comerciales.

Para ver una copia de esta licencia, visita [http://creativecommons.org/licenses/by-nc/4.0/](http://creativecommons.org/licenses/by-nc/4.0/) o consulta el archivo `LICENSE`.

Para uso comercial, por favor contactar con el autor.

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

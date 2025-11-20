-- ================================================================
-- FUNCIONES SQL ACTUALIZADAS PARA CAPAS ACTUALES
-- Elimina referencias a 'anotaciones' y usa las capas reales
-- ================================================================

-- ----------------------------------------------------------------
-- 1. BÚSQUEDA DE ELEMENTOS CERCANOS (ACTUALIZADA)
-- Busca en: arboles_monumentales, vias_pecuarias, enp, lic_zec, zepa
-- ----------------------------------------------------------------
-- Primero eliminar la función antigua si existe
DROP FUNCTION IF EXISTS get_nearby_features(FLOAT, FLOAT, INT, TEXT, INT);

CREATE OR REPLACE FUNCTION get_nearby_features(
    p_lat FLOAT,
    p_lng FLOAT,
    p_radius_meters INT DEFAULT 10000,
    p_layer_name TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20
)
RETURNS TABLE(
    layer TEXT,
    feature_id INTEGER,
    feature_name TEXT,
    distance_meters FLOAT,
    geom JSONB,
    properties JSONB
) 
LANGUAGE plpgsql
AS $$
DECLARE
    point_geom geography;
BEGIN
    point_geom := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
    
    RETURN QUERY
    SELECT * FROM (
        -- Árboles Monumentales
        SELECT 
            'arboles_monumentales'::TEXT as layer,
            am.id as feature_id,
            COALESCE(am."NOMBRE", 'Árbol #' || am.id::TEXT)::TEXT as feature_name,
            ST_Distance(point_geom, am.geom::geography)::FLOAT as distance_meters,
            ST_AsGeoJSON(am.geom)::JSONB as geom,
            to_jsonb(am.*) - 'geom' - 'id' as properties
        FROM arboles_monumentales am
        WHERE (p_layer_name IS NULL OR p_layer_name = 'arboles_monumentales')
          AND ST_DWithin(point_geom, am.geom::geography, p_radius_meters)
        
        UNION ALL
        
        -- Vías Pecuarias
        SELECT 
            'vias_pecuarias'::TEXT,
            vp.id,
            COALESCE(vp."VP_NB", 'Vía Pecuaria #' || vp.id::TEXT)::TEXT,
            ST_Distance(point_geom, vp.geom::geography)::FLOAT,
            ST_AsGeoJSON(ST_Centroid(vp.geom))::JSONB,
            to_jsonb(vp.*) - 'geom' - 'id'
        FROM vias_pecuarias vp
        WHERE (p_layer_name IS NULL OR p_layer_name = 'vias_pecuarias')
          AND ST_DWithin(point_geom, vp.geom::geography, p_radius_meters)
        
        UNION ALL
        
        -- ENP (Espacios Naturales Protegidos)
        SELECT 
            'enp'::TEXT,
            enp.id,
            COALESCE(enp.nombre, 'ENP #' || enp.id::TEXT)::TEXT,
            ST_Distance(point_geom, enp.geom::geography)::FLOAT,
            ST_AsGeoJSON(ST_Centroid(enp.geom))::JSONB,
            to_jsonb(enp.*) - 'geom' - 'id'
        FROM enp
        WHERE (p_layer_name IS NULL OR p_layer_name = 'enp')
          AND ST_DWithin(point_geom, enp.geom::geography, p_radius_meters)
        
        UNION ALL
        
        -- LIC/ZEC
        SELECT 
            'lic_zec'::TEXT,
            lz.id,
            COALESCE(lz."SITE_NAME", 'LIC/ZEC #' || lz.id::TEXT)::TEXT,
            ST_Distance(point_geom, lz.geom::geography)::FLOAT,
            ST_AsGeoJSON(ST_Centroid(lz.geom))::JSONB,
            to_jsonb(lz.*) - 'geom' - 'id'
        FROM lic_zec lz
        WHERE (p_layer_name IS NULL OR p_layer_name = 'lic_zec')
          AND ST_DWithin(point_geom, lz.geom::geography, p_radius_meters)
        
        UNION ALL
        
        -- ZEPA
        SELECT 
            'zepa'::TEXT,
            z.id,
            COALESCE(z.site_name, 'ZEPA #' || z.id::TEXT)::TEXT,
            ST_Distance(point_geom, z.geom::geography)::FLOAT,
            ST_AsGeoJSON(ST_Centroid(z.geom))::JSONB,
            to_jsonb(z.*) - 'geom' - 'id'
        FROM zepa z
        WHERE (p_layer_name IS NULL OR p_layer_name = 'zepa')
          AND ST_DWithin(point_geom, z.geom::geography, p_radius_meters)
    ) AS combined_results
    ORDER BY distance_meters
    LIMIT p_limit;
END;
$$;

-- ----------------------------------------------------------------
-- 2. ZONAS DE PROTECCIÓN (ACTUALIZADA)
-- Verifica si el punto está dentro de alguna zona protegida
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_protection_zones(
    p_lat FLOAT,
    p_lng FLOAT
)
RETURNS JSONB 
LANGUAGE plpgsql
AS $$
DECLARE
    point_geom geometry;
    result JSONB;
    muni TEXT;
    enp_zones JSONB;
    lic_zones JSONB;
    zepa_zones JSONB;
BEGIN
    point_geom := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
    
    -- Obtener municipio
    SELECT "Municipio" INTO muni
    FROM municipios_rm
    WHERE ST_Within(point_geom, geom)
    LIMIT 1;
    
    -- Obtener ENP que contienen el punto (solo nombre)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'nombre', COALESCE(enp.nombre, 'ENP #' || enp.id)
        )
    ), '[]'::jsonb) INTO enp_zones
    FROM enp
    WHERE ST_Within(point_geom, geom);
    
    -- Obtener LIC/ZEC que contienen el punto (solo nombre)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'nombre', COALESCE(lz."SITE_NAME", 'LIC/ZEC #' || lz.id)
        )
    ), '[]'::jsonb) INTO lic_zones
    FROM lic_zec lz
    WHERE ST_Within(point_geom, geom);
    
    -- Obtener ZEPA que contienen el punto (solo nombre)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'nombre', COALESCE(z.site_name, 'ZEPA #' || z.id)
        )
    ), '[]'::jsonb) INTO zepa_zones
    FROM zepa z
    WHERE ST_Within(point_geom, geom);
    
    result := jsonb_build_object(
        'coordinates', jsonb_build_object('lat', p_lat, 'lng', p_lng),
        'municipality', muni,
        'enp', enp_zones,
        'lic_zec', lic_zones,
        'zepa', zepa_zones
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- ----------------------------------------------------------------
-- 3. INFO DEL LUGAR (ACTUALIZADA)
-- Devuelve vía pecuaria y árbol monumental más cercanos
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION reverse_geocode(
    p_lat FLOAT,
    p_lng FLOAT
)
RETURNS JSONB 
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
    point_geom geography;
    muni TEXT;
    nearest_via JSONB;
    nearest_arbol JSONB;
BEGIN
    point_geom := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
    
    -- Obtener municipio
    SELECT "Municipio" INTO muni
    FROM municipios_rm
    WHERE ST_Within(ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326), geom)
    LIMIT 1;
    
    -- Obtener vía pecuaria más cercana (solo VP_NB y distancia)
    SELECT jsonb_build_object(
        'nombre', COALESCE(vp."VP_NB", 'Vía Pecuaria'),
        'distance_meters', ROUND(ST_Distance(point_geom, vp.geom::geography)::numeric, 2)
    ) INTO nearest_via
    FROM vias_pecuarias vp
    ORDER BY vp.geom::geography <-> point_geom
    LIMIT 1;
    
    -- Obtener árbol monumental más cercano (solo NOMBRE y distancia)
    SELECT jsonb_build_object(
        'nombre', COALESCE(am."NOMBRE", 'Árbol Monumental'),
        'distance_meters', ROUND(ST_Distance(point_geom, am.geom::geography)::numeric, 2)
    ) INTO nearest_arbol
    FROM arboles_monumentales am
    ORDER BY am.geom::geography <-> point_geom
    LIMIT 1;
    
    result := jsonb_build_object(
        'coordinates', jsonb_build_object('lat', p_lat, 'lng', p_lng),
        'municipality', muni,
        'nearest_via_pecuaria', COALESCE(nearest_via, jsonb_build_object('nombre', 'N/A', 'distance_meters', 0)),
        'nearest_arbol_monumental', COALESCE(nearest_arbol, jsonb_build_object('nombre', 'N/A', 'distance_meters', 0))
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- ----------------------------------------------------------------
-- PERMISOS
-- ----------------------------------------------------------------
GRANT EXECUTE ON FUNCTION get_nearby_features TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_protection_zones TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reverse_geocode TO anon, authenticated;

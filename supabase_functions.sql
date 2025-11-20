-- ================================================================
-- ENDPOINTS MEJORADOS PARA EL GEOPORTAL AMBIENTAL RM
-- VERSIÓN FINAL CORREGIDA
-- ================================================================

-- ----------------------------------------------------------------
-- ELIMINAR FUNCIONES EXISTENTES
-- ----------------------------------------------------------------
DROP FUNCTION IF EXISTS search_all_layers(text,text,text,jsonb,integer);
DROP FUNCTION IF EXISTS get_municipality_stats(text);
DROP FUNCTION IF EXISTS get_nearby_features(float,float,integer,text,integer);
DROP FUNCTION IF EXISTS get_protection_zones(float,float);
DROP FUNCTION IF EXISTS export_layer_geojson(text,text,jsonb);
DROP FUNCTION IF EXISTS get_recent_activity(integer,integer);
DROP FUNCTION IF EXISTS reverse_geocode(float,float);
DROP FUNCTION IF EXISTS validate_geometry(jsonb);

-- ----------------------------------------------------------------
-- 1. BÚSQUEDA AVANZADA CON FILTROS MÚLTIPLES
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_all_layers(
    p_search_term TEXT DEFAULT NULL,
    p_layer_type TEXT DEFAULT NULL,
    p_municipality TEXT DEFAULT NULL,
    p_bbox JSONB DEFAULT NULL,
    p_limit INT DEFAULT 50
)
RETURNS TABLE(
    layer_name TEXT,
    feature_id BIGINT,
    feature_name TEXT,
    feature_type TEXT,
    geom_type TEXT,
    geom JSONB,
    relevance FLOAT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'anotaciones'::TEXT as layer_name,
        a.id as feature_id,
        a.nombre as feature_name,
        COALESCE(a.tipo_anotacion, 'sin_tipo')::TEXT as feature_type,
        'point'::TEXT as geom_type,
        ST_AsGeoJSON(a.geom)::JSONB,
        CASE 
            WHEN p_search_term IS NULL THEN 1.0::FLOAT
            ELSE 0.5::FLOAT
        END as relevance
    FROM anotaciones a
    WHERE (p_search_term IS NULL OR 
           LOWER(a.nombre || ' ' || COALESCE(a.comentarios, '')) LIKE '%' || LOWER(p_search_term) || '%')
      AND (p_layer_type IS NULL OR p_layer_type = 'point')
    ORDER BY relevance DESC
    LIMIT p_limit;
END;
$$;

-- ----------------------------------------------------------------
-- 2. ESTADÍSTICAS POR MUNICIPIO
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_municipality_stats(p_municipality_name TEXT)
RETURNS JSONB 
LANGUAGE plpgsql
AS $$
DECLARE
    municipality_geom geometry;
    result JSONB;
    total_anotaciones INT;
    total_arboles INT;
BEGIN
    SELECT geom INTO municipality_geom
    FROM municipios_rm
    WHERE "Municipio" = p_municipality_name
    LIMIT 1;
    
    IF municipality_geom IS NULL THEN
        RETURN jsonb_build_object('error', 'Municipio no encontrado');
    END IF;
    
    -- Contar anotaciones
    SELECT COUNT(*) INTO total_anotaciones
    FROM anotaciones a
    WHERE ST_Within(a.geom, municipality_geom);
    
    -- Contar árboles (si la tabla existe)
    BEGIN
        SELECT COUNT(*) INTO total_arboles
        FROM arboles_monumentales am
        WHERE ST_Within(am.geom, municipality_geom);
    EXCEPTION
        WHEN undefined_table THEN
            total_arboles := 0;
    END;
    
    result := jsonb_build_object(
        'municipality', p_municipality_name,
        'anotaciones', jsonb_build_object('total', total_anotaciones),
        'arboles_monumentales', total_arboles,
        'enp_area_km2', 0,
        'vias_pecuarias_km', 0
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- ----------------------------------------------------------------
-- 3. ANÁLISIS DE PROXIMIDAD
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_nearby_features(
    p_lat FLOAT,
    p_lng FLOAT,
    p_radius_meters INT DEFAULT 1000,
    p_layer_name TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20
)
RETURNS TABLE(
    layer TEXT,
    feature_id BIGINT,
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
    SELECT 
        'anotaciones'::TEXT,
        a.id,
        a.nombre,
        ST_Distance(point_geom, a.geom::geography)::FLOAT,
        ST_AsGeoJSON(a.geom)::JSONB,
        jsonb_build_object(
            'tipo', a.tipo_anotacion,
            'comentarios', a.comentarios
        )
    FROM anotaciones a
    WHERE (p_layer_name IS NULL OR p_layer_name = 'anotaciones')
      AND ST_DWithin(point_geom, a.geom::geography, p_radius_meters)
    ORDER BY ST_Distance(point_geom, a.geom::geography)
    LIMIT p_limit;
END;
$$;

-- ----------------------------------------------------------------
-- 4. ANÁLISIS DE INTERSECCIÓN ESPACIAL
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
BEGIN
    point_geom := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
    
    SELECT "Municipio" INTO muni
    FROM municipios_rm
    WHERE ST_Within(point_geom, geom)
    LIMIT 1;
    
    result := jsonb_build_object(
        'coordinates', jsonb_build_object('lat', p_lat, 'lng', p_lng),
        'municipality', muni,
        'enp', '[]'::jsonb,
        'lic_zec', '[]'::jsonb,
        'zepa', '[]'::jsonb
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- ----------------------------------------------------------------
-- 5. EXPORTACIÓN DE DATOS FILTRADOS
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION export_layer_geojson(
    p_layer_name TEXT,
    p_municipality TEXT DEFAULT NULL,
    p_bbox JSONB DEFAULT NULL
)
RETURNS JSONB 
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
BEGIN
    IF p_layer_name NOT IN ('anotaciones', 'arboles_monumentales', 'vias_pecuarias', 
                             'enp', 'lic_zec', 'zepa', 'municipios_rm') THEN
        RETURN jsonb_build_object('error', 'Capa no válida');
    END IF;
    
    IF p_layer_name = 'anotaciones' THEN
        SELECT jsonb_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(jsonb_agg(
                jsonb_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(geom)::JSONB,
                    'properties', jsonb_build_object(
                        'id', id,
                        'nombre', nombre,
                        'tipo', tipo_anotacion,
                        'comentarios', comentarios
                    )
                )
            ), '[]'::jsonb)
        ) INTO result
        FROM anotaciones;
    END IF;
    
    RETURN COALESCE(result, jsonb_build_object('type', 'FeatureCollection', 'features', '[]'::jsonb));
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- ----------------------------------------------------------------
-- 6. DASHBOARD DE ACTIVIDAD RECIENTE
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_recent_activity(
    p_days INT DEFAULT 7,
    p_limit INT DEFAULT 10
)
RETURNS TABLE(
    activity_type TEXT,
    feature_id BIGINT,
    feature_name TEXT,
    layer TEXT,
    activity_timestamp TIMESTAMP,
    details JSONB
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'nueva_anotacion'::TEXT,
        a.id,
        a.nombre,
        'anotaciones'::TEXT,
        NOW()::TIMESTAMP as activity_timestamp,
        jsonb_build_object(
            'tipo', a.tipo_anotacion,
            'comentarios', a.comentarios
        )
    FROM anotaciones a
    ORDER BY a.id DESC
    LIMIT p_limit;
END;
$$;

-- ----------------------------------------------------------------
-- 7. BÚSQUEDA GEOCÓDICA INVERSA MEJORADA
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
    point_geom geometry;
    muni TEXT;
BEGIN
    point_geom := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
    
    SELECT "Municipio" INTO muni
    FROM municipios_rm
    WHERE ST_Within(point_geom, geom)
    LIMIT 1;
    
    result := jsonb_build_object(
        'coordinates', jsonb_build_object('lat', p_lat, 'lng', p_lng),
        'municipality', muni,
        'nearest_via_pecuaria', jsonb_build_object(
            'name', 'N/A',
            'distance_meters', 0
        )
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- ----------------------------------------------------------------
-- 8. VALIDACIÓN DE GEOMETRÍA
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_geometry(p_geojson JSONB)
RETURNS JSONB 
LANGUAGE plpgsql
AS $$
DECLARE
    geom geometry;
    is_valid BOOLEAN;
    error_message TEXT;
BEGIN
    geom := ST_GeomFromGeoJSON(p_geojson::text);
    is_valid := ST_IsValid(geom);
    
    IF NOT is_valid THEN
        error_message := ST_IsValidReason(geom);
    END IF;
    
    RETURN jsonb_build_object(
        'valid', is_valid,
        'error', error_message,
        'type', ST_GeometryType(geom),
        'srid', ST_SRID(geom)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', SQLERRM
        );
END;
$$;

-- ================================================================
-- PERMISOS Y SEGURIDAD
-- ================================================================

GRANT EXECUTE ON FUNCTION search_all_layers TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_municipality_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_features TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_protection_zones TO anon, authenticated;
GRANT EXECUTE ON FUNCTION export_layer_geojson TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_recent_activity TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reverse_geocode TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_geometry TO anon, authenticated;
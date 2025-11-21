-- ================================================================
-- FUNCIÓN: ESTADÍSTICAS POR MUNICIPIO
-- Calcula estadísticas precisas usando intersecciones espaciales
-- ================================================================

DROP FUNCTION IF EXISTS get_municipality_statistics(TEXT);

CREATE OR REPLACE FUNCTION get_municipality_statistics(
    p_municipality_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    municipality_geom geometry;
    municipality_area_km2 FLOAT;
    result JSONB;
BEGIN
    -- Obtener geometría del municipio
    SELECT geom INTO municipality_geom
    FROM municipios_rm
    WHERE LOWER("Municipio") = LOWER(p_municipality_name)
    LIMIT 1;
    
    IF municipality_geom IS NULL THEN
        RETURN jsonb_build_object('error', 'Municipio no encontrado');
    END IF;
    
    -- Calcular área del municipio
    municipality_area_km2 := ST_Area(municipality_geom::geography) / 1000000;
    
    -- Construir resultado con todas las estadísticas
    result := jsonb_build_object(
        'municipality', p_municipality_name,
        'area_km2', ROUND(municipality_area_km2::NUMERIC, 2),
        
        -- Árboles Monumentales
        'arboles_monumentales', jsonb_build_object(
            'count', (
                SELECT COUNT(*)
                FROM arboles_monumentales
                WHERE ST_Within(geom, municipality_geom)
            ),
            'densidad_por_km2', COALESCE(ROUND((
                SELECT COUNT(*)::NUMERIC / NULLIF(municipality_area_km2::NUMERIC, 0)
                FROM arboles_monumentales
                WHERE ST_Within(geom, municipality_geom)
            ), 2), 0),
            'items', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'nombre', COALESCE("NOMBRE", 'Sin nombre'),
                        'id', id
                    )
                ), '[]'::jsonb)
                FROM (
                    SELECT "NOMBRE", id
                    FROM arboles_monumentales
                    WHERE ST_Within(geom, municipality_geom)
                    ORDER BY "NOMBRE"
                ) subq
            )
        ),
        
        -- Vías Pecuarias
        'vias_pecuarias', jsonb_build_object(
            'count', (
                SELECT COUNT(*)
                FROM vias_pecuarias
                WHERE ST_Intersects(geom, municipality_geom)
            ),
            'longitud_km', (
                SELECT COALESCE(ROUND(SUM(
                    ST_Length(ST_Intersection(geom::geography, municipality_geom::geography)) / 1000
                )::numeric, 2), 0)
                FROM vias_pecuarias
                WHERE ST_Intersects(geom, municipality_geom)
            ),
            'items', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'nombre', nombre,
                        'longitud_km', longitud_km,
                        'id', id
                    )
                ), '[]'::jsonb)
                FROM (
                    SELECT 
                        COALESCE("VP_NB", 'Sin nombre') as nombre,
                        ROUND((ST_Length(ST_Intersection(geom::geography, municipality_geom::geography)) / 1000)::NUMERIC, 2) as longitud_km,
                        id
                    FROM vias_pecuarias
                    WHERE ST_Intersects(geom, municipality_geom)
                    ORDER BY "VP_NB"
                ) subq
            )
        ),
        
        -- ENP (Espacios Naturales Protegidos)
        'enp', jsonb_build_object(
            'count', (
                SELECT COUNT(*)
                FROM enp
                WHERE ST_Intersects(geom, municipality_geom)
            ),
            'superficie_km2', (
                SELECT COALESCE(ROUND(SUM(
                    ST_Area(ST_Intersection(geom::geography, municipality_geom::geography)) / 1000000
                )::numeric, 2), 0)
                FROM enp
                WHERE ST_Intersects(geom, municipality_geom)
            ),
            'porcentaje_protegido', COALESCE(ROUND((
                SELECT COALESCE(SUM(
                    ST_Area(ST_Intersection(geom::geography, municipality_geom::geography)) / 1000000
                ), 0) / NULLIF(municipality_area_km2::NUMERIC, 0) * 100
                FROM enp
                WHERE ST_Intersects(geom, municipality_geom)
            )::NUMERIC, 1), 0),
            'items', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'nombre', nombre,
                        'superficie_km2', superficie_km2,
                        'id', id
                    )
                ), '[]'::jsonb)
                FROM (
                    SELECT 
                        COALESCE(nombre, 'Sin nombre') as nombre,
                        ROUND((ST_Area(ST_Intersection(geom::geography, municipality_geom::geography)) / 1000000)::NUMERIC, 2) as superficie_km2,
                        id
                    FROM enp
                    WHERE ST_Intersects(geom, municipality_geom)
                    ORDER BY nombre
                ) subq
            )
        ),
        
        -- LIC/ZEC
        'lic_zec', jsonb_build_object(
            'count', (
                SELECT COUNT(*)
                FROM lic_zec
                WHERE ST_Intersects(geom, municipality_geom)
            ),
            'superficie_km2', (
                SELECT COALESCE(ROUND(SUM(
                    ST_Area(ST_Intersection(geom::geography, municipality_geom::geography)) / 1000000
                )::numeric, 2), 0)
                FROM lic_zec
                WHERE ST_Intersects(geom, municipality_geom)
            ),
            'porcentaje_protegido', COALESCE(ROUND((
                SELECT COALESCE(SUM(
                    ST_Area(ST_Intersection(geom::geography, municipality_geom::geography)) / 1000000
                ), 0) / NULLIF(municipality_area_km2::NUMERIC, 0) * 100
                FROM lic_zec
                WHERE ST_Intersects(geom, municipality_geom)
            )::NUMERIC, 1), 0),
            'items', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'nombre', nombre,
                        'superficie_km2', superficie_km2,
                        'id', id
                    )
                ), '[]'::jsonb)
                FROM (
                    SELECT 
                        COALESCE("SITE_NAME", 'Sin nombre') as nombre,
                        ROUND((ST_Area(ST_Intersection(geom::geography, municipality_geom::geography)) / 1000000)::NUMERIC, 2) as superficie_km2,
                        id
                    FROM lic_zec
                    WHERE ST_Intersects(geom, municipality_geom)
                    ORDER BY "SITE_NAME"
                ) subq
            )
        ),
        
        -- ZEPA
        'zepa', jsonb_build_object(
            'count', (
                SELECT COUNT(*)
                FROM zepa
                WHERE ST_Intersects(geom, municipality_geom)
            ),
            'superficie_km2', (
                SELECT COALESCE(ROUND(SUM(
                    ST_Area(ST_Intersection(geom::geography, municipality_geom::geography)) / 1000000
                )::numeric, 2), 0)
                FROM zepa
                WHERE ST_Intersects(geom, municipality_geom)
            ),
            'porcentaje_protegido', COALESCE(ROUND((
                SELECT COALESCE(SUM(
                    ST_Area(ST_Intersection(geom::geography, municipality_geom::geography)) / 1000000
                ), 0) / NULLIF(municipality_area_km2::NUMERIC, 0) * 100
                FROM zepa
                WHERE ST_Intersects(geom, municipality_geom)
            )::NUMERIC, 1), 0),
            'items', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'nombre', nombre,
                        'superficie_km2', superficie_km2,
                        'id', id
                    )
                ), '[]'::jsonb)
                FROM (
                    SELECT 
                        COALESCE(site_name, 'Sin nombre') as nombre,
                        ROUND((ST_Area(ST_Intersection(geom::geography, municipality_geom::geography)) / 1000000)::NUMERIC, 2) as superficie_km2,
                        id
                    FROM zepa
                    WHERE ST_Intersects(geom, municipality_geom)
                    ORDER BY site_name
                ) subq
            )
        )
    );
    
    RETURN result;
END;
$$;

COMMENT ON FUNCTION get_municipality_statistics(TEXT) IS 
'Calcula estadísticas precisas de coberturas dentro de un municipio usando intersecciones espaciales de PostGIS';

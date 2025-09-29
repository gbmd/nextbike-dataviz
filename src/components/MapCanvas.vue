<template>
    <!-- Loading indicator -->
    <div class="loading-indicator" v-if="isInitialLoading">
        <div class="spinner"></div>
        <div class="loading-text">Loading map...</div>
    </div>

    <!-- Map container with conditional class -->
    <div class="map-wrapper" :class="{ 
        'map-loaded': !isInitialLoading,
        'split-view': viewMode === 'split',
        'blocks-view': viewMode === 'blocks'
        }">

        <div ref="mapEl" class="my-map"></div>
    </div>

    <!-- Bottom zoom controls with conditional class -->
    <div
        :class="['bottom-zoom', { 'split-view-zoom': viewMode === 'split' }]"
        v-if="!isInitialLoading && viewMode !== 'blocks'">
        <ZoomControl />
</div>

</template>

<script setup>
// Define emits (this was missing)
const emit = defineEmits(['map-ready'])
import { store } from './data_store.js';
import { ref, reactive, onMounted, watch } from 'vue'
import maplibre from 'maplibre-gl'
import interact from 'interactjs'
import ZoomControl from '@/components/MainView/ZoomControl.vue'

import { touchHandler } from '@/utils/TouchInteraction'



/* ------------------------------------------------------------------ props */
const props = defineProps({
    mapSettings: { type: Object, required: true },
    initialScenario: { type: String, required: false, default: null },
    viewMode: { type: String, default: 'distributed' }
})

// Track layer visibility state
//const store.layerVisibility = reactive({})
const layerNames = reactive({}) // To store human-readable layer names
const showLegend = ref(true) // Track legend visibility per project (default: true)
const mutuallyExclusive = ref(false) // Track if layers should be mutually exclusive

// Expose method to toggle layer visibility
const toggleLayerVisibility = (layerId) => {
  if (layerId in store.layerVisibility) {
    store.layerVisibility[layerId] = !store.layerVisibility[layerId];
    
    // Toggle layer on the map
    if (map.value) {
      const layerExists = map.value.getLayer(`layer-${layerId}`);
      if (layerExists) {
        const visibility = store.layerVisibility[layerId] ? 'visible' : 'none';
        map.value.setLayoutProperty(`layer-${layerId}`, 'visibility', visibility);
      }
    }
  }
};

/* ------------------------------------------------------------------ state */
const mapEl = ref(null)
const map = ref(null)
const layers = reactive([])           // [{ id, visible }]
const currentScenario = ref(null)
const layerCache = reactive({})  // Cache for loaded GeoJSON data

const allLayerUrls = import.meta.glob('/src/projects/**/layers/*.geojson', {
    import: 'default',
    query: '?raw',
    eager: false
})

const allMetaFiles = import.meta.glob('/src/projects/**/meta.json', {
    eager: true,
    query: '?raw',
    import: 'default',
})

let lastPopup = null

// Track if this is the initial load (vs project switching)
const isInitialLoading = ref(true)

function urlBase(scenario) {
    return `/src/projects/${scenario}`
}

async function fetchJson(path) {
    console.log(`Fetching JSON from: ${path}`)
    const res = await fetch(path)
    if (!res.ok) {
        console.error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`)
        throw new Error(`fetch ${path} → ${res.status}`)
    }
    const data = await res.json()
    console.log(`Successfully fetched JSON from ${path}:`, data)
    return data
}


function addMouseEvents(layerId) {
    if (!map.value || !map.value.getLayer(layerId)) return;
    
    map.value.on('mouseenter', layerId, () => {
        map.value.getCanvas().style.cursor = 'pointer';
    });

    map.value.on('mouseleave', layerId, () => {
        map.value.getCanvas().style.cursor = '';
    });
}


let globalDesigns = null

// Load designs.json once
async function loadDesigns() {
  if (globalDesigns) return globalDesigns // cache if already loaded
  const res = await fetch('/design_map.json')
  globalDesigns = await res.json()
  return globalDesigns
}

// Apply designs to features before adding layer
const DESIGN_KEYS = new Set([
  'fill', 'fill_opacity',
  'stroke', 'stroke_opacity', 'stroke_width',
  'radius', 'size',
  // pattern-specific
  'fill_pattern', 'fill_pattern_url', 'fill_pattern_pixel_ratio'
]);

function applyDesignsToFeatures(data) {
  if (!globalDesigns) {
    console.warn('Designs not loaded yet!');
    return;
  }
  if (!data || !Array.isArray(data.features)) return;

  data.features.forEach((feature) => {
    // Always make sure properties exists
    const props = feature.properties || (feature.properties = {});
    const ftype = props.ftype;
    const designKey = props.design_key;

    const design =
      ftype && designKey &&
      globalDesigns[ftype] &&
      globalDesigns[ftype][designKey]
        ? globalDesigns[ftype][designKey]
        : null;

    if (!design) {
      // If the design doesn’t define a pattern, remove any stale pattern marker
      if (!props.fill_pattern) delete props.fill_pattern;
      return;
    }

    // Optional: keep your legacy alias; your line layer reads stroke_width anyway
    if (props.lineWidth === undefined && design.stroke_width !== undefined) {
      props.lineWidth = design.stroke_width;
    }

    // Copy only whitelisted keys; do not override explicit feature overrides
    for (const [key, value] of Object.entries(design)) {
      if (!DESIGN_KEYS.has(key)) continue;
      if (props[key] === undefined) props[key] = value;
    }

    // If the selected design has NO pattern, ensure the feature has none
    if (design.fill_pattern === undefined && props.fill_pattern !== undefined) {
      delete props.fill_pattern;
    }
  });
}

function ensureLayer(map, spec) {
  if (map.getLayer(spec.id)) {
    console.log(`Layer '${spec.id}' already exists → updating style`);
    if (spec.paint) {
      for (const [k, v] of Object.entries(spec.paint)) {
        map.setPaintProperty(spec.id, k, v);
      }
    }
    if (spec.layout) {
      for (const [k, v] of Object.entries(spec.layout)) {
        map.setLayoutProperty(spec.id, k, v);
      }
    }
  } else {
    map.addLayer(spec);
  }
}

function addPattern(map, id, src, { pixelRatio = 2, sdf = false } = {}) {
  return new Promise((resolve) => {
    try {
      if (!map || !id || !src) return resolve(false);
      if (map.hasImage && map.hasImage(id)) return resolve(true);

      const add = (img) => {
        if (!img) return resolve(false);
        const payload = img.data ? img.data : img; // MapLibre 5 returns {data:...}
        try {
          // Ensure the image has valid dimensions before adding
          if (payload.width && payload.height && payload.width > 0 && payload.height > 0) {
            map.addImage(id, payload, { pixelRatio, sdf });
            resolve(true);
          } else {
            console.warn('Invalid image dimensions for pattern:', id);
            resolve(false);
          }
        } catch (e) {
          console.warn('addImage failed', id, e);
          resolve(false);
        }
      };

      if (typeof src !== 'string') return add(src);

      const maybe = map.loadImage(src, (err, img) => {
        if (maybe && typeof maybe.then === 'function') return; // promise path will handle
        if (err) {
          console.warn('Failed to load pattern image:', src, err);
          return resolve(false);
        }
        add(img);
      });
      if (maybe && typeof maybe.then === 'function') {
        maybe.then(add).catch((err) => {
          console.warn('Pattern loading promise failed:', err);
          resolve(false);
        });
      }
    } catch (error) {
      console.warn('Pattern loading error:', error);
      resolve(false);
    }
  });
}

async function ensurePatternsFromDesignKeys(map, data) {
  await loadDesigns(); // fills globalDesigns
  const needed = new Map(); // patternId -> { url, pixelRatio }

  for (const f of (data.features || [])) {
    const props = f.properties || {};
    const key = props.design_key;
    const ftype = props.ftype || 'polygon';
    const design = globalDesigns?.[ftype]?.[key];
    if (!design) continue;

    const pid  = design.fill_pattern;
    const url  = design.fill_pattern_url;
    const pr   = Number(design.fill_pattern_pixel_ratio) || 2;

    if (pid && url && !needed.has(pid)) {
      needed.set(pid, { url, pixelRatio: pr });
    }
  }

  if (needed.size === 0) return;

  await Promise.all(
    Array.from(needed.entries()).map(([id, spec]) =>
      addPattern(map, id, spec.url, { pixelRatio: spec.pixelRatio })
    )
  );
}

async function addGeoJsonLayer(id, data) {
    console.log(`Adding GeoJSON layer '${id}'`);

    await loadDesigns();
    applyDesignsToFeatures(data);

    try {
        const features = data.features || [];
        if (!features.length) {
        console.warn(`Layer '${id}' has no features, skipping`);
        return;
        }

        const isVisible = store.layerVisibility[id] !== undefined ? store.layerVisibility[id] : true;
        const visibility = isVisible ? 'visible' : 'none';

        // --- Safe add source ---
        if (!map.value.getSource(id)) {
            map.value.addSource(id, { type: 'geojson', data });
        }

        const geomType = features[0].geometry?.type;
        console.log(`Layer '${id}' geometry type: ${geomType}`);

        if (/Point/i.test(geomType)) {
        ensureLayer(map.value, {
            id,
            type: 'circle',
            source: id,
            paint: {
            'circle-radius': ['coalesce', ['get', 'radius'], ['get', 'size'], 5],
            'circle-color': ['coalesce', ['get', 'fill'], '#007cbf'],
            'circle-stroke-width': ['coalesce', ['get', 'stroke_width'], 1],
            'circle-stroke-color': ['coalesce', ['get', 'stroke'], '#ffffff'],
            'circle-opacity': ['coalesce', ['get', 'fill_opacity'], 1]
            },
            layout: { visibility }
        });
        layers.push({ id, visible: isVisible });
        addMouseEvents(id);

        } else if (/LineString/i.test(geomType)) {
        ensureLayer(map.value, {
            id,
            type: 'line',
            source: id,
            paint: {
            'line-color': ['coalesce', ['get', 'stroke'], '#007cbf'],
            'line-width': ['coalesce', ['get', 'stroke_width'], 2]
            },
            layout: { visibility }
        });
        layers.push({ id, visible: isVisible });
        addMouseEvents(id);

        } else if (/Polygon/i.test(geomType)) {
        await ensurePatternsFromDesignKeys(map.value, data);
        // Fill
        ensureLayer(map.value, {
            id,
            type: 'fill',
            source: id,
            filter: ['!', ['has', 'fill_pattern']], // no per-feature override needed
            paint: {
            'fill-color':   ['coalesce', ['get', 'fill'], '#007cbf'],
            'fill-opacity': ['coalesce', ['get', 'fill_opacity'], 0.4]
            },
            layout: { visibility }
        });

        // Pattern fill: features WITH a pattern → use the image id
        const patternId = `${id}-pattern`;
        ensureLayer(map.value, {
            id: patternId,
            type: 'fill',
            source: id,
            filter: ['has', 'fill_pattern'],
            paint: {
            'fill-pattern': ['get', 'fill_pattern'],
            'fill-opacity': ['coalesce', ['get', 'fill_opacity'], 0.4]
            },
            layout: { visibility }
        });

        // Outline over everything
        const strokeId = `${id}-stroke`;
        ensureLayer(map.value, {
            id: strokeId,
            type: 'line',
            source: id,
            paint: {
            'line-color':   ['coalesce', ['get', 'stroke'], '#007cbf'],
            'line-width':   ['coalesce', ['get', 'stroke_width'], 2],
            'line-opacity': ['coalesce', ['get', 'stroke_opacity'], 1]
            },
            layout: { visibility }
        });

        store.layerVisibility[id] = isVisible;
        store.layerVisibility[patternId] = isVisible;
        store.layerVisibility[strokeId] = isVisible;

        layers.push({ id, visible: isVisible });
        layers.push({ id: patternId, visible: isVisible, parentId: id });
        layers.push({ id: strokeId, visible: isVisible, parentId: id });

        addMouseEvents(id);
        addMouseEvents(patternId);
        addMouseEvents(strokeId);

        } else {
        console.warn(`Unsupported geometry type '${geomType}' for layer '${id}'`);
        }

    } catch (error) {
        console.error(`Error adding layer '${id}':`, error);
  }
}

async function loadScenario(name) {
    if (lastPopup) {
        lastPopup.remove()
        lastPopup = null
    }

    if (!map.value.isStyleLoaded()) {
        console.log('Deferring loadScenario until style is loaded');
        map.value.once('load', () => loadScenario(name));
        return;
    }
    console.log(`Loading project: ${name}`)

    // Skip if it's the same scenario
    if (currentScenario.value === name) {
        console.log(`Scenario ${name} already loaded, skipping`)
        return
    }

    // Save current view state if we have a map
    const currentView = map.value ? {
        center: map.value.getCenter(),
        zoom: map.value.getZoom()
    } : null

    // Track what needs to be removed and added
    const layersToRemove = [...layers]

    // Calculate base paths
    const base = urlBase(name)
    console.log(`Base URL for scenario: ${base}`)

    // Clear layer visibility state for new scenario
    Object.keys(store.layerVisibility).forEach(key => {
        delete store.layerVisibility[key];
    });
    
    // Clear layer names
    Object.keys(layerNames).forEach(key => {
        delete layerNames[key];
    });

    // Try to load meta.json for layer configuration first
    let metaConfig = null;
    try {
        // Find the meta file in our dedicated meta glob
        console.log('Looking for meta.json to configure layers');
        const metaPath = Object.keys(allMetaFiles).find(path => path.includes(`/${name}/meta.json`));

        if (metaPath) {
            const content = allMetaFiles[metaPath];
            console.log('Found meta.json at path:', metaPath);

            if (typeof content === 'string') {
                metaConfig = JSON.parse(content);
            } else {
                metaConfig = content.default || content;
            }

            // Process layer configuration from meta.json if available
            if (metaConfig && metaConfig.layers) {
                console.log('Found layer configuration in meta.json:', metaConfig.layers);

                // Initialize layer visibility and names from meta.json
                metaConfig.layers.forEach(layer => {
                    // Use "path" as the id (removes need to specify "id" in meta.json)
                    layer.id = layer.path;

                    // IMPORTANT: visible should be exactly what's in the meta.json
                    store.layerVisibility[layer.id] = layer.visible === true; // Default to FALSE unless explicitly TRUE

                    // Always use name from meta.json if provided
                    layerNames[layer.id] = layer.name || layer.id;

                    console.log(`Setting layer '${layer.id}' initial visibility to ${store.layerVisibility[layer.id]}`);
                    console.log(`Setting layer '${layer.id}' name to '${layerNames[layer.id]}'`);
                });
            }

            // Extract legend visibility setting (default: true if not specified)
            showLegend.value = metaConfig?.showLegend !== false;
            console.log(`Setting legend visibility for '${name}' to ${showLegend.value}`);
            
            // Extract mutually exclusive setting (default: false if not specified)
            mutuallyExclusive.value = metaConfig?.mutuallyExclusive === true;
            console.log(`Setting mutually exclusive mode for '${name}' to ${mutuallyExclusive.value}`);
        } else {
            console.warn(`No meta.json found for scenario '${name}'`);
            showLegend.value = true; // Default to visible when no meta.json
            mutuallyExclusive.value = false; // Default to false when no meta.json
        }
    } catch (err) {
        console.error('Error loading meta.json layer configuration:', err);
        // Continue with default behavior if meta.json parsing fails
    }

    // Filter geojson files for the new scenario
    const prefix = `/src/projects/${name}/`
    const geojsonFiles = Object.keys(allLayerUrls)
        .filter(p => p.startsWith(prefix))
        .map(p => ({
            path: p,
            filename: p.split('/').pop(),
            id: p.replace(prefix, '')
        }))
    console.log(`Found ${geojsonFiles.length} GeoJSON files for scenario '${name}':`,
        geojsonFiles.map(f => f.filename))

    if (geojsonFiles.length === 0) {
        console.warn(`No GeoJSON layers found for scenario: ${name}`)
        console.log('Available layer paths:', Object.keys(allLayerUrls))
        return
    }

    // First remove all existing layers and sources
    console.log(`Removing ${layersToRemove.length} existing layers and sources`)
    for (const layer of layersToRemove) {
        try {
            if (map.value.getLayer(layer.id)) {
                console.log(`Removing layer '${layer.id}'`)
                map.value.removeLayer(layer.id)
            }
        } catch (error) {
            console.error(`Error removing layer/source '${layer.id}':`, error)
        }
    }

    // Clear layer array
    layers.splice(0)

    // Process all files and collect their data first
    const layersToAdd = []
    // Track which layers are parent layers (with split geometries)
    const parentLayers = new Set();

    for (const fileInfo of geojsonFiles) {
        try {
            console.log(`Processing GeoJSON file: ${fileInfo.filename}`)

            // const content = allLayerUrls[fileInfo.path]
            const module = await allLayerUrls[fileInfo.path]()
            const content = JSON.parse(module)

            // Use cached data if available
            let data
            if (layerCache[fileInfo.path]) {
                console.log(`Using cached data for ${fileInfo.filename}`)
                data = layerCache[fileInfo.path]
            } else {
                // Process the content based on its type
                if (typeof content === 'string') {
                    data = JSON.parse(content)
                } else if (content && typeof content === 'object') {
                    data = content.default || content
                } else {
                    console.error(`Unexpected content format for ${fileInfo.filename}:`, content)
                    continue
                }

                // Validate the data
                if (!data || !data.type || !data.features) {
                    console.error(`Invalid GeoJSON structure for ${fileInfo.filename}:`, data)
                    continue
                }

                // Cache the data for future use
                layerCache[fileInfo.path] = data
            }

            console.log(`Processed ${fileInfo.filename} with ${data.features?.length || 0} features`)

            // FIX: Check for layer config, default to visible if not specified
            if (store.layerVisibility[fileInfo.id] === undefined) {
                const layerConfig = metaConfig?.layers?.find(l => l.id === fileInfo.id);
                // Default to TRUE unless explicitly set to false
                store.layerVisibility[fileInfo.id] = layerConfig ? (layerConfig.visible !== false) : true;
                console.log(`Setting default visibility for '${fileInfo.id}' to ${store.layerVisibility[fileInfo.id]}`);
            }
            
            // FIX: Use the filename as fallback, but prefer the name from meta.json if available
            if (layerNames[fileInfo.id] === undefined) {
                const layerConfig = metaConfig?.layers?.find(l => l.id === fileInfo.id);
                layerNames[fileInfo.id] = layerConfig?.name || fileInfo.id;
                console.log(`Setting name for '${fileInfo.id}' to '${layerNames[fileInfo.id]}'`);
            }

            // Handle mixed geometry types
            const hasPoints = data.features.some(f => f.geometry && /Point/i.test(f.geometry.type))
            const hasPolygons = data.features.some(f => f.geometry && /Polygon/i.test(f.geometry.type))
            const hasLines = data.features.some(f => f.geometry && /LineString/i.test(f.geometry.type))

            if ((hasPoints && hasPolygons) || (hasPoints && hasLines) || (hasPolygons && hasLines)) {
                console.log(`Layer '${fileInfo.id}' has mixed geometry types, splitting into separate layers`)
                // Mark this as a parent layer
                parentLayers.add(fileInfo.id);
                
                // Store the parent's visibility status that will be used for all children
                const parentVisibility = store.layerVisibility[fileInfo.id];
                console.log(`Parent layer '${fileInfo.id}' visibility is ${parentVisibility}, will apply to split layers`);                
                
                if (hasPolygons) {
                    const polygonData = {
                        type: 'FeatureCollection',
                        features: data.features.filter(f => f.geometry && /Polygon/i.test(f.geometry.type))
                    }
                    const polygonId = `${fileInfo.id}-polygons`;
                    layersToAdd.push({ id: polygonId, data: polygonData, parentId: fileInfo.id })
                    
                    // Set child visibility to match parent
                    store.layerVisibility[polygonId] = parentVisibility;
                    layerNames[polygonId] = `${layerNames[fileInfo.id]} - Areas`;
                    console.log(`Split layer '${polygonId}' visibility set to ${store.layerVisibility[polygonId]}`);
                }
                
                if (hasLines) {
                    const lineData = {
                        type: 'FeatureCollection',
                        features: data.features.filter(f => f.geometry && /LineString/i.test(f.geometry.type))
                    }
                    const lineId = `${fileInfo.id}-lines`;
                    layersToAdd.push({ id: lineId, data: lineData, parentId: fileInfo.id })
                    
                    // Set child visibility to match parent
                    store.layerVisibility[lineId] = parentVisibility;
                    layerNames[lineId] = `${layerNames[fileInfo.id]} - Lines`;
                    console.log(`Split layer '${lineId}' visibility set to ${store.layerVisibility[lineId]}`);
                }

                if (hasPoints) {
                    const pointData = {
                        type: 'FeatureCollection',
                        features: data.features.filter(f => f.geometry && /Point/i.test(f.geometry.type))
                    }
                    const pointId = `${fileInfo.id}-points`;
                    layersToAdd.push({ id: pointId, data: pointData, parentId: fileInfo.id })
                    
                    // Set child visibility to match parent
                    store.layerVisibility[pointId] = parentVisibility;
                    layerNames[pointId] = `${layerNames[fileInfo.id]} - Points`;
                    console.log(`Split layer '${pointId}' visibility set to ${store.layerVisibility[pointId]}`);
                }
            } else {
                // This is a regular layer with single geometry type
                layersToAdd.push({ id: fileInfo.id, data })
                console.log(`Regular layer '${fileInfo.id}' added with visibility ${store.layerVisibility[fileInfo.id]}`);
            }
        } catch (error) {
            console.error(`Error processing GeoJSON file ${fileInfo.filename}:`, error)
        }
    }

    // Now add all layers to map
    console.log(`Adding ${layersToAdd.length} layers to map`)
    for (const layer of layersToAdd) {
        try {
            await addGeoJsonLayer(layer.id, layer.data)
            
            // FIX: Immediately set the correct visibility based on our state
            if (map.value.getLayer(layer.id)) {
                const isVisible = store.layerVisibility[layer.id];
                const visibility = isVisible ? 'visible' : 'none';
                console.log(`Setting initial visibility for layer '${layer.id}' to ${visibility}`);
                map.value.setLayoutProperty(layer.id, 'visibility', visibility);
                
                // Update the layer object in the layers array too
                const layerObj = layers.find(l => l.id === layer.id);
                if (layerObj) {
                    layerObj.visible = isVisible;
                }
            }
            
            // Store parent-child relationship for split layers
            if (layer.parentId) {
                layers[layers.length - 1].parentId = layer.parentId;
            }
        } catch (error) {
            console.error(`Failed to add layer ${layer.id} to map:`, error)
        }
    }

    console.log(`All layers loaded for scenario '${name}', total: ${layers.length}`);
    console.log('Final layer visibility state:', store.layerVisibility);
    console.log('Final layer names:', layerNames);

    // Try to load metadata for centering
    try {
        console.log('Attempting to load meta.json for map positioning')

        // Use cached meta if available
        if (metaConfig && metaConfig.center && metaConfig.zoom !== undefined) {
            console.log(`Setting map view from meta.json: center=${metaConfig.center}, zoom=${metaConfig.zoom}, minZoom=${metaConfig.minZoom || 10}`)
            map.value.setMinZoom(metaConfig.minZoom || 10);
            map.value.jumpTo({ center: metaConfig.center, zoom: metaConfig.zoom})
        } else if (currentView) {
            map.value.jumpTo(currentView)
        }
    } catch (err) {
        console.error('Error positioning map:', err)
        if (currentView) {
            map.value.jumpTo(currentView)
        }
    }

    // Update current scenario
    currentScenario.value = name

    console.log('Map state after loading scenario:')
    console.log('- Center:', map.value.getCenter())
    console.log('- Zoom:', map.value.getZoom())
    console.log('- Layers:', layers)
    console.log('- Layer visibility:', store.layerVisibility)
    console.log('- Parent layers:', Array.from(parentLayers))
    
    // Emit ready event to signal that the scenario is loaded
    emit('map-ready');
}

function fitMapToBounds() {
    // If no meta.json, try to fit the map to the layers
    if (layers.length > 0 && map.value.getSource(layers[0].id)) {
        try {
            console.log('Fitting map to layer bounds')
            // Try to fit bounds to the first layer's data
            const bounds = new maplibre.LngLatBounds()
            const source = map.value.getSource(layers[0].id)
            const data = source._data

            if (data && data.features && data.features.length > 0) {
                // Calculate bounds from features
                console.log(`Calculating bounds from ${data.features.length} features`)
                data.features.forEach(feature => {
                    if (feature.geometry.type === 'Point') {
                        bounds.extend(feature.geometry.coordinates)
                    } else if (feature.geometry.coordinates && feature.geometry.coordinates.length > 0) {
                        feature.geometry.coordinates.forEach(coord => {
                            if (Array.isArray(coord[0])) {
                                coord.forEach(c => bounds.extend(c))
                            } else {
                                bounds.extend(coord)
                            }
                        })
                    }
                })

                console.log('Fitting map to bounds:', bounds)
                map.value.fitBounds(bounds, { padding: 50 })
            } else {
                console.warn('No features found in the first layer to calculate bounds')
            }
        } catch (boundsError) {
            console.warn("Couldn't fit map to layer bounds:", boundsError)
        }
    } else {
        console.warn('No layers available to fit bounds')
    }
}

function debugLayerState(tag, id) {
  const strokeId = `${id}-stroke`;
  const hasMain = !!map.value?.getLayer(id);
  const hasStroke = !!map.value?.getLayer(strokeId);
  const visMain = hasMain ? map.value.getLayoutProperty(id, 'visibility') : '(no layer)';
  const visStroke = hasStroke ? map.value.getLayoutProperty(strokeId, 'visibility') : '(no layer)';
  const regMain = store.layerVisibility[id];
  const regStroke = store.layerVisibility[strokeId];

  console.group(`[${tag}] ${id}`);
  console.log('exists:', { main: hasMain, stroke: hasStroke });
  console.log('map visibility:', { main: visMain, stroke: visStroke });
  console.log('registry visibility:', { main: regMain, stroke: regStroke });
  console.log('layers[] entries:', {
    main: layers.find(l => l.id === id) || null,
    stroke: layers.find(l => l.id === strokeId) || null
  });
  console.groupEnd();
}

function toggleLayer(layerId) {
    console.log(`Toggling layer '${layerId}'`);
    
    // Check if this is a parent ID with split children
    const childLayers = Object.keys(store.layerVisibility).filter(id =>
        id.startsWith(layerId + '-') &&
        (id.endsWith('-points') || id.endsWith('-lines') || id.endsWith('-polygons') ) 
    );
    
    if (childLayers.length > 0) {
        // This is a parent layer with split children
        console.log(`Found ${childLayers.length} child layers for '${layerId}'`);
        
        // Determine the new visibility state (based on opposite of current state)
        // If any child is visible, we'll make all invisible. Otherwise make all visible.
        const anyVisible = childLayers.some(childId => store.layerVisibility[childId]);
        const newVisibility = !anyVisible;
        
        // Toggle all children
        let success = true;
        childLayers.forEach(childId => {
            store.layerVisibility[childId] = newVisibility;
            
            // Find the layer in layers array too
            const layerObj = layers.find(l => l.id === childId);
            if (layerObj) {
                layerObj.visible = newVisibility;
            }
            
            // Apply visibility to the map
            if (map.value && map.value.getLayer(childId)) {
                const visibility = newVisibility ? 'visible' : 'none';
                map.value.setLayoutProperty(childId, 'visibility', visibility);
                
                // ALSO handle stroke layers for polygon children
                const strokeId = `${childId}-stroke`;
                if (map.value.getLayer(strokeId)) {
                    console.log(`Also toggling stroke layer '${strokeId}' to ${visibility}`);
                    map.value.setLayoutProperty(strokeId, 'visibility', visibility);
                    
                    // Update stroke layer visibility in registry
                    store.layerVisibility[strokeId] = newVisibility;
                    const strokeObj = layers.find(l => l.id === strokeId);
                    if (strokeObj) {
                        strokeObj.visible = newVisibility;
                    }
                }
            } else {
                console.warn(`Child layer '${childId}' not found on map`);
                success = false;
            }
        });
        
        return success;
    }
    
    // Standard layer toggling (existing logic)
    if (layerId in store.layerVisibility) {
        debugLayerState('BEFORE TOGGLE', layerId)
        // Toggle visibility state
        store.layerVisibility[layerId] = !store.layerVisibility[layerId];
        
        // Find the layer in layers array too
        const layerObj = layers.find(l => l.id === layerId);
        if (layerObj) {
            layerObj.visible = store.layerVisibility[layerId];
        }
        
        const visibility = store.layerVisibility[layerId] ? 'visible' : 'none';
        console.log(`Setting visibility of layer '${layerId}' to ${visibility}`);
        
        // Apply the visibility change to the map
        if (map.value && map.value.getLayer(layerId)) {
            map.value.setLayoutProperty(layerId, 'visibility', visibility);

            // 🔹 NEW: sync polygon outline if it exists
            const strokeId = `${layerId}-stroke`;
            if (map.value.getLayer(strokeId)) {
            map.value.setLayoutProperty(strokeId, 'visibility', visibility);

            // keep registries aligned
            store.layerVisibility[strokeId] = store.layerVisibility[layerId];
            const strokeObj = layers.find(l => l.id === strokeId);
            if (strokeObj) {
                strokeObj.visible = store.layerVisibility[strokeId];
            } else {
                layers.push({ id: strokeId, visible: store.layerVisibility[strokeId], parentId: layerId });
            }
            }

            return true; // Successfully toggled
        } else {
            console.warn(`Layer '${layerId}' not found on map`);
            return false;
        }
    }
}

const isStrokeId = (id) => id.endsWith('-stroke');

function getLayerInfo() {
    console.log('getLayerInfo called');
    console.log('Current store.layerVisibility:', store.layerVisibility);
    console.log('Current layerNames:', layerNames);
    
    // Create a map to track original layer parents
    const parentLayers = {};
    const layerGroups = {};
    
    // First pass - identify parent layers and group split layers
    Object.keys(store.layerVisibility).forEach(id => {
        if (isStrokeId(id)) return;
        // Check if this is a split layer (ends with -points, -lines, -polygons)
        const match = id.match(/(.+)-(points|lines|polygons)$/);
        if (match) {
            const parentId = match[1];
            // Mark this as part of a parent layer
            parentLayers[id] = parentId;
            
            // Initialize the group if it doesn't exist
            if (!layerGroups[parentId]) {
                layerGroups[parentId] = {
                    id: parentId,
                    name: layerNames[parentId] || parentId,
                    visible: true, // Will check children in the next step
                    isGroup: true,
                    children: []
                };
            }
            
            // Add this layer to its parent group
            layerGroups[parentId].children.push({
                id: id,
                type: match[2],
                visible: store.layerVisibility[id]
            });
            
            // If any child is not visible, the group is not fully visible
            if (!store.layerVisibility[id]) {
                layerGroups[parentId].visible = false;
            }
        }
    });
    
    // Now create the final layer list
    const result = Object.keys(store.layerVisibility)
        .filter(id => {
            if (isStrokeId(id)) return false; 
            // if (isPatternId(id)) return false;
            // Keep only non-split layers or parent layers
            return !parentLayers[id] || layerGroups[id];
        })
        .map(id => {
            // If this is a parent layer that has split children, use the group info
            if (layerGroups[id]) {
                return layerGroups[id];
            }
            
            // Otherwise, return regular layer info
            return {
                id,
                name: layerNames[id] || id,
                visible: store.layerVisibility[id]
            };
        });
    return result;
}

defineExpose({ 
    loadScenario, 
    toggleLayer, 
    getLayerInfo,
    getLegendVisibility: () => showLegend.value,
    getMutuallyExclusive: () => mutuallyExclusive.value,
    map 
});
// const previousVisibility = { ...store.layerVisibility };
// // Replace lines 736-773 with this simplified initialization
// watch(
//   () => store.layerVisibility,
//   (newVal) => {
//     for (const key in newVal) {
//       if (previousVisibility[key] !== newVal[key]) {
//         // Nur wenn sich der Wert geändert hat, toggleLayer aufrufen
//         toggleLayer(key);
//         previousVisibility[key] = newVal[key];
//       }
//     }
//   },
//   { deep: true }
// );
onMounted(() => {
    // console.log('MapCanvas mounted, initializing map')
    const opts = { ...props.mapSettings, container: mapEl.value }
    // console.log('Map options:', opts)

    map.value = new maplibre.Map(opts)
    // console.log('MapLibre map created')


    touchHandler.addScroll('.maplibre-popup-content', (action, target, delta, startEvent) => {
        if (action == "scroll") {
            const dx = delta.x * 1.5;
            const dy = delta.y * 1.5;
            target.scrollTop = target.scrollTop - dy;
        }
    })

    map.value.on('load', async () => {
        // console.log('Map loaded and ready')

        // Set up zoom controls
        interact('.zoom-in').on('tap', () => {
            const newZoom = map.value.getZoom() + 0.5
            // console.log(`Zooming in to ${newZoom}`)
            map.value.zoomTo(newZoom)
        })
        interact('.zoom-out').on('tap', () => {
            const newZoom = map.value.getZoom() - 0.5
            // console.log(`Zooming out to ${newZoom}`)
            map.value.zoomTo(newZoom)
        })

        map.value.on('click', (e) => {
            if (lastPopup) lastPopup.remove();

            //Query all rendered features at the clicked point
            const features = map.value.queryRenderedFeatures(e.point);
            // Find the first feature with a popup
            const feature = features.find(f => f.properties && f.properties.popup);
            if (feature) {
                // Calculate center of geometry
                let coordinates;
                if (feature.geometry.type === 'Point') {
                    coordinates = feature.geometry.coordinates;
                } else if (feature.geometry.type === 'Polygon') {
                    // Calculate centroid for polygon (simple average)
                    const coords = feature.geometry.coordinates[0];
                    let lngSum = 0, latSum = 0;
                    coords.forEach(([lng, lat]) => {
                        lngSum += lng;
                        latSum += lat;
                    });
                    coordinates = [lngSum / coords.length, latSum / coords.length];
                } else if (feature.geometry.type === 'LineString') {
                    // Use midpoint for linestring
                    const coords = feature.geometry.coordinates;
                    const midIdx = Math.floor(coords.length / 2);
                    coordinates = coords[midIdx];
                } else {
                    // fallback to click location
                    coordinates = [e.lngLat.lng, e.lngLat.lat];
                }
                const popupContent = document.createElement('div');
                popupContent.className = 'map-popup-outer';
                popupContent.innerHTML = feature.properties.popup;
                lastPopup = new maplibre.Popup({
                    closeButton: false,
                    closeOnClick: false,
                    offset: [0, -10],
                    anchor: 'bottom',
                    maxWidth: "25vw",
                    className: 'map-popup'
                })
                    .setLngLat(coordinates)
                    .setDOMContent(popupContent)
                    .addTo(map.value);
            }
        })

        // If initialScenario is provided, load it
        if (props.initialScenario) {
            await loadScenario(props.initialScenario)
        }

        // Mark loading as complete - only happens once
        isInitialLoading.value = false

        // Emit an event that the map is ready
        emit('map-ready')
    })
    
})
</script>

<style scoped>
/* Add these styles */
.loading-indicator {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #f0f2f5;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.spinner {
    width: 50px;
    height: 50px;
    border: 5px solid rgba(0, 97, 195, 0.2);
    border-top: 5px solid #0061C3;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

.loading-text {
    margin-top: 15px;
    font-size: 18px;
    color: #0061C3;
}

.map-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    /* -- no transform overrides here! -- */
}

.my-map {
    width: 100%;
    height: 100%;
    /* let MapLibre manage its own transforms */
}

/* Only use transition for initial load */
.map-wrapper:not(.map-loaded) {
    opacity: 0;
}

.map-wrapper.map-loaded {
    opacity: 1;
    transition: opacity 0.5s ease;
}

@keyframes fade-in {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

/* Ensure the map has proper dimensions from the start */

.bottom-zoom {
    width: 60vw;
    height: fit-content;
    position: fixed;
    left: 50%;
    bottom: 2vh;
    transform: translateX(-50%);
    display: flex;
    justify-content: space-between;
    z-index: 3;
}

.bottom-zoom.split-view-zoom {
  width: 40vw;
  left: 66.7%; /* Change from 75% to 66.7% (center of map area) */
  transform: translateX(-50%);
  bottom: 2vh; /* Keep this adjustment for positioning below the carousel */
}

/* Map wrapper for split view */
.map-wrapper.split-view {
    width: 66.7%;
    left: 33.3%;
}

.map-wrapper.blocks-view {
  position: relative;
  width: 100%;
  height: 100%;
}

.my-map {
  width: 100%;
  height: 100%;
}
</style>

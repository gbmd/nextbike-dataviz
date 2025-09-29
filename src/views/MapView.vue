<script setup>
import { computed, ref, watch, onMounted, onUpdated, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { defineAsyncComponent } from 'vue'
import '@nanoandrew4/vue3-carousel-3d/dist/style.css'

import CustomPanelContainer from '@/projects/nextbike/CustomPanelContainer.vue'
import ZoomControl from '@/components/MainView/ZoomControl.vue'
import LayerControl from '@/components/LayerControl.vue'
import MapCanvas from '@/components/MapCanvas.vue'
import MapLegend from '@/components/MapLegend.vue'
import { MapboxOverlay } from "@deck.gl/mapbox";
import { FlowmapLayer } from "@flowmap.gl/layers";
import { getViewStateForLocations } from "@flowmap.gl/data";
import { csv } from "d3-fetch";
import { getPrimaryBannerUrl, getFallbackBannerUrl } from '@/utils/bannerUtils'

// ----------------------------------------
// Import project metadata and custom panels
// ----------------------------------------

// Eagerly import all CustomPanelContainer.vue files in projects
const customPanelContainers = import.meta.glob(
  '@/projects/**/*PanelContainer.vue',
  { eager: true }
)

// Scan each project folder for meta.json (eagerly loaded)
const metaFiles = import.meta.glob('@/projects/**/meta.json', { eager: true })

// Default map settings (static configuration) 
const mapSettings = {
  style: `https://tiles.openfreemap.org/styles/liberty`,
  center: [11.576124, 48.137154],
  zoom: 11,
  minZoom: 10,
  maxZoom: 18,
  attributionControl: false
}


// ----------------------------------------
// Reactive state and computed properties
// ----------------------------------------
const router = useRouter()
const route = useRoute()

// View mode: 'distributed' or 'blocks', persisted to localStorage
const viewMode = 'blocks'

// List of all projects: id, title, thumbnail
const projects = Object.entries(metaFiles)
  .map(([path, mod]) => {
    const id = path.split('/').slice(-2, -1)[0]
    return {
      id,
      title: mod.default?.title ?? id,
      // Vite-compatible asset path with carousel priority
      thumbnail: getPrimaryBannerUrl(id, 'carousel'),
      thumbnailFallback: getFallbackBannerUrl(id)
    }
  })
  .sort((a, b) => a.id.localeCompare(b.id))

// Extract route-based project ID
const projectId = computed(() => route.params.id)

// Currently active scenario ID (string) and index (number)
const activeScenario = ref(null)
const activeIdx = ref(0)

// Computed title and file name for the scenario panels
const scenarioTitle = computed(() => projects[activeIdx.value]?.title || '')
const scenarioFile = computed(() => activeScenario.value)

// Carousel reactive index and ref
const carouselActiveIndex = ref(null)
const carousel3dRef = ref(null)

// Map reference and layer info
const mapRef = ref(null)
const mapLayers = ref([])
const shouldShowLegend = ref(true) // Track if legend should be visible for current project

// Banner style for blocks view
const bannerStyle = computed(() => ({
  backgroundColor: '#f5f5f5', // or any consistent color
  minHeight: '100vh',
  padding: '2rem'
}))

// ----------------------------------------
// Functions: Navigation, view mode, projects

function findProjectIndex(id) {
  return projects.findIndex((project) => project.id === id)
}

function findProjectId(index) {
  if (index < 0 || index >= projects.length) return null
  return projects[index].id
}

function prevScenario() {
  activeIdx.value = (activeIdx.value - 1 + projects.length) % projects.length
}

function nextScenario() {
  activeIdx.value = (activeIdx.value + 1) % projects.length
}

function updateCarouselPosition(index) {
  if (!carousel3dRef.value) return

  if (typeof carousel3dRef.value.goToSlide === 'function') {
    carousel3dRef.value.goToSlide(index)
  }
  if (carousel3dRef.value.currentIndex !== undefined) {
    carousel3dRef.value.currentIndex = index
  }
}

// ----------------------------------------
// Functions: Map and layer control
// ----------------------------------------
function updateLayerInfo() {
  if (mapRef.value && mapRef.value.getLayerInfo) {
    // console.log('Updating layer info from map')
    mapLayers.value = mapRef.value.getLayerInfo() || []
  } else {
    console.warn(
      'Cannot update layer info – map reference or getLayerInfo missing'
    )
  }
}

let deckOverlayInstance = null;

function handleLoadFlowMap(flowsURL, locationsURL) {
  // console.log('Load flow map event triggered');
  let map = mapRef.value.map;
  map.interactive = false;

  async function fetchData() {
    return await Promise.all([
      csv(locationsURL, (row, i) => ({
        id: row.id,
        name: row.name,
        lat: Number(row.lat),
        lon: Number(row.lon),
      })),
      csv(flowsURL, (row) => ({
        origin: row.id_start,
        dest: row.id_end,
        count: Number(row.count),
      })),
    ]).then(([locations, flows]) => ({ locations, flows }));
  }

  fetchData().then((data) => {
    const { locations, flows } = data;
    const [width, height] = [globalThis.innerWidth, globalThis.innerHeight];
    const initialViewState = getViewStateForLocations(
      locations,
      (loc) => [loc.lon, loc.lat],
      [width, height],
      { pad: 0.3 }
    );

    // Remove existing deckOverlay if present
    if (deckOverlayInstance && map) {
      try {
        map.removeControl(deckOverlayInstance);
        // console.log('Removed existing deckOverlay control');
      } catch (err) {
        console.warn('Error removing existing deckOverlay control:', err);
      }
      deckOverlayInstance = null;
    }

    deckOverlayInstance = new MapboxOverlay({
      interleaved: true, // keeps rendering order clean
      layers: [
        new FlowmapLayer({
          id: 'my-flowmap-layer',
          data: { locations, flows },
          pickable: true,
          getLocationId: (loc) => loc.id,
          getLocationLat: (loc) => loc.lat,
          getLocationLon: (loc) => loc.lon,
          getFlowOriginId: (flow) => flow.origin,
          getFlowDestId: (flow) => flow.dest,
          getFlowMagnitude: (flow) => flow.count,
          getLocationName: (loc) => loc.name,
          clusteringEnabled: true,
          clusteringAuto: true,
          fadeEnabled: true,
          fadeOpacityEnabled: true,
          fadeAmount: 50,
          animationEnabled: true,
          adaptiveScalesEnabled: true,
          locationsEnabled: true,
          locationTotalsEnabled: true,
          locationLabelsEnabled: false,
          darkMode: false,
        }),
      ],
    });
    map.addControl(deckOverlayInstance);
  });
}


function handleJumpTo(lon, lat, zoom) {
  let map = mapRef.value.map;
  map.jumpTo({
    center: [lon, lat],
    zoom: zoom || 9, // Default zoom if not specified
  });

}

function handleMapReady() {
  // console.log('Map ',projectId, ' is ready, updating layer info')
  updateLayerInfo()
  updateLegendVisibility()
  // loadFlowMap()
}

function updateLegendVisibility() {
  if (mapRef.value && typeof mapRef.value.getLegendVisibility === 'function') {
    shouldShowLegend.value = mapRef.value.getLegendVisibility()
    // console.log('Updated legend visibility:', shouldShowLegend.value)
  }
}


function handleMapFilter(id, filter, value) {
  // console.log('Updating layer filter configuration', id, filter, value)
  // console.log(mapRef.value)
  mapRef.value.map.setFilter(id, filter, value);
}

function handleLayerToggle(layerId) {
  if (mapRef.value) {
    // Check if mutually exclusive mode is enabled
    const isMutuallyExclusive = mapRef.value.getMutuallyExclusive && mapRef.value.getMutuallyExclusive();

    if (isMutuallyExclusive) {
      // Get current layer info to check current state
      const currentLayers = mapRef.value.getLayerInfo() || [];
      const targetLayer = currentLayers.find(layer => layer.id === layerId);

      if (targetLayer && !targetLayer.visible) {
        // Layer is currently off and being turned on
        // First turn off all other visible layers
        currentLayers.forEach(layer => {
          if (layer.id !== layerId && layer.visible) {
            // console.log(`Mutually exclusive mode: turning off layer '${layer.id}'`);
            mapRef.value.toggleLayer(layer.id);
          }
        });
      }
    }

    // Toggle the target layer
    mapRef.value.toggleLayer(layerId)
    mapLayers.value = mapRef.value.getLayerInfo() || []
  }
}

// ----------------------------------------
// Touch-swipe interaction for scenarios
// ----------------------------------------
function applyTouchInteraction(node) {
  let startX = null
  let startY = null
  let hasMoved = false

  node.el.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches && e.touches.length > 0) {
        startX = e.touches[0].clientX
        startY = e.touches[0].clientY
        hasMoved = false
        // console.log('Touch start:', startX, startY)
      }
    },
    { passive: true }
  )

  node.el.addEventListener(
    'touchmove',
    (e) => {
      if (
        startX === null ||
        startY === null ||
        !e.touches ||
        e.touches.length === 0
      )
        return

      const dx = startX - e.touches[0].clientX
      const dy = startY - e.touches[0].clientY

      // Ignore vertical scrolls
      if (Math.abs(dy) > Math.abs(dx)) return

      if (Math.abs(dx) > 5) {
        hasMoved = true
      }
    },
    { passive: true }
  )

  node.el.addEventListener(
    'touchend',
    (e) => {
      if (hasMoved && startX !== null && startY !== null) {
        const endX = e.changedTouches[0].clientX
        const dx = startX - endX
        const minSwipe = 50

        if (Math.abs(dx) >= minSwipe) {
          if (dx > 0) {
            nextScenario()
            // console.log('Swiped left, next scenario:', activeScenario.value)
          } else {
            prevScenario()
            // console.log('Swiped right, previous scenario:', activeScenario.value)
          }
          e.preventDefault()
        }
      }
      startX = null
      startY = null
      hasMoved = false
    }
  )
}

// ----------------------------------------
// Watchers: Persist view mode and synchronize state
// ----------------------------------------
watch(viewMode, (newMode) => {
  localStorage.setItem('datentischViewMode', newMode)
  // console.log('View mode changed to:', newMode)
})

// When the route param "id" changes, update carousel and active index
watch(
  () => route.params.id,
  async (newProjectId) => {
    if (!newProjectId) return

    const idx = findProjectIndex(newProjectId)
    if (idx !== -1) {
      carouselActiveIndex.value = idx
      activeIdx.value = idx

      await nextTick()
      updateCarouselPosition(idx)
    }
  },
  { immediate: true }
)

// Whenever activeIdx changes: load scenario on map and log
watch(activeIdx, (newIndex) => {
  const projectId = projects[newIndex]?.id
  if (mapRef.value?.loadScenario && projectId) {
    mapRef.value.loadScenario(projectId).then(() => {
      updateLegendVisibility()
    }).catch((err) => {
      console.error('Error loading scenario:', err)
    })
  }
  // console.log('activeIdx changed:', newIndex)
  // console.log('New active scenario:', activeScenario.value)
  // console.log('New title:', scenarioTitle.value)
  // console.log('New panel file:', scenarioFile.value)
})

// Whenever activeScenario changes: wait for mapRef then load scenario
watch(
  activeScenario,
  async (newScenario) => {
    if (!newScenario) {
      console.warn('No scenario to load')
      return
    }

    // console.log(`Watch triggered: Loading scenario ${newScenario}`)
    await nextTick()

    if (!mapRef.value) {
      console.error('Map reference is not available yet')
      return
    }
    if (typeof mapRef.value.loadScenario === 'function') {
      try {
        await mapRef.value.loadScenario(newScenario)
        updateLegendVisibility()
      } catch (err) {
        console.error('Error loading scenario:', err)
      }
    } else {
      console.warn('loadScenario method not found on map reference')
    }
  },
  { immediate: false }
)

// After activeScenario updates, update layers
watch(
  activeScenario,
  async () => {
    await nextTick()
    updateLayerInfo()
  }
)

// ----------------------------------------
// Lifecycle: mounted and updated hooks
// ----------------------------------------
onMounted(async () => {
  // console.log('MapView mounted with route params:', route.params)

  if (route.params.id) {
    const idx = findProjectIndex(route.params.id)
    // console.log('Found project index:', idx, 'for ID:', route.params.id)

    if (idx !== -1) {
      activeIdx.value = idx
      carouselActiveIndex.value = idx
      activeScenario.value = route.params.id
      // console.log(
      //   'Initialized with project:',
      //   route.params.id,
      //   'at index:',
      //   idx
      // )

      await nextTick()
      updateCarouselPosition(idx)
    } else if (projects.length > 0) {
      activeScenario.value = projects[0].id
      // console.log('Fallback to first project:', projects[0].id)
    }
  } else if (projects.length > 0) {
    activeScenario.value = projects[0].id
    // console.log('No project in route, using first:', projects[0].id)
  }
})

onUpdated(() => {
  // console.log('MapView component updated')
})

// ----------------------------------------
// Logging available projects on startup
// ----------------------------------------
/*
console.log('Found projects:')
for (const [path, mod] of Object.entries(metaFiles)) {
  const id = path.split('/').slice(-2, -1)[0]
  console.log(`  ${id}: ${mod.default?.title ?? id}`)
}
*/

</script>

<template>
  <main :class="{
    'distributed-view-mode': viewMode === 'distributed',
    'blocks-view-mode': viewMode === 'blocks'
  }">

    <!-- Blocks View Mode -->
    <template v-if="viewMode === 'blocks'">
      <div class="blocks-wrapper" :style="bannerStyle">
        <!-- ONE grid that morphs via classes -->
        <div class="grid-container" :class="{
          'map-only': isMapOnly,
          'two-panels': BlockLeftPanelContainer && BlockRightPanelContainer,
          'one-panel-map': isOneContainer && !(BlockLeftPanelContainer && BlockRightPanelContainer)
        }">
          <!-- Info (kept mounted across layout changes) -->
          <div class="block block-description" v-show="!!scenarioFile">
            <CustomPanelContainer :key="`desc-${activeScenario}`" @jumpTo="handleJumpTo"
              @toggle-layer="handleLayerToggle" @loadFlowMap="handleLoadFlowMap" :project="scenarioTitle" :file="scenarioFile" idName="split-frame"
              :top="false" split-mode @setFilter="handleMapFilter"  />
          </div>

          <!-- Map (always one instance) -->
          <div class="block block-map">
            <div class="map-block-wrapper">
              <MapCanvas ref="mapRef" :map-settings="mapSettings" :initial-scenario="scenarioTitle"
                :view-mode="viewMode" @map-ready="handleMapReady" />
              <MapLegend id="MapLegend" v-if="shouldShowLegend" :key="`${projectId}-${mapLayers.length}`"
                class="map-legend-top-left" :project="activeScenario" :layer-info="mapLayers" />
            </div>
          </div>
          
        </div>
      </div>
    </template>

    <!-- Loading indicator when scenario not ready -->
    <div v-if="!activeScenario" class="map-loading">
      <div class="map-loading-spinner"></div>
      <div class="map-loading-text">Loading map...</div>
    </div>

    <!-- Zoom control (visible when not in blocks view) -->
    <div v-if="viewMode !== 'blocks'" class="top-zoom" :class="{ 'split-view-zoom': viewMode === 'split' }">
      <ZoomControl />
    </div>

    <!-- Layer control -->
    <div class="layer-control-container">
      <LayerControl :layers="mapLayers" @toggle-layer="handleLayerToggle" />
    </div>
  </main>
</template>

<style>
@import '@/assets/main.css';

/* Global Layout Styles */
.top-zoom {
  width: 60vw;
  height: fit-content;
  position: fixed;
  left: 50%;
  top: 1vh;
  transform: translateX(-50%) rotate(180deg);
  display: flex;
  justify-content: space-between;
}

.outer-slideshow-container {
  height: 15.4%;
  width: 36vw;
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  background: #0061c3;
  border-radius: 8px;
  z-index: 4;
}

.slideshow-title {
  width: 100%;
  height: 32px;
  font-size: 25px;
  font-weight: 600;
  padding-top: 6px;
  text-align: center;
  background: #0061c3;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.slideshow-content {
  margin: 10px;
  background: #fff;
  overflow: hidden;
  height: calc(100% - 0px);
  position: relative;
}

.fill {
  width: 100%;
  height: 100%;
  background-position: center;
  background-size: cover;
}

.item,
.active,
.carousel-inner {
  height: 100%;
}

.home-button {
  position: fixed;
  width: 50px;
  height: 50px;
  background: #0061c3;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  color: white;
  font-size: 24px;
  transition: transform 0.2s, background-color 0.2s;
}

.home-button:hover {
  transform: scale(1.1);
  background-color: #0052a8;
}

.home-button.top-right {
  top: 20px;
  right: 20px;
  transform: rotate(180deg);
}

.home-button.top-right:hover {
  transform: scale(1.1) rotate(180deg);
}

.home-button.bottom-left {
  bottom: 20px;
  left: 20px;
}

.layer-control-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.map-loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #f0f2f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.map-loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(0, 97, 195, 0.2);
  border-top: 5px solid #0061c3;
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

.map-loading-text {
  margin-top: 15px;
  font-size: 18px;
  color: #0061c3;
}

.blocks-wrapper {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.grid-container {
  display: grid;
  width: 100%;
  height: 100%;
  margin-top: 1rem;
  margin-bottom: 1rem;
  gap: 1rem;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto auto 1fr auto;
  grid-template-areas:
    'description graphic1 graphic2'
    'description graphic1 graphic2'
    'description map map'
    'carousel map map';
  padding: 0rem;
  box-sizing: border-box;
}

.grid-container.one-panel-map {
  display: grid;
  width: 100%;
  height: 100%;
  margin-top: 1rem;
  margin-bottom: 1rem;
  gap: 1rem;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto auto 1fr auto;
  grid-template-areas:
    'description graphic graphic'
    'description graphic graphic'
    'description map map'
    'carousel map map';
  padding: 0rem;
  box-sizing: border-box;
}

.map-only {
  grid-template-areas:
    'description map map'
    'description map map'
    'description map map'
    'carousel map map';
}

.block-map--full {
  grid-area: map;
  width: 100%;
  height: 100%;
  background: rgba(246, 183, 212, 0.85);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.block {
  background: rgba(216, 215, 215, 0.85);
  border-radius: 8px;
  overflow: hidden;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.block-description {
  grid-area: description;
}

.description-content {
  padding: 1rem;
  overflow: auto;
  height: 100%;
}

.block-graphic1 {
  grid-area: graphic1;
  height: auto;
}

.block-graphic2 {
  grid-area: graphic2;
  height: auto;
}

.grid-container.one-panel-map .block-graphic1,
.grid-container.one-panel-map .block-graphic2 {
  grid-area: graphic;
  height: auto;
}

.graphic-content {
  padding: 1rem;
  text-align: center;
  height: 100%;
  overflow: auto;
}

.block-map {
  grid-area: map;
  overflow: hidden;
}

.map-block-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.map-container :deep(.maplibregl-map) {
  width: 100% !important;
  height: 100% !important;
  position: absolute !important;
}

.map-legend-top-left {
  position: absolute;
  top: 20px;
  left: 20px;
  background: white;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 14px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  z-index: 10;
  width: 100%;
  max-width: 400px;
  max-height: 20%;
  overflow-y: auto;
}

.carousel-legend-row {
  width: min(var(--row-width, 100vw), calc(100vw - 32px));
  margin-inline: auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  /* carousel grows, legend fixed */
  gap: 12px;
  align-items: start;
}

.carousel-cell {
  min-width: 0;
}

@media (max-width: 900px) {
  .carousel-legend-row {
    grid-template-columns: 1fr;
  }
  .blocks-wrapper {
    padding: 1rem !important;
  }
}
@media (max-width: 600px) {
  .blocks-wrapper {
    align-items: stretch;
    padding: 0rem !important;
  }
  .grid-container {
    display: flex !important;
    flex-direction: column;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    gap: 0 !important;
  }
  .block-map,
  .block-description {
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .block-map {
    order: 1;
  }
  .block-description {
    order: 2;
  }
}
</style>

<template>
  <div
    class="map-legend"
    :class="`variant-${variant}`"
    :style="variant === 'inline'
      ? { width: (typeof inlineWidth === 'number' ? inlineWidth + 'px' : inlineWidth),
          maxHeight: (typeof inlineMaxHeight === 'number' ? inlineMaxHeight + 'px' : inlineMaxHeight) }
      : null"
  >
    <h1 class="map-legend__header">Legende</h1>
    <div v-if="isLoading" class="map-legend__content loading-message">Loading layers...</div>
    <div v-else class="map-legend__content">
      <div v-for="group in processedLayers" :key="group.id" class="legend-group">
        <div class="legend-row" v-if="group.visible">
          <GeometryIcon
            :type="group.children?.[0]?.id || 'unknown'"
            :color="getColor(group.children?.[0]?.id, group)"
          />
          <span>{{ group.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import GeometryIcon from './GeometryIcon.vue'

const props = defineProps({
  project: String,
  layerInfo: { type: Array, default: () => [] },
  variant: { type: String, default: 'overlay' }, 
  inlineWidth: { type: [String, Number], default: 300 },   // px
  inlineMaxHeight: { type: [String, Number], default: '40vh' }
})

const processedLayers = ref([])
const isLoading = ref(true)
const designKeyMap = ref({})

// put near the top of <script setup>
const isHelperLayer = (l) =>
  // hide our rendering helpers:
  (typeof l.id === 'string' && (l.id.endsWith('-pattern') || l.id.endsWith('-stroke'))) ||
  // if your map code marks helpers explicitly:
  l.helper === true;

// Load design_map.json on mount
onMounted(async () => {
  try {
    const res = await fetch('/design_map.json')
    designKeyMap.value = await res.json()
  } catch (err) {
    console.error('Failed to load design_key_map:', err)
  }
})

// Watch for incoming layerInfo and process accordingly
watch(
  () => props.layerInfo,
  async (newLayerInfo) => {
    if (!newLayerInfo || !newLayerInfo.length) {
      processedLayers.value = []
      isLoading.value = false
      return
    }

    isLoading.value = true

    const baseLayers = newLayerInfo.filter(l => !isHelperLayer(l))

    const layerModules = import.meta.glob('/src/projects/**/layers/*.geojson', {
        import: 'default',
        query: '?raw',
    })

    const promises = baseLayers.map(async (layer) => {
      try {
        const matchingKey = Object.keys(layerModules).find(path =>
          path.endsWith(`/src/projects/${props.project}/${layer.id}`)
        )

        if (!matchingKey) throw new Error(`GeoJSON for ${layer.name} not found`)

        const module = await layerModules[matchingKey]()
        const geojsonData = JSON.parse(module)
        const uniqueFeatureTypes = new Map()
        const strokeCounter = {}
        const designKeyCounter = {}

        for (const feature of geojsonData.features || []) {
          const props = feature.properties || {}
          const geomType = feature.geometry?.type

          if (props.stroke) {
            strokeCounter[props.stroke] = (strokeCounter[props.stroke] || 0) + 1
          }

          if (props.design_key) {
            designKeyCounter[props.design_key] = (designKeyCounter[props.design_key] || 0) + 1
          }

          if (geomType && !uniqueFeatureTypes.has(geomType)) {
            uniqueFeatureTypes.set(geomType, {
              id: geomType.toLowerCase(),
              type: geomType,
              visible: layer.visible
            })
          }
        }

        const mostUsedStroke = Object.entries(strokeCounter).sort((a, b) => b[1] - a[1])[0]?.[0]
        const mostUsedDesignKey = Object.entries(designKeyCounter).sort((a, b) => b[1] - a[1])[0]?.[0]

        return {
          ...layer,
          children: Array.from(uniqueFeatureTypes.values()),
          stroke: mostUsedStroke,
          design_key: mostUsedDesignKey 
        }

      } catch (error) {
        console.error(`Failed to process layer "${layer.name}":`, error)
        return { ...layer, children: [] }
      }
    })

    processedLayers.value = await Promise.all(promises)
    isLoading.value = false
  },
  { immediate: true, deep: true }
)

function getColor(geomType, layer) {
  let geom = geomType?.toLowerCase()

  // Normalize geometry
  if (geom === 'multipolygon') geom = 'polygon'
  if (geom === 'multilinestring') geom = 'line'
  if (geom === 'linestring') geom = 'line'
  if (geom === 'point') geom = 'point'

  const designKey = layer?.design_key
  const entry = designKeyMap.value?.[geom]?.[designKey]

  if (entry?.fill || entry?.stroke) return entry.fill || entry.stroke
  if (layer?.stroke) return layer.stroke

  return '#888888'
}

</script>

<style scoped>
.map-legend {
  display: flex;
  flex-direction: column;
  background: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  border-radius: 5px;
  padding: 0;
}

.map-legend.variant-overlay {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 10vw;
  max-width: 400px;
  max-height: 25vh;
  overflow: hidden;
  z-index: 10;  
  min-width: fit-content;
}

.map-legend.variant-inline {
  position: relative;   
  left: auto;
  top: auto;
  width: auto;          
  max-width: 100%;
  max-height: none;    
  overflow: hidden;
  z-index: auto;
}

.map-legend__header {
  background: var(--h1-background, rgb(0, 101, 189));
  color: aliceblue;
  font-size: 22px;
  font-weight: bold;
  padding: 0 12px;
  display: flex;
  align-items: center;
  margin: 0;
}
.map-legend__content {
  background: white;
  font-size: 15px;
  overflow-y: auto;
  flex: 1;
  padding: 10px 12px;
}
.loading-message { color: #777; font-style: italic; }
.legend-group { margin-bottom: 0.7em; }
.legend-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
</style>
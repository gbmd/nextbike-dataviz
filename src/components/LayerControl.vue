<script setup>
import { ref, computed } from 'vue'

/**
 * Props for LayerControl component
 * @property {Array} layers - Array of layer objects with properties like id, name, visible, helper
 */
const props = defineProps({
  layers: { type: Array, required: true }
})

const emit = defineEmits(['toggle-layer'])

const isOpen = ref(false)

/**
 * Helper function to identify helper layers by id pattern
 * @param {string} id - Layer id
 * @returns {boolean} true if id matches helper patterns
 */
const isHelperId = (id) =>
  typeof id === 'string' &&
  (/-pattern$|-stroke$|-(points|lines|polygons)$/.test(id))

/**
 * Helper function to identify helper layers explicitly marked or by id
 * @param {object} layer - Layer object
 * @returns {boolean} true if layer is helper
 */
const isHelper = (layer) => layer?.helper === true || isHelperId(layer?.id || '')

/**
 * Computed property to filter base layers (non-helper), deduplicate by id, and sort by name then id
 */
const baseLayers = computed(() => {
  const filtered = (props.layers || []).filter(l => l && !isHelper(l))
  const unique = filtered.filter(
    (l, i, arr) => arr.findIndex(x => x.id === l.id) === i
  )
  unique.sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || '')) ||
    String(a.id).localeCompare(String(b.id))
  )
  return unique
})

/**
 * Toggle the visibility of the layer control panel
 */
function togglePanel() {
  isOpen.value = !isOpen.value
}

/**
 * Emit event to toggle a layer's visibility by id
 * @param {string} layerId - The id of the layer to toggle
 */
function toggleLayer(layerId) {
  emit('toggle-layer', layerId)
}
</script>

<template>
  <div class="layer-control" :class="{ 'is-open': isOpen }">
    <div class="control-button" @click="togglePanel" title="Toggle Layers Panel">
      <font-awesome-icon :icon="['fas', 'layer-group']" />
    </div>

    <div v-if="isOpen" class="layer-panel">
      <div class="panel-header">
        <h3>Layers</h3>
        <button class="close-button" @click="togglePanel" aria-label="Close Layers Panel">
          <font-awesome-icon :icon="['fas', 'times']" />
        </button>
      </div>

      <div class="layer-list">
        <div v-for="layer in baseLayers" :key="layer.id" class="layer-item">
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="layer.visible"
              @change="toggleLayer(layer.id)"
            />
            <span class="slider"></span>
          </label>
          <span class="layer-name">{{ layer.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layer-control {
  position: relative;
  z-index: 1000;
}
.control-button {
  width: 50px;
  height: 50px;
  background: var(--color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--box-shadow-base);
  color: var(--color-white);
  font-size: 24px;
  transition: transform 0.2s, background-color 0.2s;
}
.control-button:hover {
  transform: scale(1.1);
  background-color: var(--color-primary-dark);
}

.layer-panel {
  position: absolute;
  bottom: 60px;
  right: 0;
  width: 220px;
  background: #0061c3;
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.panel-header h3 {
  color: #fff;
  margin: 0;
  font-size: 16px;
  text-transform: uppercase;
}
.close-button {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
}

.layer-list {
  max-height: 300px;
  overflow-y: auto;
}
.layer-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}
.layer-item:last-child {
  border-bottom: none;
}
.layer-name {
  margin-left: 10px;
  color: #fff;
  font-size: 14px;
}
</style>

<style scoped>
/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
}
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 34px;
}
.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: #fff;
  transition: 0.4s;
  border-radius: 50%;
}
input:checked + .slider {
  background-color: #ffffff;
}
input:checked + .slider:before {
  transform: translateX(18px);
  background-color: #0061C3;
}
</style>

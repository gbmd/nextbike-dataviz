<template>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    class="geometry-icon"
    aria-hidden="true"
  >
    <!-- Render a rectangle for polygon types -->
    <rect
      v-if="type.includes('polygon')"
      x="2"
      y="4"
      width="12"
      height="8"
      :fill="color"
      rx="1"
    />

    <!-- Render a line for line string types -->
    <line
      v-else-if="type.includes('line')"
      x1="2"
      y1="8"
      x2="14"
      y2="8"
      :stroke="color"
      stroke-width="2"
      stroke-linecap="round"
    />

    <!-- Render a circle for point types -->
    <circle
      v-else-if="type.includes('point')"
      cx="8"
      cy="8"
      r="4"
      :fill="color"
    />

    <!-- Fallback: Render a default square for unknown types -->
    <rect v-else x="2" y="2" width="12" height="12" :fill="color" rx="1" />
  </svg>
</template>

<script setup>
/**
 * Props for GeometryIcon component
 * @property {string} type - The geometry type, e.g., "polygon", "point", "line"
 * @property {string} color - The fill or stroke color for the shape
 */
defineProps({
  type: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#888888'
  }
})
</script>

<style scoped>
.geometry-icon {
  display: inline-block;
  margin-right: 0.6em;
  vertical-align: middle; /* Align icon vertically with text */
  flex-shrink: 0; /* Prevent shrinking in flex layouts */
  fill: var(--color-primary);
}
</style>

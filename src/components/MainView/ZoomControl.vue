<template>
  <div class="zoom-control">
    <font-awesome-icon class="zoom-in" :icon="['fas', 'magnifying-glass-plus']" height="35" width="35" />
    <font-awesome-icon class="zoom-out" :icon="['fas', 'magnifying-glass-minus']" height="35" width="35" />
  </div>
</template>

<script>
/**
 * ZoomControl component
 * Displays zoom in and zoom out icons for map control.
 */
export default {
  name: "ZoomControl"
}
</script>

<style scoped>
.zoom-control {
  z-index: 5;
  cursor: pointer;
  pointer-events: all;
  background-color: var(--color-aliceblue);
  color: var(--color-black);
  width: 4.5vw;
  padding: 8px;
  display: flex;
  justify-content: space-between;
  border-radius: var(--border-radius-large);
}
</style>

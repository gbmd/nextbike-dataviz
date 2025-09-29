<template>
  <!-- Wrapper div provides size and rotation based on position -->
  <div :class="['panel-container', positionClass]">
    <!-- Header with title and collapse toggle icon -->
    <div :class="['panel__header', headerModClass, { marked: selected }]" ref="title">
      {{ title }}
      <font-awesome-icon
        :icon="collapsed ? ['fas', 'chevron-up'] : ['fas', 'chevron-down']"
        height="40"
        width="40"
      />
    </div>

    <!-- Button to show scenario on map, visible only when not selected -->
    <button v-show="!selected" class="panel__map-btn" ref="button">
      Auf der Karte anzeigen
    </button>

    <!-- Content area displaying HTML fetched dynamically -->
    <div ref="content" class="panel__content" :class="contentModClass" v-html="html" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import interact from 'interactjs'

/**
 * Props for ScenarioPanel component
 * @property {string} scenario - Unique ID of the scenario this panel belongs to
 * @property {string} htmlFile - HTML fragment filename inside /panels/ folder
 * @property {string} title - Header title text
 * @property {string} position - Position of the panel (e.g., 'upper-left', 'top-right')
 * @property {boolean} selected - Whether the scenario is currently active/selected
 */
const props = defineProps({
  scenario: String,
  htmlFile: String,
  title: String,
  position: { type: String, default: 'upper-left' },
  selected: Boolean
})

const emit = defineEmits(['mapSelected'])

// Compute CSS class for panel position
const positionClass = computed(() => ({
  'upper-left': 'upper-left',
  'lower-left': 'lower-left',
  'upper-right': 'upper-right',
  'lower-right': 'lower-right',
  'top-left': 'top-left',
  'top-right': 'top-right'
}[props.position]))

// Compute CSS class for header modifier based on position
const headerModClass = computed(() =>
  /top-/.test(props.position) ? 'panel__header--top' : 'panel__header--side'
)

// Compute CSS class for content modifier based on position
const contentModClass = computed(() =>
  /top-/.test(props.position) ? 'panel__content--top' : 'panel__content--side'
)

// State to track if panel content is collapsed
const collapsed = ref(true)
// HTML content loaded dynamically
const html = ref('')

/**
 * Fetch HTML content for the panel.
 * Tries project root path first, then falls back to legacy path.
 */
async function fetchHtml() {
  try {
    const path = `/src/projects/${props.scenario}/${props.htmlFile || 'index.html'}`
    html.value = await fetch(path).then(r => r.text())
  } catch (error) {
    console.warn(`Couldn't find HTML at project root, trying legacy path`)
    const legacyPath = `/src/projects/${props.scenario}/panels/${props.htmlFile || 'overview.html'}`
    html.value = await fetch(legacyPath).then(r => r.text())
  }
}

// Refs to DOM elements for interaction
const titleEl = ref(null)
const contentEl = ref(null)
const buttonEl = ref(null)

onMounted(async () => {
  await fetchHtml()

  // Toggle collapse/expand on header tap
  interact(titleEl.value).on('tap', () => {
    collapsed.value = !collapsed.value
    contentEl.value.style.display = collapsed.value ? 'none' : 'block'
    buttonEl.value.style.display = collapsed.value ? 'none' : 'block'
  })

  // Emit event when "show on map" button is tapped
  interact(buttonEl.value).on('tap', () =>
    emit('mapSelected', props.scenario, props.htmlFile)
  )

  // Enable drag-to-scroll on content area
  interact(contentEl.value).draggable({
    inertia: true,
    listeners: {
      move(e) {
        contentEl.value.scrollLeft -= e.delta.x / 3
        contentEl.value.scrollTop -= e.delta.y / 3
      }
    }
  })
})
</script>

<style scoped>
/* ---------------------------------------------------------------- size & rotation wrappers */
.panel-container {
    position: fixed;
    z-index: 5;
}

.upper-left,
.lower-left,
.upper-right,
.lower-right {
    width: 35vh;
}

.top-left,
.top-right {
    width: 28vw;
}

.upper-left {
    bottom: 25vh;
    left: -0.85%;
    transform: rotate(90deg);
}

.lower-left {
    top: 3vh;
    left: -0.85%;
    transform: rotate(90deg);
}

.upper-right {
    bottom: 25vh;
    right: -0.85%;
    transform: rotate(-90deg);
}

.lower-right {
    top: 3vh;
    right: -0.85%;
    transform: rotate(-90deg);
}

.top-left {
    top: 0;
    left: 20%;
    transform: rotate(180deg);
}

.top-right {
    top: 0;
    left: 52%;
    transform: rotate(180deg);
}

/* ---------------------------------------------------------------- header */
.panel__header {
    background: rgb(0, 101, 189);
    color: aliceblue;
    font-size: 22px;
    padding: 4px 5px 0 12px;
    width: 4.5vh;
    display: flex;
    justify-content: space-between;
    position: absolute;
    bottom: 0;
}

.panel__header--side {
    height: 4.6vw;
}

.panel__header--top {
    height: 6.5vh;
}

.marked {
    background: rgb(227, 114, 34);
}

/* ---------------------------------------------------------------- button */
.panel__map-btn {
    background: rgb(227, 114, 34);
    color: aliceblue;
    font-size: 20px;
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: none;
    padding: 2px 8px;
}

/* ---------------------------------------------------------------- content */
.panel__content {
    background: aliceblue;
    overflow: auto;
    font-size: 16px;
    padding: 8px;
    box-shadow: 0 -10px 15px rgba(0, 0, 0, .6);
    display: none;
}

.panel__content--top {
    height: 14.5vh;
}

.panel__content--side {
    height: 14vw;
}
</style>

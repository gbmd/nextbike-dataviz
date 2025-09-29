<template>
    <div :class="[containerClass, 'custom-slider']">
        <div :class="[headerClass]"> {{ project }} </div>
        <div :class="[infoClass, 'interact-scrollable']" :id="idName">
            <div v-html="html" style="overflow-x: hidden; touch-action: none; -ms-touch-action: none;"
                @vue:updated="onHTMLMounted">
            </div>
            <h1>Datenbasierte Einblicke in (E-)Bike-Sharing</h1>
<p>Willkommen! Diese Website zeigt, wie Menschen gemeinsame Fahrräder und E-Bikes in Städten nutzen. Die Daten stammen aus vielen europäischen Systemen. Ziel: einfache, verständliche Einblicke für alle.</p>
<div class="spacer"></div>

<h2>Erste Ansicht: 267 Städte</h2>
<p>Zu Beginn sehen Sie eine Karte mit <b>267 Städten</b>. Jeder Punkt steht für ein Bike-Sharing-System. Die <b>Größe</b> des Punkts zeigt, wie groß das System ist (wie viele Räder es hat). Die <b>Farbe</b> kann die Nutzung zeigen (z. B. Fahrten pro Rad und Tag).</p>
<div class="blue-frame" style="width: 60%; margin: 2rem auto;">
    <!-- Additional custom content can be included here -->
<div class="colormap">
    <div 
        class="colormap-gradient" 
        style="background: linear-gradient(to right, red, green); height: 20px; width: 100%;">
    </div>
    <div 
        class="colormap-labels" 
        style="display: flex; justify-content: space-between; font-size: 14px; margin-top: 4px;">
        <span>0.5</span>
        <span>Fahrten pro Tag und Rad</span>
        <span>3</span>
    </div>
</div>
</div>

<p>So bekommen Sie schnell ein Gefühl: Wo sind sehr große Systeme? Wo wird besonders viel gefahren?</p>
<div class="spacer"></div>
<h2>Interaktive Flüsse</h2>
<p>Mit einem Klick können Sie sehen, wie die Räder innerhalb einer Stadt fließen: von Start- zu Zielgebieten, über den Tag verteilt.</p>
<div style="width: 40%; margin: 2rem auto;">
            <button class="panel-button" @click="loadFlowmap">
                Fahrradfahrten laden
            </button>
</div>
<h2>Was kann ich lernen?</h2>
<ul>
  <li><b>Nutzung über den Tag:</b> Oft gibt es morgens und abends Spitzen, am Wochenende eher nachmittags.</li>
  <li><b>E-Bikes vs. normale Räder:</b> E-Bikes werden etwas anders genutzt, oft für längere Wege.</li>
  <li><b>Wichtige Faktoren:</b> Betriebszeiten, Größe des Einsatzgebiets, Anteil von E-Bikes, Radwege, Alter &amp; Geschlecht, Klima und Tourismus spielen eine Rolle.</li>
  <li><b>Betrieb &amp; Laden:</b> Bei E-Bikes ist das Laden/Wechseln der Akkus wichtig für gute Verfügbarkeit.</li>
  <li><b>Ziel:</b> Bessere Planung, bessere Auslastung, mehr Nachhaltigkeit.</li>
</ul>
<div class="spacer"></div>

<h2>Springe direkt zu einer Stadt</h2>
<p>Wählen Sie eine Stadt, um sofort in ihre Karte und Flüsse zu springen:</p>

<div  class="blue-frame">
<div class="panel-content-flex" >
    <div class="panel-controls" style="gap: 1rem; margin-bottom: 1rem;">
            <div class="city-picker" style="margin-bottom: 1rem;">
                <select v-model="activeCity" @change="selectCity" style="width: 100%; padding: 0.5rem;">
                    <option value="" disabled selected>Stadt wählen</option>
                    <option v-for="(coords, city) in cityMap" :key="city" :value="city">{{ city }}</option>
                </select>
            </div>
        <div class="button-row">
            <button class="panel-button" 
                :class="{'active-toggle': activeCity === 'Berlin'}"
                    @click="jumpTo(13.35, 52.5, 11, 'Berlin')">
                  <img :src="flagSrc('de')" alt="Deutschland" width="24" height="18" style="vertical-align:middle;margin-right:.4rem;" />  
                  Berlin
            </button>
            <button class="panel-button" 
                :class="{'active-toggle': activeCity === 'Warschau'}"
                    @click="jumpTo(21.01, 52.22, 11, 'Warschau')">
                <img :src="flagSrc('pl')" alt="Polen" width="24" height="18" style="vertical-align:middle;margin-right:.4rem;" />
                Warschau
            </button>
            <button class="panel-button" 
                :class="{'active-toggle': activeCity === 'Dresden'}"
                    @click="jumpTo(13.73, 51.05, 13, 'Dresden')">
                <img :src="flagSrc('de')" alt="Deutschland" width="24" height="18" style="vertical-align:middle;margin-right:.4rem;" />
                   Dresden
            </button>
            <button class="panel-button" 
                :class="{'active-toggle': activeCity === 'Bilbao'}"
                    @click="jumpTo(-2.94, 43.26, 14.5, 'Bilbao')">
                
                <img :src="flagSrc('es')" alt="Spanien" width="24" height="18" style="vertical-align:middle;margin-right:.4rem;" />
                   Bilbao
            </button>
        </div>
    </div>
</div>
    <div class="city-info-texts" style="gap: 1rem; margin-bottom: 1rem;">
        <p v-if="activeCity === 'Berlin'">
            Einwohner: ca. 3,7 Millionen<br>
            Nextbike Fahrräder: 6400<br>
            Fahrten pro Rad und Tag: 1
        </p>
        <p v-if="activeCity === 'Warschau'">
            Einwohner: ca. 1,8 Millionen<br>
            Nextbike Fahrräder: 5000<br>
            Fahrten pro Rad und Tag: 2
        </p>
        <p v-if="activeCity === 'Bilbao'">
            Einwohner: ca. 345.000<br>
            Nextbike Fahrräder: 710<br>
            Fahrten pro Rad und Tag: 10
        </p>
        <p v-if="activeCity === 'Dresden'">
            Einwohner: ca. 550.000<br>
            Nextbike Fahrräder: 1307<br>
            Fahrten pro Rad und Tag: 5.7
        </p>
</div>
</div>
<div class="spacer"></div>

<h2>Weitere Informationen</h2>

<div class="panel-content-flex">
<div class="blue-frame">
    <a href="https://github.com/TUMFTM/european-bike-sharing-dataset" target="_blank" rel="noopener noreferrer">
        <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub Repository" style="width:100px; display:block; margin: 0 auto;" />
    </a>
    <p style="text-align: center;">GitHub Repository</p>
</div>
<div  class="blue-frame">
    <a href="https://link.springer.com/article/10.1007/s11116-025-10661-2" target="_blank" rel="noopener noreferrer">
        <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="Paper Link" style="width:100px; display:block; margin: 0 auto;" />
    </a>
<br>
<div>
<p style="text-align: center">Artikel</p>
</div>
</div>
</div>

<p><!-- Platzhalter: Hier kann später ein kurzer Hinweis auf Quelle/Publikation stehen. --></p>



        </div>
    </div>
</template>

<script setup>
const emit = defineEmits(['loadFlowMap', 'jumpTo']);
</script>
  
<script>
import interact from 'interactjs';
import { touchHandler } from '@/components/TouchInteraction';
import locationsURL from './assets/nextbike_flow_locations.csv?url';
import flowsURL from './assets/nextbike_flows.csv?url';

const cityMap = {
    Berlin: [13.35, 52.5, 11],
    Warschau: [21.01, 52.22, 11],
    Dresden: [13.73, 51.05, 13],
    Bilbao: [-2.94, 43.26, 14.5]
};


const regexPattern = /\/src\/projects\/([^\/]+)\/([^\/]+\.html)/i;
const replacementString = "$1";

const panels = import.meta.glob('@/projects/**/*.html', {
    query: '?raw',
    import: 'default',
 })

const lcKeys = Object.keys(panels).reduce(
    function (keys, k) {
        keys[k.replace(regexPattern, replacementString).toLowerCase()] = k;
        return keys
    }, {});

// Supported image extensions for path replacement
const imageExtensions = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp'];

const flagSrc = (cc) => `https://flagcdn.com/24x18/${cc}.png` // or host locally

function replaceImagePaths(htmlContent, projectName) {
    let processedHtml = htmlContent;
    
    // Replace simple image references with public asset paths
    imageExtensions.forEach(ext => {
        // Match src="filename.ext" (simple filename only, no path)
        const regex = new RegExp(`src="([^"/\\\\]+\\${ext})"`, 'gi');
        processedHtml = processedHtml.replace(regex, `src="project-assets/${projectName}/$1"`);
    });
    
    return processedHtml;
}

async function getPanel(key) { 
    // First try to find a direct match
    if (lcKeys[key.toLowerCase()]) {
        const panelFn = panels[lcKeys[key.toLowerCase()]];
        const htmlContent = await panelFn();
        // Use the original key case for the project name
        return replaceImagePaths(htmlContent, key);
    }
    
    // Otherwise find the first HTML file for this project
    const projectId = key.toLowerCase();
    const projectFiles = Object.keys(lcKeys).filter(k => 
        k.toLowerCase().startsWith(projectId) && k.toLowerCase().endsWith('.html')
    );
    
    if (projectFiles.length > 0) {
        const panelFn = panels[lcKeys[projectFiles[0]]];
        const htmlContent = await panelFn();
        // Use the original key case for the project name
        return replaceImagePaths(htmlContent, key);
    }
    
    console.error(`No HTML file found for project: ${key}`);
    return '<p>No content found</p>';
}

export default {
    name: "PanelContainer",
    props: {
        top: Boolean,
        idName: String,
        project: String,
        file: String,
        splitMode: Boolean
    },
    data() {
        return {
            topContainer: "container-top",
            sideContainer: "container-side",
            splitContainer: "container-split",
            topHeader: "header-top",
            sideHeader: "header-side",
            splitHeader: "header-split",
            topInfo: "info-frame-top",
            sideInfo: "info-frame-side",
            splitInfo: "info-frame-split",
            id: this.idName,
            template: this.file,
            activeCity: null,
            html: ""
        }
    },
    computed: {
        containerClass() {
            if (this.splitMode) return this.splitContainer;
            return this.top ? this.topContainer : this.sideContainer;
        },
        headerClass() {
            if (this.splitMode) return this.splitHeader;
            return this.top ? this.topHeader : this.sideHeader;
        },
        infoClass() {
            if (this.splitMode) return this.splitInfo;
            return this.top ? this.topInfo : this.sideInfo;
        }
    },
    async mounted() {
        try {
            if (this.template != null) {
                this.html = await getPanel(this.template);
            } else {
                this.html = "";
            }
        } catch (error) {
            console.error('Error loading panel:', error);
            this.html = "";
        }

        let element = document.getElementById(this.id);
        if (element) {
            this.initInteract(element);
        }
    },
    methods: {
        loadFlowmap() {
            this.$emit('loadFlowMap', flowsURL, locationsURL);
        },
        jumpTo(lon, lat, zoom, city) {
            this.activeCity = city;
            this.$emit('jumpTo', lon, lat, zoom);
        },
        initInteract() {
            touchHandler.addScroll(".interact-scrollable", this.scrollHandler);
            touchHandler.addTap('.button-tap', this.tapHandler);
            touchHandler.addTap('.button-tap-active', this.tapHandlerActive);
        },
        scrollHandler(action, target, delta, startEvent) {
            if (action == "scroll") {
                const dx = delta.x * 1.5;
                const dy = delta.y * 1.5;
                
                if (target.id == "left-frame") {
                    target.scrollLeft = target.scrollLeft + dy;
                    target.scrollTop = target.scrollTop + dx;
                } else if (target.id == "right-frame") {
                    target.scrollLeft = target.scrollLeft - dy;
                    target.scrollTop = target.scrollTop - dx;
                } else if (target.id == "top-frame") {
                    target.scrollTop = target.scrollTop + dy;
                    target.scrollLeft = target.scrollLeft + dx;
                } else if (target.id == "split-frame") {
                    target.scrollTop = target.scrollTop - dy;
                    target.scrollLeft = target.scrollLeft - dx;
                }
            }
        },
        tapHandlerActive(action, target, event) {
            target.focus();
            target.click();
            target.classList.add('active');
            setTimeout(() => {
                target.classList.remove('active');
            }, 10);
            event.preventDefault();
        },
        tapHandler(action, target, event) {
            if (event.type != "mouseup") {
                target.focus();
                target.click();
                event.stopPropagation();
                event.preventDefault();
            }
        },
        async onHTMLMounted(node) {
            for (const video of node.el.getElementsByClassName("video-js")) {
                videojs(video)
            }
        },
        selectCity() {
            if (!this.activeCity) return;
            const [lon, lat, zoom] = cityMap[this.activeCity] || [];
            if (lon !== undefined) {
                this.jumpTo(lon, lat, zoom, this.activeCity);
            }
        }
    }
}
</script>

<style scoped>

.panel-content-flex {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
    gap: 2rem;
    margin-top: 1rem;
    margin-bottom: 1rem;
}

.panel-controls {
    min-width: 200px;
    display: flex;
    flex-direction: column;
}

.button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 0.5rem;
}

.spacer {
    height: 20px;
}

.custom-html {
    overflow-x: hidden;
    touch-action: none;
    -ms-touch-action: none;
    margin-bottom: 1rem;
}

.city-picker {
    display: none;
}
@media (max-width: 1200px) {
    .button-row {
        display: none !important;
    }
    .city-picker {
        display: block !important;
    }
}
</style>
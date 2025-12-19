<template>
    <div :class="[containerClass, 'custom-slider']">
        <div :class="[headerClass]"> {{ project }} </div>
        <div :class="[infoClass, 'interact-scrollable']" :id="idName">
            <div v-html="html" style="overflow-x: hidden; touch-action: none; -ms-touch-action: none;"
                @vue:updated="onHTMLMounted">
            </div>
            <h1>Data-Driven Insights into (E-)Bike Sharing</h1>
<p>Welcome! This site shows how people use shared bikes and e-bikes across 267 cities in Europe. The data comes from European bike sharing systems by Nextbike. We aim to enable everyone to gain simple, understandable insights about the bike sharing usage in their city.</p>
<div class="spacer"></div>

<h2>Overview: 267 Cities</h2>
<p>The first view is a map of the <b>267 cities</b>. Each scatter point represents a bike-sharing system. The <b>size</b> of the dot shows how large the system is (how many bikes it has). The <b>color</b> can show usage - i.e. trips per day and bike (TDB). Click on a city to gain detailed insights!</p>
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
        <span>Trips per day and bike</span>
        <span>3</span>
    </div>
</div>
</div>

<div class="spacer"></div>
<h2>Interactive Flows</h2>
<p>With one click you can watch how bikes move within a city: from origin to destination throughout the day.</p>
<div style="width: 40%; margin: 2rem auto;">
            <button class="panel-button" @click="loadFlowmap">
                Load bike trips
            </button>
</div>

<h2>Jump Straight to a City</h2>
<p>Select a city to jump right into its map and flow view, or scroll through Europe yourself!</p>

<div  class="blue-frame">
<div class="panel-content-flex" >
    <div class="panel-controls" style="gap: 1rem; margin-bottom: 1rem;">
            <div class="city-picker" style="margin-bottom: 1rem;">
                <select v-model="activeCity" @change="selectCity" style="width: 100%; padding: 0.5rem;">
                    <option value="" disabled selected>Select city</option>
                    <option v-for="(coords, city) in cityMap" :key="city" :value="city">{{ city }}</option>
                </select>
            </div>
        <div class="button-row">
            <button class="panel-button" 
                :class="{'active-toggle': activeCity === 'Berlin'}"
                    @click="jumpTo(13.35, 52.5, 11, 'Berlin')">
                  <img :src="flagSrc('de')" alt="Germany" width="24" height="18" style="vertical-align:middle;margin-right:.4rem;" />  
                  Berlin
            </button>
            <button class="panel-button" 
                :class="{'active-toggle': activeCity === 'Warschau'}"
                    @click="jumpTo(21.01, 52.22, 11, 'Warschau')">
                <img :src="flagSrc('pl')" alt="Poland" width="24" height="18" style="vertical-align:middle;margin-right:.4rem;" />
                Warschau
            </button>
            <button class="panel-button" 
                :class="{'active-toggle': activeCity === 'Dresden'}"
                    @click="jumpTo(13.73, 51.05, 13, 'Dresden')">
                <img :src="flagSrc('de')" alt="Germany" width="24" height="18" style="vertical-align:middle;margin-right:.4rem;" />
                   Dresden
            </button>
            <button class="panel-button" 
                :class="{'active-toggle': activeCity === 'Bilbao'}"
                    @click="jumpTo(-2.94, 43.26, 14.5, 'Bilbao')">
                
                <img :src="flagSrc('es')" alt="Spain" width="24" height="18" style="vertical-align:middle;margin-right:.4rem;" />
                   Bilbao
            </button>
        </div>
    </div>
</div>
    <div class="city-info-texts" style="gap: 1rem; margin-bottom: 1rem;">
        <p v-if="activeCity === 'Berlin'">
            Residents: approx. 3.7 million<br>
            Nextbike bikes: 6,400<br>
            Trips per bike per day: 1
        </p>
        <p v-if="activeCity === 'Warschau'">
            Residents: approx. 1.8 million<br>
            Nextbike bikes: 5,000<br>
            Trips per bike per day: 2
        </p>
        <p v-if="activeCity === 'Bilbao'">
            Residents: approx. 345,000<br>
            Nextbike bikes: 710<br>
            Trips per bike per day: 10
        </p>
        <p v-if="activeCity === 'Dresden'">
            Residents: approx. 550,000<br>
            Nextbike bikes: 1,307<br>
            Trips per bike per day: 5.7
        </p>
</div>
</div>
<div class="spacer"></div>

<h2>What Can I Learn?</h2>
<ul>
  <li><b>Hot Spots:</b>Discover which areas are most popular for bike usage.</li>
  <li><b>Asymmetry:</b>Not all routes are used in both directions equally. This leads to imbalances within the system.</li>
  <li><b>Intercity Trips:</b>Some times, bikes are repositioned between cities by users or the company.</li>
  <!-- <li><b>:</b></li> -->
</ul>
<div class="spacer"></div>

<h2>Further Information</h2>
The results and dataset have been published within a scientific article at Springer Transportation. Please find the dataset and article linked below:
<div class="panel-content-flex" style="align-items: stretch;">
<div class="blue-frame">
    <a href="https://github.com/TUMFTM/european-bike-sharing-dataset" target="_blank" rel="noopener noreferrer">
        <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub Repository" style="width:100px; display:block; margin: 0 auto;" />
    </a>
    <p style="text-align: center;">GitHub Repository</p>
</div>
<div  class="blue-frame">
    <a href="https://link.springer.com/article/10.1007/s11116-025-10661-2" target="_blank" rel="noopener noreferrer">
        <img src="https://media.springernature.com/w316/springer-static/cover-hires/journal/11116?as=webp" alt="Paper Link" style="width:100px; display:block; margin: 0 auto;" />
    </a>
<br>
<div>
<p style="text-align: center">Scientific Article</p>
</div>
</div>
</div>

<p><!-- Placeholder: Add a short source/publication note here later. --></p>



        </div>
    <div style="margin-top: 2rem; padding: 1rem; font-size: 12px; color: #666; border-top: 1px solid #ddd;">
        <p style="margin: 0;">Built using <a href="https://github.com/visgl/flowmap.gl" target="_blank" rel="noopener noreferrer">flowmap.gl</a> and <a href="https://github.com/TUMFTM/sm-data-desk" target="_blank" rel="noopener noreferrer">sm-data-desk</a>
        The authors are not affiliated with or endorsed by Nextbike. 
        Website: <a href="http://linkedin.com/in/georgbalke" target="_blank" rel="noopener noreferrer">Georg Balke</a>. 
        Research: <a href="https://www.linkedin.com/in/felix-waldner/" target="_blank" rel="noopener noreferrer">Felix Waldner</a>, 
        <a href="http://linkedin.com/in/georgbalke" target="_blank" rel="noopener noreferrer">Georg Balke</a>, 
        <a href="https://www.linkedin.com/in/martin-lellep-858600152/" target="_blank" rel="noopener noreferrer">Martin Lellep</a> 
        and Felix Rech.</p>
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

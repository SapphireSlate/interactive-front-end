import * as THREE from 'three';
import { EcosystemManager } from './ecosystem.js';

class DigitalGarden {
    constructor() {
        this.setupScene();
        this.setupLighting();
        this.setupEcosystem();
        this.setupUI();
        this.addEventListeners();
        this.animate();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            logarithmicDepthBuffer: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        const container = document.getElementById('scene-container');
        if (!container) {
            throw new Error('Scene container not found');
        }
        container.appendChild(this.renderer.domElement);
        
        // Adjust camera for better hill view
        this.camera.position.set(0, 4, 15);
        this.camera.lookAt(0, 0, -5);

        // Create sky with proper Windows XP colors
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        this.skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x4b95e9) },     // Bright azure blue
                bottomColor: { value: new THREE.Color(0xffffff) },   // Pure white
                nightTopColor: { value: new THREE.Color(0x001b4d) },
                nightBottomColor: { value: new THREE.Color(0x000b24) },
                offset: { value: 10 },
                exponent: { value: 0.5 },                           // Softer gradient
                time: { value: 1.0 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform vec3 nightTopColor;
                uniform vec3 nightBottomColor;
                uniform float offset;
                uniform float exponent;
                uniform float time;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    vec3 dayColor = mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
                    vec3 nightColor = mix(nightBottomColor, nightTopColor, max(pow(max(h, 0.0), exponent), 0.0));
                    gl_FragColor = vec4(mix(nightColor, dayColor, time), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        this.sky = new THREE.Mesh(skyGeometry, this.skyMaterial);
        this.scene.add(this.sky);

        // Create ground plane
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x355e3b,
            roughness: 0.8,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Create rolling hills
        const hillGeometry = new THREE.PlaneGeometry(60, 40, 200, 200);
        const vertices = hillGeometry.attributes.position.array;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            
            // Create the iconic Windows XP rolling hill shape
            const mainHill = Math.exp(-(z + 10) * (z + 10) / 80) * 6;
            vertices[i + 1] = mainHill;
            
            // Add the characteristic gentle slopes
            vertices[i + 1] += Math.exp(-x * x / 200) * 2;
            
            // Add subtle texture
            vertices[i + 1] += Math.sin(x * 0.5) * 0.2 * Math.exp(-Math.abs(z) / 10);
        }
        
        hillGeometry.computeVertexNormals();
        
        // Create grass material with iconic Windows XP colors
        const hillMaterial = new THREE.MeshStandardMaterial({
            color: 0x78b82f,  // The iconic Windows XP green
            metalness: 0.0,
            roughness: 0.7,
            flatShading: false
        });
        
        const hills = new THREE.Mesh(hillGeometry, hillMaterial);
        hills.rotation.x = -Math.PI / 2.5;  // Adjust angle to match the photo
        hills.position.z = -15;             // Position to show the hill properly
        hills.position.y = -2;              // Lower position
        hills.receiveShadow = true;
        hills.castShadow = true;
        this.hills = hills;
        this.scene.add(hills);

        // Adjust camera to match the iconic view
        this.camera.position.set(0, 6, 20);
        this.camera.lookAt(0, 0, -5);

        // Update sky colors to match the photo
        this.skyMaterial.uniforms.topColor.value = new THREE.Color(0x4b95e9);     // Bright azure blue
        this.skyMaterial.uniforms.bottomColor.value = new THREE.Color(0xffffff);   // Pure white
        this.skyMaterial.uniforms.exponent.value = 0.5;                           // Softer gradient

        // Remove the dark ground plane as it's not needed
        this.scene.remove(ground);
    }

    setupLighting() {
        // Bright ambient light
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);

        // Main sunlight - bright and warm like Windows XP
        this.sunLight = new THREE.DirectionalLight(0xfff6e5, 1.8);
        this.sunLight.position.set(5, 15, 8);
        this.sunLight.castShadow = true;
        this.scene.add(this.sunLight);

        // Fill light for shadows
        const fillLight = new THREE.DirectionalLight(0xadd8e6, 0.8);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);

        // Configure shadow properties
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 50;
        this.sunLight.shadow.camera.left = -15;
        this.sunLight.shadow.camera.right = 15;
        this.sunLight.shadow.camera.top = 15;
        this.sunLight.shadow.camera.bottom = -15;
        this.sunLight.shadow.bias = -0.0001;

        // Adjust renderer
        this.renderer.toneMappingExposure = 1.2;
    }

    setupEcosystem() {
        this.ecosystem = new EcosystemManager(this.scene);
        
        // Add initial plants
        for (let i = 0; i < 20; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8
            );
            this.ecosystem.plantSeed(position);
        }

        // Add initial herbivores
        for (let i = 0; i < 5; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8
            );
            this.ecosystem.addHerbivore(position);
        }
    }

    setupUI() {
        const ui = document.createElement('div');
        ui.className = 'ui-controls';
        ui.innerHTML = `
            <div class="tool-panel">
                <button class="tool-btn" data-tool="plant">🌱 Plant Seed</button>
                <button class="tool-btn" data-tool="herbivore">🐛 Add Herbivore</button>
            </div>
            <div class="time-control">
                <label>Day Speed</label>
                <input type="range" min="30" max="120" value="60" class="day-speed-slider">
            </div>
            <div class="stats-panel">
                <div>Plants: <span class="plant-count">0</span></div>
                <div>Herbivores: <span class="herbivore-count">0</span></div>
                <div>Time: <span class="day-time">Day</span></div>
            </div>
        `;
        document.body.appendChild(ui);

        // Add event listeners for UI controls
        const toolButtons = ui.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                toolButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
            });
        });

        // Connect day speed slider
        const daySpeedSlider = ui.querySelector('.day-speed-slider');
        daySpeedSlider.addEventListener('input', (e) => {
            this.ecosystem.environmentalFactors.dayLength = parseInt(e.target.value);
        });

        // Set initial tool
        this.currentTool = 'plant';
        toolButtons[0].classList.add('active');
    }

    addEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.renderer.domElement.addEventListener('click', this.onCanvasClick.bind(this));
        console.log('Event listeners added');
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onCanvasClick(event) {
        if (!this.currentTool) return;

        // Get canvas-relative coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Create raycaster
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(x, y);
        raycaster.setFromCamera(mouse, this.camera);

        // Create a horizontal plane for intersection
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        
        if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
            // Clamp the position to reasonable bounds
            intersectPoint.clampScalar(-4, 4);
            intersectPoint.y = 0; // Keep organisms on the grid
            
            console.log('Attempting to add organism at:', intersectPoint);
            
            // Add organism at intersection point
            if (this.currentTool === 'plant') {
                const plant = this.ecosystem.plantSeed(intersectPoint);
                if (plant) {
                    console.log('Plant added successfully');
                }
            } else if (this.currentTool === 'herbivore') {
                const herbivore = this.ecosystem.addHerbivore(intersectPoint);
                if (herbivore) {
                    console.log('Herbivore added successfully');
                }
            }
        }
    }

    updateStats() {
        const plantCount = this.ecosystem.organisms.filter(o => o.type === 'plant').length;
        const herbivoreCount = this.ecosystem.organisms.filter(o => o.type === 'herbivore').length;
        
        document.querySelector('.plant-count').textContent = plantCount;
        document.querySelector('.herbivore-count').textContent = herbivoreCount;
        document.querySelector('.day-time').textContent = 
            this.ecosystem.environmentalFactors.isDayTime ? 'Day' : 'Night';
    }

    updateLighting() {
        const { lightLevel } = this.ecosystem.environmentalFactors;
        
        // Update sun position and time of day
        const time = this.ecosystem.clock.getElapsedTime();
        const dayPhase = (time % this.ecosystem.environmentalFactors.dayLength) / this.ecosystem.environmentalFactors.dayLength;
        
        // Smooth transition between day and night
        const transitionDuration = 0.1; // 10% of the day length for sunrise/sunset
        let timeOfDay;
        
        if (dayPhase < 0.5) {
            // Day to night transition
            if (dayPhase > (0.5 - transitionDuration)) {
                const t = (0.5 - dayPhase) / transitionDuration;
                timeOfDay = Math.max(0, t);
            } else {
                timeOfDay = 1.0;
            }
        } else {
            // Night to day transition
            if (dayPhase > (1.0 - transitionDuration)) {
                const t = (1.0 - dayPhase) / transitionDuration;
                timeOfDay = 0.0;
            } else {
                const t = (dayPhase - 0.5) / transitionDuration;
                timeOfDay = Math.min(1.0, t);
            }
        }

        // Update sky shader
        this.sky.material.uniforms.time.value = timeOfDay;
        
        // Move sun in an arc
        const sunAngle = dayPhase * Math.PI * 2;
        this.sunLight.position.x = Math.cos(sunAngle) * 10;
        this.sunLight.position.y = Math.sin(sunAngle) * 10 + 5;
        this.sunLight.position.z = 5;
        
        // Update light colors and intensities
        const sunColor = new THREE.Color(0xfffaf0); // Warm sunlight
        const moonColor = new THREE.Color(0x4a6b9e); // Cool moonlight
        const currentLightColor = sunColor.lerp(moonColor, 1 - timeOfDay);
        
        this.sunLight.color.copy(currentLightColor);
        this.sunLight.intensity = 1.5 * Math.max(0.2, lightLevel);
        this.ambientLight.intensity = 0.4 * Math.max(0.1, lightLevel);
        
        // Update grass material for day/night
        const dayGrassColor = new THREE.Color(0x66b032); // Windows XP green
        const nightGrassColor = new THREE.Color(0x1a4719);
        this.hills.material.color.copy(dayGrassColor).lerp(nightGrassColor, 1 - timeOfDay);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        this.ecosystem.update();
        this.updateStats();
        this.updateLighting();
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the digital garden
try {
    new DigitalGarden();
} catch (error) {
    console.error('Failed to start digital garden:', error);
    document.querySelector('.overlay').innerHTML = '<h1>Failed to start digital garden</h1><p>Please try refreshing the page</p>';
} 
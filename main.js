import * as THREE from 'three';
import { EcosystemManager } from './ecosystem.js';

class DigitalGarden {
    constructor() {
        // Initialize properties
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.ecosystem = null;
        this.currentTool = 'plant';
        this.clock = new THREE.Clock();

        // Start the initialization
        this.init();
    }

    async init() {
        try {
            this.setupScene();
            this.setupLighting();
            this.setupEcosystem();
            this.setupUI();
            this.addEventListeners();
            this.animate();
        } catch (error) {
            console.error('Initialization error:', error);
            throw error;
        }
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Light blue sky
        
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        const canvas = document.getElementById('garden-canvas');
        if (!canvas) {
            throw new Error('Garden canvas not found');
        }
        
        this.renderer = new THREE.WebGLRenderer({ 
            canvas,
            antialias: true,
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // Position camera for better view
        this.camera.position.set(0, 10, 15);
        this.camera.lookAt(0, 0, 0);

        // Create ground
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x78b82f,
            roughness: 0.8,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Create sun
        const sunGeometry = new THREE.SphereGeometry(1, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
        });
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.scene.add(this.sun);

        // Create ambient light that will change with day/night
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(this.ambientLight);

        // Create directional light that follows the sun
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.sunLight.castShadow = true;
        
        // Improve shadow quality
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 50;
        this.sunLight.shadow.camera.left = -25;
        this.sunLight.shadow.camera.right = 25;
        this.sunLight.shadow.camera.top = 25;
        this.sunLight.shadow.camera.bottom = -25;
        
        this.scene.add(this.sunLight);

        // Enable shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    setupLighting() {
        // Lighting is now handled in the animate loop for day/night cycle
    }

    setupEcosystem() {
        this.ecosystem = new EcosystemManager(this.scene);
        
        // Add initial random plants (5-10)
        const initialPlants = 5 + Math.floor(Math.random() * 6);
        for (let i = 0; i < initialPlants; i++) {
            const x = (Math.random() - 0.5) * 15;
            const z = (Math.random() - 0.5) * 15;
            this.ecosystem.plantSeed(new THREE.Vector3(x, 0, z));
        }

        // Add initial random creatures (5-10)
        const initialCreatures = 5 + Math.floor(Math.random() * 6);
        for (let i = 0; i < initialCreatures; i++) {
            const x = (Math.random() - 0.5) * 15;
            const z = (Math.random() - 0.5) * 15;
            this.ecosystem.addHerbivore(new THREE.Vector3(x, 0, z));
        }
    }

    setupUI() {
        // Get UI elements
        const toolButtons = document.querySelectorAll('.tool-btn');
        const daySpeedSlider = document.querySelector('.day-speed-slider');

        // Setup tool buttons
        toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toolButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
            });
        });

        // Activate the first button by default
        if (toolButtons.length > 0) {
            toolButtons[0].classList.add('active');
        }

        // Setup day speed slider
        if (daySpeedSlider) {
            daySpeedSlider.addEventListener('input', (e) => {
                if (this.ecosystem) {
                    this.ecosystem.setDaySpeed(parseFloat(e.target.value));
                }
            });
        }
    }

    addEventListeners() {
        // Resize handler
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Click handler
        const container = document.getElementById('scene-container');
        if (container) {
            container.addEventListener('click', (event) => {
                const rect = this.renderer.domElement.getBoundingClientRect();
                const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

                const intersects = raycaster.intersectObjects(this.scene.children);
                if (intersects.length > 0) {
                    const point = intersects[0].point;
                    
                    switch (this.currentTool) {
                        case 'plant':
                            this.ecosystem.plantSeed(point);
                            break;
                        case 'creature':
                            this.ecosystem.addHerbivore(point);
                            break;
                        case 'delete':
                            // Remove any organisms within 1 unit of the click point
                            this.ecosystem.removeNearbyOrganisms(point, 1);
                            break;
                    }
                }
            });
        }
    }

    updateStats() {
        const plantCount = document.getElementById('plant-count');
        const creatureCount = document.getElementById('creature-count');
        const totalPopulation = document.getElementById('total-population');
        const daysSurvived = document.getElementById('days-survived');
        
        if (this.ecosystem) {
            if (plantCount) plantCount.textContent = this.ecosystem.getPlantCount();
            if (creatureCount) creatureCount.textContent = this.ecosystem.getCreatureCount();
            if (totalPopulation) totalPopulation.textContent = this.ecosystem.getTotalPopulation();
            if (daysSurvived) daysSurvived.textContent = this.ecosystem.getDaysSurvived();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update day/night cycle
        const time = this.clock.getElapsedTime();
        const dayDuration = this.ecosystem ? this.ecosystem.environmentalFactors.dayLength : 60;
        const dayPhase = (time % dayDuration) / dayDuration;
        
        // Calculate sun position
        const sunRadius = 30;
        const sunHeight = 20;
        const sunAngle = (dayPhase * Math.PI) + Math.PI; // Start from the east (PI) to west (2PI)
        
        // Position sun in a half-circle path
        this.sun.position.x = Math.cos(sunAngle) * sunRadius;
        this.sun.position.y = Math.abs(Math.sin(sunAngle)) * sunHeight;
        this.sun.position.z = -10;

        // Update directional light to follow sun
        this.sunLight.position.copy(this.sun.position);
        
        // Calculate light intensity based on sun height
        const normalizedHeight = this.sun.position.y / sunHeight;
        const lightIntensity = Math.max(0.1, normalizedHeight);
        
        // Update lights
        this.sunLight.intensity = lightIntensity * 1.5;
        this.ambientLight.intensity = lightIntensity * 0.8;

        // Update sky color
        const dayColor = new THREE.Color(0x87CEEB);
        const nightColor = new THREE.Color(0x1a1a2a);
        const skyColor = dayColor.lerp(nightColor, 1 - lightIntensity);
        this.scene.background = skyColor;

        // Update environmental factors
        if (this.ecosystem) {
            this.ecosystem.environmentalFactors.isDayTime = normalizedHeight > 0.3;
            this.ecosystem.environmentalFactors.lightLevel = lightIntensity;
        }
        
        if (this.ecosystem) {
            this.ecosystem.update();
            this.updateStats();
        }
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Initialize the garden when the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    try {
        // Check WebGL support
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (!gl) {
            throw new Error('WebGL not supported');
        }

        new DigitalGarden();
    } catch (error) {
        console.error('Failed to start digital garden:', error);
        const overlay = document.querySelector('.overlay');
        if (overlay) {
            overlay.innerHTML = `
                <h1>Failed to start digital garden</h1>
                <p>Error: ${error.message}</p>
                <p>Please ensure you're using a modern browser with WebGL support.</p>
            `;
        }
    }
}); 
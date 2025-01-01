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
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        const canvas = document.getElementById('garden-canvas');
        if (!canvas) {
            throw new Error('Garden canvas not found');
        }
        
        this.renderer = new THREE.WebGLRenderer({ 
            canvas,
            antialias: true,
            alpha: true
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // Position camera
        this.camera.position.set(0, 6, 20);
        this.camera.lookAt(0, 0, -5);

        // Create ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x78b82f,
            roughness: 0.8,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(10, 10, 10);
        sunLight.castShadow = true;
        this.scene.add(sunLight);

        // Enable shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    setupEcosystem() {
        this.ecosystem = new EcosystemManager(this.scene);
        
        // Add initial random plants (5-10)
        const initialPlants = 5 + Math.floor(Math.random() * 6);
        for (let i = 0; i < initialPlants; i++) {
            const x = (Math.random() - 0.5) * 20;
            const z = (Math.random() - 0.5) * 20;
            this.ecosystem.plantSeed(new THREE.Vector3(x, 0, z));
        }

        // Add initial random creatures (5-10)
        const initialCreatures = 5 + Math.floor(Math.random() * 6);
        for (let i = 0; i < initialCreatures; i++) {
            const x = (Math.random() - 0.5) * 20;
            const z = (Math.random() - 0.5) * 20;
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
        
        if (plantCount && this.ecosystem) {
            plantCount.textContent = this.ecosystem.getPlantCount();
        }
        if (creatureCount && this.ecosystem) {
            creatureCount.textContent = this.ecosystem.getCreatureCount();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
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
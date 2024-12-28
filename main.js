import * as THREE from 'three';

class AudioSystem {
    constructor() {
        this.initialized = false;
        this.context = null;
        this.sounds = {};
        this.oscillators = {};
        this.gainNodes = {};
    }

    async init() {
        if (this.initialized) return;
        
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create main gain node
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = 0.15; // Reduced initial volume
            this.masterGain.connect(this.context.destination);

            await this.setupSounds();
            this.initialized = true;
            console.log('Audio system initialized successfully');
        } catch (error) {
            console.error('Failed to initialize audio system:', error);
        }
    }

    async setupSounds() {
        // Create reverb effect
        const reverbNode = await this.createReverb();
        
        // Ambient pad sound
        const pad = this.context.createOscillator();
        const padGain = this.context.createGain();
        pad.type = 'sine';
        pad.frequency.value = 220; // A3 note
        padGain.gain.value = 0.05;
        pad.connect(padGain);
        padGain.connect(reverbNode);
        reverbNode.connect(this.masterGain);
        this.oscillators.pad = pad;
        this.gainNodes.pad = padGain;

        // Mode-specific oscillators with harmonics
        const modes = {
            sphere: [
                { freq: 329.63, type: 'sine', gain: 0.1 },     // E4
                { freq: 392.00, type: 'sine', gain: 0.05 }     // G4
            ],
            cube: [
                { freq: 261.63, type: 'square', gain: 0.08 },  // C4
                { freq: 329.63, type: 'square', gain: 0.04 }   // E4
            ],
            tornado: [
                { freq: 392.00, type: 'sawtooth', gain: 0.08 }, // G4
                { freq: 493.88, type: 'sawtooth', gain: 0.04 }  // B4
            ]
        };

        // Create oscillators for each mode with harmonics
        Object.entries(modes).forEach(([mode, harmonics]) => {
            this.oscillators[mode] = [];
            this.gainNodes[mode] = [];
            
            harmonics.forEach((harmonic, i) => {
                const osc = this.context.createOscillator();
                const gain = this.context.createGain();
                
                osc.type = harmonic.type;
                osc.frequency.value = harmonic.freq;
                gain.gain.value = 0; // Start silent
                
                osc.connect(gain);
                gain.connect(reverbNode);
                
                this.oscillators[mode].push(osc);
                this.gainNodes[mode].push(gain);
            });
        });

        // Start all oscillators
        this.oscillators.pad.start();
        Object.values(this.oscillators).flat().forEach(osc => {
            if (osc !== this.oscillators.pad) osc.start();
        });
    }

    async createReverb() {
        const convolver = this.context.createConvolver();
        const reverbTime = 2;
        const sampleRate = this.context.sampleRate;
        const length = sampleRate * reverbTime;
        const impulse = this.context.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.1));
            }
        }
        
        convolver.buffer = impulse;
        return convolver;
    }

    setMode(mode) {
        if (!this.initialized) return;

        // Fade out all mode oscillators
        Object.entries(this.gainNodes).forEach(([key, gains]) => {
            if (Array.isArray(gains)) {
                gains.forEach(gain => {
                    gain.gain.setTargetAtTime(0, this.context.currentTime, 0.1);
                });
            }
        });

        // Fade in the selected mode
        if (this.gainNodes[mode]) {
            this.gainNodes[mode].forEach((gain, i) => {
                const targetGain = this.oscillators[mode][i].type === 'sine' ? 0.1 : 0.08;
                gain.gain.setTargetAtTime(targetGain, this.context.currentTime, 0.1);
            });
        }
    }

    updateWithMovement(x, y) {
        if (!this.initialized) return;

        Object.entries(this.oscillators).forEach(([mode, oscillators]) => {
            if (Array.isArray(oscillators)) {
                oscillators.forEach(osc => {
                    const baseFreq = osc.frequency.value;
                    const freqOffset = (x * 10) + (y * 10); // Reduced modulation amount
                    osc.frequency.setTargetAtTime(baseFreq + freqOffset, this.context.currentTime, 0.1);
                });
            }
        });
    }

    updateWithZoom(zoomLevel) {
        if (!this.initialized) return;
        
        const normalizedZoom = 1 - (zoomLevel - 1) / 4;
        this.masterGain.gain.setTargetAtTime(0.15 * normalizedZoom, this.context.currentTime, 0.1);
    }

    suspend() {
        if (this.context && this.context.state === 'running') {
            this.context.suspend();
            return true;
        }
        return false;
    }

    async resume() {
        if (!this.initialized) {
            await this.init();
        }
        if (this.context && this.context.state === 'suspended') {
            await this.context.resume();
            return true;
        }
        return false;
    }
}

class ParticleAnimation {
    constructor() {
        if (!this.checkWebGLSupport()) {
            document.querySelector('.overlay').innerHTML = '<h1>WebGL is not supported on your browser</h1>';
            return;
        }

        try {
            this.container = document.querySelector('#scene-container');
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                powerPreference: "high-performance"
            });
            this.clock = new THREE.Clock();
            this.mouse = new THREE.Vector2();
            this.targetRotation = new THREE.Vector2();
            this.colorCycle = 0;
            this.particleMode = 'sphere';
            this.interactionStrength = 0.5;
            
            // Initialize audio system
            this.audioSystem = new AudioSystem();
            
            this.camera.position.z = 2.5; // Set initial zoom to middle range
            this.zoomLevel = 2.5;
            this.explosionParticles = null;
            this.implosionActive = false;
            
            this.init();
            this.setupParticles();
            this.addEventListeners();
            this.setupUI();
            this.setupDynamicButtons();
            this.animate();
        } catch (error) {
            console.error('Error initializing animation:', error);
            document.querySelector('.overlay').innerHTML = '<h1>Error initializing 3D animation</h1>';
        }
    }

    setupUI() {
        const ui = document.createElement('div');
        ui.className = 'ui-controls';
        ui.innerHTML = `
            <div class="mode-selector">
                <button onclick="window.particleInstance.setMode('sphere')">Sphere</button>
                <button onclick="window.particleInstance.setMode('cube')">Cube</button>
                <button onclick="window.particleInstance.setMode('tornado')">Tornado</button>
            </div>
            <div class="interaction-control">
                <label>Interaction Strength</label>
                <input type="range" min="0" max="100" value="50" 
                    onchange="window.particleInstance.setInteractionStrength(this.value / 100)">
            </div>
        `;
        document.body.appendChild(ui);
        window.particleInstance = this;

        // Add sound toggle button with initial state
        const soundButton = document.createElement('button');
        soundButton.className = 'sound-toggle';
        soundButton.innerHTML = '🔊';
        soundButton.onclick = () => this.toggleSound();
        ui.appendChild(soundButton);
    }

    async toggleSound() {
        try {
            if (!this.audioSystem.initialized || this.audioSystem.context?.state === 'suspended') {
                const success = await this.audioSystem.resume();
                document.querySelector('.sound-toggle').innerHTML = success ? '🔊' : '🔈';
                if (success) {
                    // Set initial mode
                    this.audioSystem.setMode(this.particleMode);
                }
            } else {
                const success = this.audioSystem.suspend();
                document.querySelector('.sound-toggle').innerHTML = success ? '🔈' : '🔊';
            }
        } catch (error) {
            console.error('Error toggling sound:', error);
        }
    }

    setMode(mode) {
        this.particleMode = mode;
        this.updateParticlePositions();
        this.audioSystem.setMode(mode);
    }

    setInteractionStrength(strength) {
        this.interactionStrength = strength;
    }

    updateParticlePositions() {
        const positions = this.particles.geometry.attributes.position.array;
        const particleCount = positions.length / 3;

        for (let i = 0; i < positions.length; i += 3) {
            const idx = i / 3;
            const position = this.calculateParticlePosition(idx, particleCount);
            positions[i] = position.x;
            positions[i + 1] = position.y;
            positions[i + 2] = position.z;
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
    }

    calculateParticlePosition(idx, total) {
        switch (this.particleMode) {
            case 'sphere': {
                const radius = 1;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos((Math.random() * 2) - 1);
                return {
                    x: radius * Math.sin(phi) * Math.cos(theta),
                    y: radius * Math.sin(phi) * Math.sin(theta),
                    z: radius * Math.cos(phi)
                };
            }
            case 'cube': {
                return {
                    x: (Math.random() - 0.5) * 2,
                    y: (Math.random() - 0.5) * 2,
                    z: (Math.random() - 0.5) * 2
                };
            }
            case 'tornado': {
                const angle = (idx / total) * Math.PI * 20;
                const radius = (idx / total) * 1.5;
                return {
                    x: Math.cos(angle) * radius,
                    y: (idx / total) * 4 - 2,
                    z: Math.sin(angle) * radius
                };
            }
        }
    }

    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    init() {
        if (!this.renderer || !this.container) return;
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);
        
        this.camera.position.z = 2;
        this.scene.background = new THREE.Color(0x000000);

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
    }

    setupParticles() {
        try {
            const particleCount = this.calculateOptimalParticleCount();
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);
            const sizes = new Float32Array(particleCount);

            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                const position = this.calculateParticlePosition(i, particleCount);
                positions[i3] = position.x;
                positions[i3 + 1] = position.y;
                positions[i3 + 2] = position.z;

                // Dynamic size based on position
                sizes[i] = Math.random() * 0.02 + 0.01;

                // Initial color
                const hue = Math.random();
                const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
                colors[i3] = color.r;
                colors[i3 + 1] = color.g;
                colors[i3 + 2] = color.b;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

            const material = new THREE.PointsMaterial({
                size: 0.02,
                vertexColors: true,
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 0.8,
                sizeAttenuation: true
            });

            this.particles = new THREE.Points(geometry, material);
            this.scene.add(this.particles);
        } catch (error) {
            console.error('Error setting up particles:', error);
            throw error;
        }
    }

    calculateOptimalParticleCount() {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        return isMobile ? 2500 : 5000;
    }

    addEventListeners() {
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', this.onWindowResize.bind(this));
            window.addEventListener('mousemove', this.onMouseMove.bind(this));
            window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
            window.addEventListener('wheel', this.onWheel.bind(this), { passive: true });
        }
    }

    onWheel(event) {
        const newZ = Math.max(1, Math.min(5, this.camera.position.z + event.deltaY * 0.001));
        this.camera.position.z = newZ;
        this.zoomLevel = newZ;
        this.audioSystem.updateWithZoom(newZ);
        this.updateButtonVisibility(newZ);
        console.log('Zoom updated:', newZ);
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.targetRotation.x = this.mouse.y * 0.5 * this.interactionStrength;
        this.targetRotation.y = this.mouse.x * 0.5 * this.interactionStrength;

        // Update audio based on mouse position
        this.audioSystem.updateWithMovement(this.mouse.x, this.mouse.y);
    }

    onTouchMove(event) {
        if (event.touches.length > 0) {
            this.onMouseMove(event.touches[0]);
        }
    }

    updateParticleColors(elapsedTime) {
        const colors = this.particles.geometry.attributes.color.array;
        const positions = this.particles.geometry.attributes.position.array;
        
        for (let i = 0; i < colors.length; i += 3) {
            const px = positions[i];
            const py = positions[i + 1];
            const pz = positions[i + 2];
            
            // Create dynamic color based on position and time
            const hue = (Math.atan2(py, px) / (Math.PI * 2) + 0.5 + elapsedTime * 0.1) % 1;
            const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
            
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }
        
        this.particles.geometry.attributes.color.needsUpdate = true;
    }

    setupDynamicButtons() {
        // Remove any existing buttons first
        const existingButtons = document.querySelectorAll('.dynamic-button, .zoom-instructions');
        existingButtons.forEach(button => button.remove());

        // Inner zoom button (visible when zoomed in)
        const innerButton = document.createElement('button');
        innerButton.className = 'dynamic-button inner-button';
        innerButton.innerHTML = '🌀 COLLAPSE';
        innerButton.onclick = () => this.triggerImplosion();
        document.body.appendChild(innerButton);

        // Outer zoom button (visible when zoomed out)
        const outerButton = document.createElement('button');
        outerButton.className = 'dynamic-button outer-button';
        outerButton.innerHTML = '⚡ EXPAND';
        outerButton.onclick = () => this.triggerExplosion();
        document.body.appendChild(outerButton);

        // Add zoom instructions
        const instructions = document.createElement('div');
        instructions.className = 'zoom-instructions';
        instructions.innerHTML = 'Scroll to zoom in/out';
        document.body.appendChild(instructions);

        // Initial visibility update
        this.updateButtonVisibility(this.camera.position.z);
    }

    updateButtonVisibility(zoomLevel) {
        const innerButton = document.querySelector('.inner-button');
        const outerButton = document.querySelector('.outer-button');
        const instructions = document.querySelector('.zoom-instructions');
        
        if (innerButton && outerButton) {
            // Adjusted thresholds for better visibility
            const innerVisible = zoomLevel < 2.2;
            const outerVisible = zoomLevel > 2.8;
            
            innerButton.style.opacity = innerVisible ? '1' : '0';
            innerButton.style.pointerEvents = innerVisible ? 'auto' : 'none';
            innerButton.style.transform = innerVisible ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.8)';
            
            outerButton.style.opacity = outerVisible ? '1' : '0';
            outerButton.style.pointerEvents = outerVisible ? 'auto' : 'none';
            outerButton.style.transform = outerVisible ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.8)';

            // Update instructions visibility
            if (instructions) {
                instructions.style.opacity = (!innerVisible && !outerVisible) ? '0.8' : '0';
            }
            
            console.log('Button visibility updated:', { zoomLevel, innerVisible, outerVisible });
        } else {
            console.warn('Buttons not found in DOM');
        }
    }

    triggerExplosion() {
        const positions = this.particles.geometry.attributes.position.array;
        const velocities = new Float32Array(positions.length);
        
        // Calculate explosion velocities with spiral
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            // Calculate direction from center with spiral
            const length = Math.sqrt(x * x + y * y + z * z);
            const speed = 0.15;
            const angle = Math.atan2(z, x) + Math.PI / 2; // Add spiral direction
            
            velocities[i] = ((x / length) + Math.cos(angle) * 0.5) * speed;
            velocities[i + 1] = (y / length) * speed;
            velocities[i + 2] = ((z / length) + Math.sin(angle) * 0.5) * speed;
        }
        
        this.explosionParticles = {
            velocities,
            startTime: this.clock.getElapsedTime(),
            duration: 2,
            transitionDuration: 1.5
        };
    }

    triggerImplosion() {
        this.implosionActive = true;
        this.implosionStartTime = this.clock.getElapsedTime();
        this.implosionDuration = 2;
        this.implosionTransitionDuration = 1.5;
        
        // Store initial positions and calculate center point
        const positions = this.particles.geometry.attributes.position.array;
        this.implosionInitialPositions = new Float32Array(positions.length);
        
        let centerX = 0, centerY = 0, centerZ = 0;
        for (let i = 0; i < positions.length; i += 3) {
            this.implosionInitialPositions[i] = positions[i];
            this.implosionInitialPositions[i + 1] = positions[i + 1];
            this.implosionInitialPositions[i + 2] = positions[i + 2];
            
            centerX += positions[i];
            centerY += positions[i + 1];
            centerZ += positions[i + 2];
        }
        
        const particleCount = positions.length / 3;
        this.implosionCenter = {
            x: centerX / particleCount,
            y: centerY / particleCount,
            z: centerZ / particleCount
        };
    }

    animate() {
        if (!this.renderer || !this.scene || !this.camera || !this.particles) return;

        requestAnimationFrame(this.animate.bind(this));
        
        try {
            const elapsedTime = this.clock.getElapsedTime();
            
            // Handle explosion animation with outward spiral
            if (this.explosionParticles) {
                const timeSinceExplosion = elapsedTime - this.explosionParticles.startTime;
                const positions = this.particles.geometry.attributes.position.array;
                const velocities = this.explosionParticles.velocities;
                
                if (timeSinceExplosion < this.explosionParticles.duration + this.explosionParticles.transitionDuration) {
                    const progress = Math.min(timeSinceExplosion / this.explosionParticles.duration, 1);
                    const transitionProgress = timeSinceExplosion > this.explosionParticles.duration ? 
                        (timeSinceExplosion - this.explosionParticles.duration) / this.explosionParticles.transitionDuration : 0;
                    
                    for (let i = 0; i < positions.length; i += 3) {
                        if (timeSinceExplosion <= this.explosionParticles.duration) {
                            // Outward spiral explosion
                            positions[i] += velocities[i] * (1 - progress * 0.5);
                            positions[i + 1] += velocities[i + 1] * (1 - progress * 0.5);
                            positions[i + 2] += velocities[i + 2] * (1 - progress * 0.5);
                            
                            // Add upward drift
                            positions[i + 1] += 0.002 * (1 - progress);
                            
                            velocities[i + 1] -= 0.001 * (1 - progress * 0.5); // Reduced gravity over time
                        } else {
                            // Smooth transition back
                            const targetPos = this.calculateParticlePosition(i / 3, positions.length / 3);
                            positions[i] = positions[i] + (targetPos.x - positions[i]) * transitionProgress;
                            positions[i + 1] = positions[i + 1] + (targetPos.y - positions[i + 1]) * transitionProgress;
                            positions[i + 2] = positions[i + 2] + (targetPos.z - positions[i + 2]) * transitionProgress;
                        }
                    }
                    
                    this.particles.geometry.attributes.position.needsUpdate = true;
                } else {
                    this.explosionParticles = null;
                }
            }
            
            // Handle implosion animation with spiral effect
            if (this.implosionActive) {
                const timeSinceImplosion = elapsedTime - this.implosionStartTime;
                const positions = this.particles.geometry.attributes.position.array;
                
                if (timeSinceImplosion < this.implosionDuration + this.implosionTransitionDuration) {
                    const progress = Math.min(timeSinceImplosion / this.implosionDuration, 1);
                    const transitionProgress = timeSinceImplosion > this.implosionDuration ?
                        (timeSinceImplosion - this.implosionDuration) / this.implosionTransitionDuration : 0;
                    
                    for (let i = 0; i < positions.length; i += 3) {
                        if (timeSinceImplosion <= this.implosionDuration) {
                            const x = positions[i] - this.implosionCenter.x;
                            const y = positions[i + 1] - this.implosionCenter.y;
                            const z = positions[i + 2] - this.implosionCenter.z;
                            
                            const distance = Math.sqrt(x * x + y * y + z * z);
                            const speed = 0.02 * (1 - progress * 0.5);
                            
                            // Enhanced spiral effect
                            const angle = elapsedTime * 3;
                            const spiralStrength = 0.015 * (1 - progress * 0.5);
                            const spiralX = Math.cos(angle + distance * 2) * spiralStrength;
                            const spiralZ = Math.sin(angle + distance * 2) * spiralStrength;
                            
                            // Move towards center with spiral
                            positions[i] = this.implosionCenter.x + (x * (1 - speed)) + spiralX;
                            positions[i + 1] = this.implosionCenter.y + (y * (1 - speed));
                            positions[i + 2] = this.implosionCenter.z + (z * (1 - speed)) + spiralZ;
                            
                            // Add vertical motion
                            positions[i + 1] += Math.sin(angle + distance * 3) * spiralStrength * 0.5;
                        } else {
                            // Smooth transition back
                            const targetPos = this.calculateParticlePosition(i / 3, positions.length / 3);
                            const t = Math.sin(transitionProgress * Math.PI / 2);
                            positions[i] = positions[i] + (targetPos.x - positions[i]) * t;
                            positions[i + 1] = positions[i + 1] + (targetPos.y - positions[i + 1]) * t;
                            positions[i + 2] = positions[i + 2] + (targetPos.z - positions[i + 2]) * t;
                        }
                    }
                    
                    this.particles.geometry.attributes.position.needsUpdate = true;
                } else {
                    this.implosionActive = false;
                    this.implosionInitialPositions = null;
                    this.implosionCenter = null;
                }
            }

            // Smooth rotation for main particles
            this.particles.rotation.x += (this.targetRotation.x - this.particles.rotation.x) * 0.05;
            this.particles.rotation.y += (this.targetRotation.y - this.particles.rotation.y) * 0.05;
            
            // Update colors for main particles
            this.updateParticleColors(elapsedTime);
            
            // Only apply mode-based movement if no effects are active
            if (!this.explosionParticles && !this.implosionActive) {
                const positions = this.particles.geometry.attributes.position.array;
                for (let i = 0; i < positions.length; i += 3) {
                    switch(this.particleMode) {
                        case 'sphere':
                            positions[i + 1] += Math.sin(elapsedTime * 0.5 + positions[i]) * 0.001;
                            positions[i + 2] += Math.cos(elapsedTime * 0.5 + positions[i]) * 0.001;
                            break;
                        case 'tornado':
                            const angle = Math.atan2(positions[i + 2], positions[i]);
                            const radius = Math.sqrt(positions[i] ** 2 + positions[i + 2] ** 2);
                            positions[i] = Math.cos(angle + elapsedTime * 0.5) * radius;
                            positions[i + 2] = Math.sin(angle + elapsedTime * 0.5) * radius;
                            break;
                        case 'cube':
                            positions[i] += Math.sin(elapsedTime + positions[i + 1]) * 0.001;
                            positions[i + 2] += Math.cos(elapsedTime + positions[i + 1]) * 0.001;
                            break;
                    }
                }
                this.particles.geometry.attributes.position.needsUpdate = true;
            }

            this.renderer.render(this.scene, this.camera);
        } catch (error) {
            console.error('Error in animation loop:', error);
        }
    }
}

// Start the animation with error handling
try {
    new ParticleAnimation();
} catch (error) {
    console.error('Failed to start animation:', error);
    document.querySelector('.overlay').innerHTML = '<h1>Failed to start animation</h1><p>Please try refreshing the page</p>';
} 
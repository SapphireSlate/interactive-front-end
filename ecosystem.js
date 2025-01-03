import * as THREE from 'three';

class DigitalOrganism {
    constructor(scene, position, type, dna = {}, manager) {
        this.scene = scene;
        this.position = position;
        this.type = type;
        this.manager = manager;
        this.energy = 100;
        this.age = 0;
        this.generation = 1;
        this.dna = {
            size: dna.size || Math.random() * 1.5 + 1.0,
            color: dna.color || this.getDefaultColor(),
            speed: dna.speed || Math.random() * 0.5 + 0.5,
            energyEfficiency: dna.energyEfficiency || Math.random() * 0.4 + 0.8
        };
        
        this.mesh = this.createMesh();
        this.scene.add(this.mesh);
    }

    getDefaultColor() {
        return new THREE.Color().setHSL(Math.random(), 0.8, 0.5);
    }

    createMesh() {
        throw new Error('createMesh must be implemented by subclasses');
    }

    update(deltaTime, environmentalFactors) {
        this.age += deltaTime;
        this.energy -= deltaTime * (1 / this.dna.energyEfficiency);
        
        // Update mesh position
        this.mesh.position.copy(this.position);
        
        // Base mesh pulsing with larger effect
        const scale = 1 + Math.sin(this.age * 2) * 0.2;
        this.mesh.scale.setScalar(this.dna.size * scale);
        
        return this.energy > 0;
    }

    die() {
        this.scene.remove(this.mesh);
        if (this.mesh.geometry) this.mesh.geometry.dispose();
        if (this.mesh.material) this.mesh.material.dispose();
    }
}

class Plant extends DigitalOrganism {
    constructor(scene, position, manager, dna = {}) {
        super(scene, position, 'plant', dna, manager);
        this.photosynthesisRate = 10;
        this.maxEnergy = 200;
        this.readyToReproduce = false;
        this.reproductionCooldown = 0;
        this.reproductionCooldownTime = 5;
    }

    getDefaultColor() {
        // Random shade of green
        return new THREE.Color().setHSL(0.3 + Math.random() * 0.1, 0.7 + Math.random() * 0.3, 0.4 + Math.random() * 0.2);
    }

    createMesh() {
        // Create a flower-like geometry
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const petalCount = 5;
        const petalSize = 0.5;

        // Create center of the flower
        vertices.push(0, 0, 0);

        // Create petals
        for (let i = 0; i < petalCount; i++) {
            const angle = (i / petalCount) * Math.PI * 2;
            const x = Math.cos(angle) * petalSize;
            const z = Math.sin(angle) * petalSize;
            vertices.push(x, 0.2, z);
            vertices.push(0, 0, 0); // Connect back to center
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        const material = new THREE.MeshPhongMaterial({
            color: this.dna.color,
            emissive: this.dna.color.clone().multiplyScalar(0.2),
            shininess: 10,
            transparent: true,
            opacity: 0.9
        });

        return new THREE.Mesh(geometry, material);
    }

    updateAppearance(environmentalFactors) {
        // Update color based on health and time of day
        const healthFactor = this.energy / this.maxEnergy;
        const timeFactor = environmentalFactors.lightLevel;
        
        const baseColor = this.dna.color.clone();
        const currentColor = new THREE.Color().setHSL(
            baseColor.getHSL({}).h,
            baseColor.getHSL({}).s * (0.6 + healthFactor * 0.4),
            baseColor.getHSL({}).l * (0.3 + timeFactor * 0.7)
        );
        
        this.mesh.material.color.copy(currentColor);
        this.mesh.material.emissive.copy(currentColor).multiplyScalar(0.2);
    }

    reproduce() {
        if (!this.readyToReproduce) return null;

        const spreadDistance = this.dna.size * 0.5;
        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * spreadDistance,
            (Math.random() - 0.5) * spreadDistance,
            (Math.random() - 0.5) * spreadDistance
        );
        const newPosition = this.position.clone().add(offset);
        
        const newDNA = {
            ...this.dna,
            size: this.dna.size * (0.9 + Math.random() * 0.2),
            energyEfficiency: this.dna.energyEfficiency * (0.95 + Math.random() * 0.1)
        };

        this.energy -= 75;
        this.readyToReproduce = false;
        this.reproductionCooldown = this.reproductionCooldownTime;

        return new Plant(this.scene, newPosition, this.manager, newDNA);
    }
}

class Herbivore extends DigitalOrganism {
    constructor(scene, position, manager, dna = {}) {
        super(scene, position, 'herbivore', dna, manager);
        this.targetPlant = null;
        this.eatDistance = 0.2;
        this.searchRadius = 2.0;
        this.lastSearchTime = 0;
        this.searchInterval = 1.0;
        this.readyToReproduce = false;
    }

    getDefaultColor() {
        // Random warm colors for creatures
        return new THREE.Color().setHSL(Math.random() * 0.1 + 0.05, 0.8, 0.5); // Reddish colors
    }

    createMesh() {
        // Create a simple creature-like geometry
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        // Body (triangular shape)
        vertices.push(
            0, 0, 0.4,    // nose (z increased from 0.2 to 0.4)
            -0.2, 0, -0.2, // left back (increased from 0.1 to 0.2)
            0.2, 0, -0.2   // right back (increased from 0.1 to 0.2)
        );

        // Add some "legs"
        const legPositions = [
            [-0.16, 0, 0],    // left front (doubled from 0.08)
            [0.16, 0, 0],     // right front (doubled from 0.08)
            [-0.1, 0, -0.2],  // left back (doubled from 0.05)
            [0.1, 0, -0.2]    // right back (doubled from 0.05)
        ];

        for (const pos of legPositions) {
            vertices.push(
                pos[0], pos[1], pos[2],
                pos[0], -0.1, pos[2], // Increased leg length from -0.05 to -0.1
                pos[0], pos[1], pos[2]
            );
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        const material = new THREE.MeshPhongMaterial({
            color: this.dna.color,
            emissive: this.dna.color.clone().multiplyScalar(0.2),
            shininess: 30,
            transparent: true,
            opacity: 0.9
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.setScalar(this.dna.size); // Removed the 0.5 reduction factor
        return mesh;
    }

    update(deltaTime, environmentalFactors) {
        const alive = super.update(deltaTime, environmentalFactors);
        
        if (this.targetPlant) {
            // Make the creature face its target
            const direction = new THREE.Vector3()
                .subVectors(this.targetPlant.position, this.position);
            if (direction.length() > 0.001) {
                const angle = Math.atan2(direction.x, direction.z);
                this.mesh.rotation.y = angle;
            }
        }
        
        return alive;
    }

    wander(deltaTime, speedMultiplier) {
        // Simple random movement
        this.position.x += (Math.random() - 0.5) * 0.1 * speedMultiplier * deltaTime;
        this.position.y += (Math.random() - 0.5) * 0.1 * speedMultiplier * deltaTime;
        this.position.z += (Math.random() - 0.5) * 0.1 * speedMultiplier * deltaTime;

        // Update mesh position
        this.mesh.position.copy(this.position);
    }

    findNearestPlant() {
        this.targetPlant = this.manager.findNearestOrganism(this.position, 'plant', this.searchRadius);
    }

    eat(plant) {
        const energyGained = Math.min(50, plant.energy);
        this.energy += energyGained;
        plant.energy -= energyGained;
        
        if (plant.energy <= 0) {
            this.targetPlant = null;
        }
    }

    reproduce() {
        if (!this.readyToReproduce) return null;

        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
        );
        const newPosition = this.position.clone().add(offset);
        
        const newDNA = {
            ...this.dna,
            size: this.dna.size * (0.9 + Math.random() * 0.2),
            speed: this.dna.speed * (0.9 + Math.random() * 0.2),
            energyEfficiency: this.dna.energyEfficiency * (0.95 + Math.random() * 0.1)
        };

        this.energy -= 100;
        this.readyToReproduce = false;

        return new Herbivore(this.scene, newPosition, this.manager, newDNA);
    }
}

class EcosystemManager {
    constructor(scene) {
        this.scene = scene;
        this.organisms = [];
        this.clock = new THREE.Clock();
        this.environmentalFactors = {
            isDayTime: true,
            lightLevel: 1.0,
            temperature: 20,
            dayLength: 60
        };

        this.gridSize = 1.0;
        this.grid = new Map();
    }

    // Get grid cell key for a position
    getGridKey(position) {
        const x = Math.floor(position.x / this.gridSize);
        const y = Math.floor(position.y / this.gridSize);
        const z = Math.floor(position.z / this.gridSize);
        return `${x},${y},${z}`;
    }

    // Get neighboring grid cells
    getNeighboringCells(position, radius) {
        const neighbors = new Set();
        const cellRadius = Math.ceil(radius / this.gridSize);
        const baseCell = {
            x: Math.floor(position.x / this.gridSize),
            y: Math.floor(position.y / this.gridSize),
            z: Math.floor(position.z / this.gridSize)
        };

        for (let x = -cellRadius; x <= cellRadius; x++) {
            for (let y = -cellRadius; y <= cellRadius; y++) {
                for (let z = -cellRadius; z <= cellRadius; z++) {
                    const key = `${baseCell.x + x},${baseCell.y + y},${baseCell.z + z}`;
                    if (this.grid.has(key)) {
                        neighbors.add(key);
                    }
                }
            }
        }

        return neighbors;
    }

    // Update organism's position in the grid
    updateOrganismGrid(organism) {
        const gridKey = this.getGridKey(organism.position);
        
        // Remove from old cells
        for (const [key, organisms] of this.grid.entries()) {
            organisms.delete(organism);
            if (organisms.size === 0) {
                this.grid.delete(key);
            }
        }

        // Add to new cell
        if (!this.grid.has(gridKey)) {
            this.grid.set(gridKey, new Set());
        }
        this.grid.get(gridKey).add(organism);
    }

    addOrganism(organism) {
        this.organisms.push(organism);
        this.updateOrganismGrid(organism);
    }

    // Find nearest plant for herbivores
    findNearestOrganism(position, type, radius) {
        let nearest = null;
        let minDistance = radius;

        const neighborCells = this.getNeighboringCells(position, radius);
        for (const cellKey of neighborCells) {
            const cellOrganisms = this.grid.get(cellKey);
            if (!cellOrganisms) continue;

            for (const organism of cellOrganisms) {
                if (organism.type !== type) continue;
                
                const distance = position.distanceTo(organism.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = organism;
                }
            }
        }

        return nearest;
    }

    update() {
        const deltaTime = this.clock.getDelta();
        
        // Update day/night cycle
        const time = this.clock.getElapsedTime();
        const dayPhase = (time % this.environmentalFactors.dayLength) / this.environmentalFactors.dayLength;
        this.environmentalFactors.isDayTime = dayPhase < 0.5;
        this.environmentalFactors.lightLevel = Math.cos(dayPhase * Math.PI * 2) * 0.5 + 0.5;

        // Update all organisms
        for (let i = this.organisms.length - 1; i >= 0; i--) {
            const organism = this.organisms[i];
            const isAlive = organism.update(deltaTime, this.environmentalFactors);
            
            if (!isAlive) {
                organism.die();
                this.organisms.splice(i, 1);
            } else {
                // Update organism's position in the grid
                this.updateOrganismGrid(organism);
            }
        }

        // Process reproduction and add new organisms
        const newOrganisms = [];
        for (const organism of this.organisms) {
            if (organism.readyToReproduce) {
                const offspring = organism.reproduce();
                if (offspring) {
                    newOrganisms.push(offspring);
                }
            }
        }
        newOrganisms.forEach(organism => this.addOrganism(organism));
    }

    plantSeed(position) {
        const plant = new Plant(this.scene, position, this);
        this.addOrganism(plant);
        return plant;
    }

    addHerbivore(position) {
        const herbivore = new Herbivore(this.scene, position, this);
        this.addOrganism(herbivore);
        return herbivore;
    }

    getPlantCount() {
        return this.organisms.filter(org => org instanceof Plant).length;
    }
    
    getCreatureCount() {
        return this.organisms.filter(org => org instanceof Herbivore).length;
    }
    
    setDaySpeed(speed) {
        this.environmentalFactors.dayLength = speed;
    }

    removeNearbyOrganisms(point, radius) {
        // Convert point to Vector3 if it isn't already
        const position = point instanceof THREE.Vector3 ? point : new THREE.Vector3(point.x, point.y, point.z);
        
        // Find and remove organisms within radius
        for (let i = this.organisms.length - 1; i >= 0; i--) {
            const organism = this.organisms[i];
            if (organism.position.distanceTo(position) <= radius) {
                organism.die();
                this.organisms.splice(i, 1);
            }
        }
    }
}

export { EcosystemManager, Plant, Herbivore, DigitalOrganism }; 
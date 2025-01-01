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
            size: dna.size || Math.random() * 0.5 + 0.5,
            color: dna.color || new THREE.Color().setHSL(Math.random(), 0.8, 0.5),
            speed: dna.speed || Math.random() * 0.5 + 0.5,
            energyEfficiency: dna.energyEfficiency || Math.random() * 0.4 + 0.8
        };
        
        this.particle = this.createParticle();
        this.scene.add(this.particle);
    }

    createParticle() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(3);
        positions[0] = this.position.x;
        positions[1] = this.position.y;
        positions[2] = this.position.z;

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            size: this.dna.size * 0.5,
            color: this.dna.color,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            depthWrite: false
        });

        return new THREE.Points(geometry, material);
    }

    update(deltaTime, environmentalFactors) {
        this.age += deltaTime;
        this.energy -= deltaTime * (1 / this.dna.energyEfficiency);
        
        // Update particle position
        const positions = this.particle.geometry.attributes.position.array;
        positions[0] = this.position.x;
        positions[1] = this.position.y;
        positions[2] = this.position.z;
        this.particle.geometry.attributes.position.needsUpdate = true;
        
        // Base particle pulsing with larger effect
        const scale = 1 + Math.sin(this.age * 2) * 0.2;
        this.particle.material.size = this.dna.size * 0.5 * scale;
        
        return this.energy > 0;
    }

    die() {
        this.scene.remove(this.particle);
        this.particle.geometry.dispose();
        this.particle.material.dispose();
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

    update(deltaTime, environmentalFactors) {
        if (environmentalFactors.isDayTime) {
            // Photosynthesis with diminishing returns as energy increases
            const energyFactor = 1 - (this.energy / this.maxEnergy);
            const energyGained = this.photosynthesisRate * environmentalFactors.lightLevel * deltaTime * energyFactor;
            this.energy = Math.min(this.maxEnergy, this.energy + energyGained);
            
            // Growth based on energy levels
            if (this.dna.size < 2.0 && this.energy > 100) {
                const growthRate = 0.001 * (this.energy / this.maxEnergy);
                this.dna.size *= (1 + growthRate);
                this.energy -= growthRate * 10; // Growth consumes energy
            }
        } else {
            // Slight energy consumption at night
            this.energy -= deltaTime * 2;
        }

        // Update reproduction cooldown
        if (this.reproductionCooldown > 0) {
            this.reproductionCooldown -= deltaTime;
        }

        // Check reproduction readiness
        this.readyToReproduce = (
            this.energy > 150 && 
            this.reproductionCooldown <= 0 && 
            Math.random() < 0.001
        );

        // Update particle appearance
        this.updateAppearance(environmentalFactors);

        return super.update(deltaTime, environmentalFactors);
    }

    updateAppearance(environmentalFactors) {
        // Update color based on health and time of day
        const healthFactor = this.energy / this.maxEnergy;
        const timeFactor = environmentalFactors.lightLevel;
        
        const hue = 0.3; // Base green
        const saturation = 0.6 + (healthFactor * 0.4); // More saturated when healthy
        const lightness = 0.3 + (timeFactor * 0.4); // Brighter during day
        
        this.particle.material.color.setHSL(hue, saturation, lightness);
        
        // Size pulsing based on energy
        const pulseScale = 1 + (Math.sin(this.age * 2) * 0.1 * healthFactor);
        this.particle.material.size = this.dna.size * 0.1 * pulseScale;
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

    update(deltaTime, environmentalFactors) {
        // More active during day
        const speedMultiplier = environmentalFactors.isDayTime ? 1.0 : 0.5;
        
        // Only search for new plant periodically
        if (!this.targetPlant && (this.age - this.lastSearchTime) > this.searchInterval) {
            this.findNearestPlant();
            this.lastSearchTime = this.age;
        }

        if (this.targetPlant) {
            // Check if target plant is still alive
            if (this.targetPlant.energy <= 0) {
                this.targetPlant = null;
                return super.update(deltaTime, environmentalFactors);
            }

            const direction = new THREE.Vector3()
                .subVectors(this.targetPlant.position, this.position)
                .normalize();
            
            // Move towards target
            this.position.add(
                direction.multiplyScalar(this.dna.speed * speedMultiplier * deltaTime)
            );
            
            // Update particle position
            const positions = this.particle.geometry.attributes.position.array;
            positions[0] = this.position.x;
            positions[1] = this.position.y;
            positions[2] = this.position.z;
            this.particle.geometry.attributes.position.needsUpdate = true;

            // Check if close enough to eat
            if (this.position.distanceTo(this.targetPlant.position) < this.eatDistance) {
                this.eat(this.targetPlant);
            }
        } else {
            // Random movement when no target
            this.wander(deltaTime, speedMultiplier);
        }

        // Check reproduction readiness
        this.readyToReproduce = (this.energy > 200 && Math.random() < 0.001);

        return super.update(deltaTime, environmentalFactors);
    }

    wander(deltaTime, speedMultiplier) {
        // Simple random movement
        this.position.x += (Math.random() - 0.5) * 0.1 * speedMultiplier * deltaTime;
        this.position.y += (Math.random() - 0.5) * 0.1 * speedMultiplier * deltaTime;
        this.position.z += (Math.random() - 0.5) * 0.1 * speedMultiplier * deltaTime;

        // Update particle position
        const positions = this.particle.geometry.attributes.position.array;
        positions[0] = this.position.x;
        positions[1] = this.position.y;
        positions[2] = this.position.z;
        this.particle.geometry.attributes.position.needsUpdate = true;
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
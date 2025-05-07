# Interactive 3D Particle Animation

A stunning interactive 3D particle animation built with Three.js, featuring dynamic particle systems, interactive controls, and immersive audio feedback.

![Interactive 3D Animation](preview.gif)

## Features

### Particle Modes
- **Sphere**: Particles form a perfect sphere with subtle animations
- **Cube**: Particles arrange in a cubic formation
- **Tornado**: Creates a dynamic tornado-like spiral formation

### Interactive Controls
- **Mouse Movement**: Rotate and interact with the particle system
- **Zoom Controls**: Scroll to zoom in/out, revealing different interaction buttons
- **Interaction Strength**: Adjust how strongly particles respond to mouse movements
- **Sound Toggle**: Enable/disable ambient audio feedback

### Special Effects
1. **EXPAND Effect** (Visible when zoomed out)
   - Particles burst outward in a spiral pattern
   - Includes gravity and drift effects
   - Smooth transition back to original formation

2. **COLLAPSE Effect** (Visible when zoomed in)
   - Creates an inward spiral vortex effect
   - Particles smoothly converge to the center
   - Elegant reformation to original state

### Visual Design
- Dynamic color transitions
- Smooth particle movements
- Retro-futuristic UI elements
- Responsive design for all screen sizes
- Beautiful gradient overlays

### Audio System
- Ambient background sounds
- Mode-specific audio feedback
- Interactive sound modulation based on movement
- Volume adjustment with zoom level

## Technical Details

### Core Technologies
- Three.js for 3D rendering
- Web Audio API for sound synthesis
- Modern JavaScript (ES6+)
- CSS3 for styling

### Key Components

#### ParticleAnimation Class
- Handles core 3D scene setup
- Manages particle system and animations
- Implements interaction logic
- Controls special effects

#### AudioSystem Class
- Manages Web Audio context
- Creates synthesized sounds
- Handles audio modulation
- Provides smooth transitions

### Performance Optimizations
- Efficient particle system using BufferGeometry
- Optimized particle count for mobile devices
- Hardware acceleration with WebGL
- Smooth animations with requestAnimationFrame

## Setup and Usage

1. Clone the repository:
```bash
git clone https://github.com/SapphireSlate/interactive-3d-particles.git
```

2. Open the project directory:
```bash
cd interactive-3d-particles
```

3. Serve the files using a local server (e.g., Python's built-in server):
```bash
python -m http.server 8000
```

4. Open your browser and navigate to:
```
http://localhost:8000
```

## Controls

- **Mouse Movement**: Rotate the particle system
- **Scroll**: Zoom in/out
- **Slider**: Adjust interaction strength
- **Mode Buttons**: Switch between Sphere, Cube, and Tornado modes
- **Sound Button**: Toggle audio feedback
- **EXPAND Button**: Trigger outward spiral explosion (visible when zoomed out)
- **COLLAPSE Button**: Trigger inward vortex effect (visible when zoomed in)

## Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing
Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License
This project is licensed under the MIT License - see the LICENSE file for details. 

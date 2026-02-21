/**
 * 2026 Year of the Horse Fireworks Simulator
 * Main entry point and module coordination
 */
console.log("Script loaded and running...");

// Configuration State
const AppState = {
    currentShape: 'sphere',
    currentColor: '#ffe8c0', // Platinum white-gold (most common firework color)
    currentSize: 1.0,
    customText: '',
    isGestureActive: false
};

// --- Modules ---


// --- Physics & Particle System ---

class Particle {
    constructor(x, y, color, velocity, life = 1, isSpark = false, lite = false, lowGravity = false) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = velocity.x;
        this.vy = velocity.y;
        this.alpha = 1;
        this.life = life;
        this.decay = isSpark ? Math.random() * 0.014 + 0.01 : Math.random() * 0.008 + 0.004;
        this.gravity = lowGravity ? 0.05 : 0.04;
        this.active = true;
        this.lite = lite; // Lightweight mode: no trail, just dot
        this.prevX = x;
        this.prevY = y;
    }

    update() {
        this.prevX = this.x;
        this.prevY = this.y;

        this.vx *= 0.985;
        this.vy *= 0.985;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;

        if (this.alpha <= 0) this.active = false;
    }

    draw(ctx) {
        const a = this.alpha;

        // Lite mode: just a simple dot (for text/shape particles)
        if (this.lite) {
            ctx.globalAlpha = a;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        const dx = this.x - this.prevX;
        const dy = this.y - this.prevY;
        const speed = Math.sqrt(dx * dx + dy * dy);

        // Trail line for fast-moving particles
        if (speed > 0.5) {
            const trailMul = Math.min(speed * 0.8, 4);
            const tailX = this.x - dx * trailMul;
            const tailY = this.y - dy * trailMul;

            ctx.globalAlpha = a * 0.4;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = a * 2;
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
        }

        // Head dot
        ctx.globalAlpha = a;
        ctx.fillStyle = a > 0.6 ? '#ffffff' : this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, a * 1.5 + 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Firework {
    constructor(x, y, targetY, color, shape, size, engine) {
        this.x = x;
        this.y = y;
        this.targetY = targetY;
        this.color = color;
        this.shape = shape;
        this.size = size;
        this.engine = engine;

        this.speed = 12;
        this.angle = -Math.PI / 2;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;

        this.exploded = false;
        this.active = true;
        this.trail = [];
    }

    update() {
        if (!this.exploded) {
            this.vy += 0.1; // Gravity on launch
            this.x += this.vx;
            this.y += this.vy;

            // Trail
            if (Math.random() > 0.7) {
                this.trail.push(new Particle(this.x, this.y, '#ffffff', { x: 0, y: 0 }, 0.5, true));
            }

            // Explode condition (reached target height or started falling)
            if (this.vy >= 0 || this.y <= this.targetY) {
                this.explode();
            }
        } else {
            // Update trail particles
            this.trail.forEach(p => p.update());
            this.trail = this.trail.filter(p => p.active);
            if (this.trail.length === 0) this.active = false;
        }
    }

    draw(ctx) {
        if (!this.exploded) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        this.trail.forEach(p => p.draw(ctx));
    }

    explode() {
        this.exploded = true;
        this.engine.createExplosion(this.x, this.y, this.color, this.shape, this.size);
    }
}

class FireworksEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.fireworks = [];
        this.particles = [];

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);

        // Cache for text particles
        this.textCanvas = document.createElement('canvas');
        this.textCtx = this.textCanvas.getContext('2d');
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    launch(x, y) {
        // x is launch X, y is target Y (height)
        // Launch from bottom of screen towards (x, y)
        // Actually, let's launch from x towards y height.
        // Start Y is bottom.
        const startY = this.canvas.height;
        // Correct launch calculation:
        // We want it to explode AT (x, y). 
        // Simple physics: it travels up.
        // For simplicity, launch from (x, canvas.height) to (x, y).

        const color = AppState.currentColor === 'rainbow'
            ? `hsl(${Math.random() * 360}, 100%, 50%)`
            : AppState.currentColor;

        this.fireworks.push(new Firework(
            x,
            startY,
            y,
            color,
            AppState.currentShape,
            AppState.currentSize,
            this
        ));
    }

    createExplosion(x, y, color, shape, sizeScale) {
        let particleCount = 180 * sizeScale;
        const speedScale = 9 * sizeScale;

        let customPoints = null;
        let isText = false;

        // Custom Shape Logic
        if (AppState.customText.length > 0) {
            customPoints = this.getTextPoints(AppState.customText, particleCount);
            if (!customPoints || customPoints.length === 0) customPoints = null;
            else isText = true;
        } else if (shape === 'heart') {
            customPoints = this.getHeartPoints(particleCount);
        } else if (shape === 'star') {
            customPoints = this.getStarPoints(particleCount);
        }

        if (customPoints) {
            const isShape = !isText; // heart, star shapes get low gravity
            customPoints.forEach(pt => {
                const velocity = {
                    x: pt.x * speedScale * 0.1,
                    y: pt.y * speedScale * 0.1
                };
                this.particles.push(new Particle(x, y, color, velocity, 1, false, isText, isShape));
            });
        } else {
            // Default Sphere
            for (let i = 0; i < particleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * speedScale;
                const velocity = {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                };
                this.particles.push(new Particle(x, y, color, velocity));
            }
        }
    }

    getHeartPoints(count) {
        const points = [];
        for (let i = 0; i < count; i++) {
            const t = (i / count) * Math.PI * 2;
            // Heart formula
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
            points.push({ x, y });
        }
        return points;
    }

    getStarPoints(count) {
        const points = [];
        const spikes = 5;
        const outerRadius = 15;
        const innerRadius = 7;

        for (let i = 0; i < count; i++) {
            const t = (i / count) * Math.PI * 2 * spikes;
            // This distributes points along the perimeter, maybe filling is better?
            // Let's do a simple parametric star or just random points inside a star polygon?
            // Simple parametric:
            const angle = (i / count) * Math.PI * 2; // Full circle
            // Need a better star distribution. 
            // Let's stick to velocity vectors.
            // If we just plot the outline:
            // r depends on angle.

            // Simple 5-point star equation (polar):
            // r(theta) = ... complex. 
            // Alternative: Emit in 5 specific directions + noise.

            // Approach 2: Parametric outline
            const k = i % spikes; // which spike
            // Not perfect but let's try a populated star.
            // x = R * cos(a), y = R * sin(a)
            // Modulating R.
            const r = outerRadius + Math.cos(angle * 5) * (outerRadius - innerRadius);
            // This creates a blobby star.

            // Let's use two radii.
            const step = Math.PI / spikes;
            let rCurrent = (i % 2 === 0) ? outerRadius : innerRadius;
            // This draws vertices. calculate along the line?

            // Simplest: Random point in star? 
            // Let's just do the "burst" in star directions.
            const starAngle = (Math.PI * 2) / 5;
            const variance = 0.2;
            let dir = Math.floor(Math.random() * 5) * starAngle - Math.PI / 2;
            dir += (Math.random() - 0.5) * variance;

            const speed = Math.random() * 2 + 3;
            points.push({
                x: Math.cos(dir) * speed * 3, // Boost for visibility
                y: Math.sin(dir) * speed * 3
            });
        }
        return points;
    }



    getTextPoints(text, count) {
        const fontSize = 100;
        this.textCanvas.width = fontSize * text.length + 50;
        this.textCanvas.height = fontSize + 50;
        const ctx = this.textCtx;

        ctx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
        ctx.font = `bold ${fontSize}px 'LXGW WenKai', cursive, serif`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, this.textCanvas.width / 2, this.textCanvas.height / 2);

        const imageData = ctx.getImageData(0, 0, this.textCanvas.width, this.textCanvas.height);
        const data = imageData.data;
        const points = [];

        // Sampling
        for (let y = 0; y < this.textCanvas.height; y += 4) { // Step 4 for performance
            for (let x = 0; x < this.textCanvas.width; x += 4) {
                const index = (y * this.textCanvas.width + x) * 4;
                if (data[index + 3] > 128) { // Alpha > 50%
                    points.push({
                        x: (x - this.textCanvas.width / 2) * 0.15, // Center and scale
                        y: (y - this.textCanvas.height / 2) * 0.15
                    });
                }
            }
        }
        return points;
    }

    update() {
        // Update Fireworks (Rockets)
        this.fireworks.forEach(f => f.update());
        this.fireworks = this.fireworks.filter(f => f.active);

        // Update Particles (Explosions)
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.active);
    }

    _initSkyBackground() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        this._skyW = w;
        this._skyH = h;

        // Create offscreen canvas for sky
        this._skyCanvas = document.createElement('canvas');
        this._skyCanvas.width = w;
        this._skyCanvas.height = h;
        const sctx = this._skyCanvas.getContext('2d');

        // Night sky gradient
        const grad = sctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#020818');
        grad.addColorStop(0.15, '#061030');
        grad.addColorStop(0.35, '#0c1848');
        grad.addColorStop(0.5, '#101540');
        grad.addColorStop(0.65, '#1a1030');
        grad.addColorStop(0.78, '#150a18');
        grad.addColorStop(0.86, '#0a0610');
        grad.addColorStop(1, '#050308');
        sctx.fillStyle = grad;
        sctx.fillRect(0, 0, w, h);

        // Warm horizon glow
        const horizonY = h * 0.82;
        const glow = sctx.createRadialGradient(w * 0.5, horizonY, 0, w * 0.5, horizonY, w * 0.6);
        glow.addColorStop(0, 'rgba(255, 140, 50, 0.07)');
        glow.addColorStop(0.4, 'rgba(255, 80, 40, 0.04)');
        glow.addColorStop(1, 'transparent');
        sctx.fillStyle = glow;
        sctx.fillRect(0, horizonY - h * 0.2, w, h * 0.4);

        // Second glow (left)
        const glow2 = sctx.createRadialGradient(w * 0.25, horizonY, 0, w * 0.25, horizonY, w * 0.3);
        glow2.addColorStop(0, 'rgba(255, 180, 80, 0.04)');
        glow2.addColorStop(1, 'transparent');
        sctx.fillStyle = glow2;
        sctx.fillRect(0, horizonY - h * 0.15, w * 0.5, h * 0.3);

        // Stars
        this._stars = [];
        for (let i = 0; i < 150; i++) {
            this._stars.push({
                x: Math.random() * w,
                y: Math.random() * h * 0.6,
                r: Math.random() * 1.3 + 0.2,
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 1.5 + 0.5
            });
        }
        // Draw static stars on sky canvas
        for (const s of this._stars) {
            sctx.globalAlpha = 0.3 + Math.random() * 0.4;
            sctx.fillStyle = '#ffffff';
            sctx.beginPath();
            sctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            sctx.fill();
        }
        sctx.globalAlpha = 1;

        // Mountain silhouette
        const cityY = h * 0.84;
        sctx.fillStyle = '#0a0512';
        sctx.beginPath();
        sctx.moveTo(0, cityY);
        for (let x = 0; x <= w; x += 20) {
            const hillY = cityY - 15 - Math.sin(x * 0.003) * 25 - Math.sin(x * 0.008) * 12;
            sctx.lineTo(x, hillY);
        }
        sctx.lineTo(w, h);
        sctx.lineTo(0, h);
        sctx.closePath();
        sctx.fill();

        // City buildings
        this._buildings = [];
        let bx = 0;
        const buildingCount = Math.floor(w / 10);
        for (let i = 0; i < buildingCount; i++) {
            const bw = Math.random() * 14 + 5;
            const bh = Math.random() * 35 + 8;
            this._buildings.push({ x: bx, w: bw, h: bh });
            bx += bw + Math.random() * 2;
        }
        sctx.fillStyle = '#060310';
        for (const b of this._buildings) {
            sctx.fillRect(b.x, cityY - b.h, b.w, b.h + 5);
        }

        // Building windows
        for (const b of this._buildings) {
            for (let wy = cityY - b.h + 4; wy < cityY - 2; wy += 6) {
                for (let wx = b.x + 2; wx < b.x + b.w - 2; wx += 5) {
                    if (Math.random() > 0.4) {
                        const warmth = Math.random();
                        const color = warmth > 0.5 ? '#ffd080' : (warmth > 0.2 ? '#ffe4b0' : '#a0c0ff');
                        sctx.globalAlpha = Math.random() * 0.4 + 0.2;
                        sctx.fillStyle = color;
                        sctx.fillRect(wx, wy, 2, 2);
                    }
                }
            }
        }
        sctx.globalAlpha = 1;

        // Water area
        const waterY = cityY + 5;
        const waterGrad = sctx.createLinearGradient(0, waterY, 0, h);
        waterGrad.addColorStop(0, '#060310');
        waterGrad.addColorStop(0.3, '#040210');
        waterGrad.addColorStop(1, '#030208');
        sctx.fillStyle = waterGrad;
        sctx.fillRect(0, waterY, w, h - waterY);

        // Water reflection glow
        const reflGrad = sctx.createRadialGradient(w * 0.5, waterY + 20, 0, w * 0.5, waterY + 20, w * 0.4);
        reflGrad.addColorStop(0, 'rgba(255, 130, 50, 0.04)');
        reflGrad.addColorStop(1, 'transparent');
        sctx.fillStyle = reflGrad;
        sctx.fillRect(0, waterY, w, h - waterY);
    }

    draw() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        // Initialize sky if needed
        if (!this._skyCanvas || this._skyW !== w || this._skyH !== h) {
            this._initSkyBackground();
        }

        // Blend cached sky at higher alpha for smooth trail fade
        ctx.globalAlpha = 0.45;
        ctx.drawImage(this._skyCanvas, 0, 0);
        ctx.globalAlpha = 1;

        // Twinkling stars (draw only a subset each frame for performance)
        const now = Date.now() * 0.001;
        const frameIdx = Math.floor(now * 10) % 3;
        ctx.fillStyle = '#ffffff';
        for (let i = frameIdx; i < this._stars.length; i += 3) {
            const star = this._stars[i];
            const twinkle = 0.25 + 0.35 * Math.sin(now * star.speed + star.phase);
            ctx.globalAlpha = twinkle;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.r * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Draw fireworks and particles
        this.fireworks.forEach(f => f.draw(ctx));
        this.particles.forEach(p => p.draw(ctx));
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }
}


class GestureController {
    constructor() {
        this.videoElement = document.getElementById('webcam-feed');
        this.cursor = document.getElementById('gesture-cursor');
        this.statusElement = document.getElementById('gesture-status');
        this.hands = null;
        this.camera = null;
        this.lastPinchTime = 0;
    }

    async init(onFireworkTrigger) {
        this.onFireworkTrigger = onFireworkTrigger;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.updateStatus("浏览器不支持摄像头");
            return;
        }

        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults(this.onResults.bind(this));

        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: this.videoElement });
            },
            width: 640,
            height: 480
        });

        try {
            await this.camera.start();
            this.updateStatus("手势控制已就绪");
            this.cursor.classList.remove('hidden');
            AppState.isGestureActive = true;
        } catch (e) {
            console.error(e);
            this.updateStatus("摄像头启动失败");
        }
    }

    updateStatus(msg) {
        if (this.statusElement) this.statusElement.textContent = msg;
    }

    onResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];

            // Landmark 8 is Index Finger Tip
            const indexTip = landmarks[8];
            const thumbTip = landmarks[4];
            const wrist = landmarks[0];
            const middleMCP = landmarks[9]; // Middle finger knuckle

            // Map coordinates to screen for cursor
            const x = (1 - indexTip.x) * window.innerWidth;
            const y = indexTip.y * window.innerHeight;

            // Move cursor
            this.cursor.style.left = `${x}px`;
            this.cursor.style.top = `${y}px`;

            // Calculate Hand Size (approximate scale reference)
            // Distance between Wrist (0) and Middle MCP (9) is a stable reference for hand size
            const handSize = Math.hypot(
                (middleMCP.x - wrist.x),
                (middleMCP.y - wrist.y)
            );

            // Detect Pinch (Distance between index and thumb)
            const pinchDist = Math.hypot(
                (indexTip.x - thumbTip.x),
                (indexTip.y - thumbTip.y)
            );

            // Dynamic Threshold: e.g., 20% of hand size
            const pinchThreshold = handSize * 0.3;

            // Detect Fist (All fingers closed)
            const isFist = this.isFist(landmarks);

            // Trigger condition: Pinch OR Fist
            // Added debugging log to help tune
            // console.log(`Pinch: ${pinchDist.toFixed(3)} / ${pinchThreshold.toFixed(3)} | Fist: ${isFist}`);

            if (pinchDist < pinchThreshold || isFist) {
                const now = Date.now();
                // Debounce firework trigger (e.g., max 5 per second)
                if (now - this.lastPinchTime > 250) { // Slight increase in debounce
                    this.onFireworkTrigger(x, y);

                    // Visual feedback
                    this.cursor.style.backgroundColor = 'white';
                    this.cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
                    this.lastPinchTime = now;
                    setTimeout(() => {
                        this.cursor.style.backgroundColor = 'rgba(255, 215, 0, 0.3)';
                        this.cursor.style.transform = 'translate(-50%, -50%) scale(1)';
                    }, 100);
                }
            }
        }
    }

    isFist(landmarks) {
        // Check if fingertips are lower than PIP joints (assuming hand is upright)
        // Better logic: Distance from Tip to Wrist vs MCP to Wrist.
        // If Tip is closer to wrist than MCP (Knuckle), it's definitely curled.

        const wrist = landmarks[0];
        // Fingers: Index, Middle, Ring, Pinky
        // Tips: 8, 12, 16, 20
        // MCPs (Knuckles): 5, 9, 13, 17
        const fingers = [
            { tip: 8, mcp: 5 },
            { tip: 12, mcp: 9 },
            { tip: 16, mcp: 13 },
            { tip: 20, mcp: 17 }
        ];

        let closedCount = 0;
        for (let f of fingers) {
            const tipPoint = landmarks[f.tip];
            const mcpPoint = landmarks[f.mcp];

            const distTip = Math.hypot(tipPoint.x - wrist.x, tipPoint.y - wrist.y);
            const distMcp = Math.hypot(mcpPoint.x - wrist.x, mcpPoint.y - wrist.y);

            // If tip is significantly closer to wrist than mcp, it's curled
            if (distTip < distMcp) {
                closedCount++;
            }
        }

        // Strict Fist: All 4 fingers must be curled
        return closedCount === 4;
    }
}


class UIManager {
    constructor(engine) {
        this.engine = engine;
        this.initEventListeners();
    }

    initEventListeners() {
        // Landing Page
        const startBtn = document.getElementById('start-btn');
        const overlay = document.getElementById('landing-overlay');
        const controlPanel = document.getElementById('control-panel');

        startBtn.addEventListener('click', () => {
            // Request Fullscreen (optional, improves experience)
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(err => console.log(err));
            }

            overlay.style.opacity = 0;
            setTimeout(() => {
                overlay.style.display = 'none';
                controlPanel.classList.remove('hidden'); // Show sidebar hint

                // Initialize Gesture
                const gesture = new GestureController();
                gesture.init((x, y) => this.engine.launch(x, y));

            }, 1000);
        });

        // Close Panel Button
        const reopenBtn = document.getElementById('panel-reopen-btn');
        document.getElementById('panel-close-btn').addEventListener('click', () => {
            controlPanel.classList.add('hidden');
            reopenBtn.classList.remove('hidden');
        });

        // Reopen Panel Button
        reopenBtn.addEventListener('click', () => {
            controlPanel.classList.remove('hidden');
            reopenBtn.classList.add('hidden');
        });


        // Text input reference (shared by shape, blessing, and text handlers)
        const textInput = document.getElementById('text-input');

        // Shapes — selecting a shape clears text mode
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                AppState.currentShape = btn.dataset.shape;
                // Clear text mode
                AppState.customText = '';
                textInput.value = '';
                document.querySelectorAll('.blessing-btn').forEach(b => b.classList.remove('active'));
            });
        });

        // Blessing Presets — selecting text clears shape mode
        document.querySelectorAll('.blessing-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const wasActive = btn.classList.contains('active');
                document.querySelectorAll('.blessing-btn').forEach(b => b.classList.remove('active'));

                if (wasActive) {
                    // Toggle off — clear text, revert to shape mode
                    AppState.customText = '';
                    textInput.value = '';
                    // Re-activate first shape button as default
                    const defaultShape = document.querySelector('.shape-btn[data-shape="sphere"]');
                    if (defaultShape) defaultShape.classList.add('active');
                } else {
                    btn.classList.add('active');
                    AppState.customText = btn.dataset.text;
                    textInput.value = btn.dataset.text;
                    // Deselect shape buttons
                    document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
                }
            });
        });

        // Colors
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                AppState.currentColor = btn.dataset.color;
            });
        });

        // Hue Slider for custom color
        const hueSlider = document.getElementById('hue-slider');
        const huePreview = document.getElementById('hue-preview');
        hueSlider.addEventListener('input', () => {
            const hue = parseInt(hueSlider.value);
            const hslColor = `hsl(${hue}, 100%, 65%)`;
            huePreview.style.backgroundColor = hslColor;
            // Deactivate preset buttons
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            // Convert HSL to hex for consistency
            AppState.currentColor = this._hslToHex(hue, 100, 65);
        });

        // Size
        const sizeSlider = document.getElementById('size-slider');
        const sizeValue = document.getElementById('size-value');
        sizeSlider.addEventListener('input', (e) => {
            AppState.currentSize = parseFloat(e.target.value);
            sizeValue.textContent = `${AppState.currentSize}x`;
        });

        // Text Input — typing clears shape mode
        textInput.addEventListener('input', (e) => {
            AppState.customText = e.target.value;
            if (AppState.customText.length > 0) {
                // Deselect shape buttons
                document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
                // Deselect blessing presets since user is typing custom
                document.querySelectorAll('.blessing-btn').forEach(b => b.classList.remove('active'));
            } else {
                // Text cleared — re-activate default shape
                const defaultShape = document.querySelector('.shape-btn[data-shape="sphere"]');
                if (defaultShape) defaultShape.classList.add('active');
            }
        });

        // Clear Screen
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.engine.fireworks = [];
            this.engine.particles = [];
            // Force full sky redraw
            if (this.engine._skyCanvas) {
                this.engine.ctx.drawImage(this.engine._skyCanvas, 0, 0);
            }
        });

        // Mouse click to launch fireworks
        this.engine.canvas.addEventListener('click', (e) => {
            this.engine.launch(e.clientX, e.clientY);
        });
    }

    _hslToHex(h, s, l) {
        s /= 100; l /= 100;
        const a = s * Math.min(l, 1 - l);
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }
}

// --- Main Init ---
window.addEventListener('DOMContentLoaded', () => {
    const engine = new FireworksEngine('fireworks-canvas');
    new UIManager(engine);
});

// ============================================================
// STATE MANAGEMENT
// ============================================================
let episodes = [];
let currentEpisode = null;
let trajectory = [];
let playing = false;
let frameIndex = 0;
let speed = 1;
let cumulativeReward = 0;

const canvas = document.getElementById('walkerCanvas');
const ctx = canvas.getContext('2d');

// ============================================================
// LOAD EPISODES
// ============================================================
async function loadEpisodes() {
    try {
        const res = await fetch('/walker/api/episodes');
        const data = await res.json();
        episodes = data.episodes;

        const select = document.getElementById('episodeSelect');
        select.innerHTML = '';

        episodes.forEach(ep => {
            const opt = document.createElement('option');
            opt.value = ep;
            opt.textContent = `Episode ${ep}`;
            select.appendChild(opt);
        });

        if (episodes.length > 0) {
            currentEpisode = episodes[episodes.length - 1];
            select.value = currentEpisode;
            await loadTrajectory(currentEpisode);
        }
    } catch (err) {
        console.error('Error loading episodes:', err);
    }
}

// ============================================================
// LOAD TRAJECTORY
// ============================================================
async function loadTrajectory(ep) {
    try {
        const res = await fetch(`/walker/api/trajectory/${ep}`);
        trajectory = await res.json();
        frameIndex = 0;
        cumulativeReward = 0;
        playing = false;

        document.getElementById('statEpisode').textContent = ep;
        document.getElementById('playPauseBtn').textContent = '▶ Play';

        drawFrame();
        updateGraphs();
    } catch (err) {
        console.error('Error loading trajectory:', err);
    }
}

// ============================================================
// BIPEDAL WALKER BODY STRUCTURE
// Estrae posizione e angoli dallo state (24 valori)
// ============================================================
function parseWalkerState(state) {
    // State structure (BipedalWalker):
    // [0-3]: hull + leg0 info
    // [4-7]: leg0 joints
    // [8-11]: leg1 joints
    // [12-15]: contact sensors, etc.
    // [16-23]: sensori di contatto gambe (normalizzati)

    return {
        // Posizione del corpo (normalizzata, scala ~[-1, 1])
        bodyX: state[0] * 100,      // pixel offset
        bodyY: state[1] * 100,

        // Angoli delle gambe (radianti, convertiti da [-1, 1])
        leg0Hip: state[4] * Math.PI,
        leg0Knee: state[5] * Math.PI,
        leg1Hip: state[8] * Math.PI,
        leg1Knee: state[9] * Math.PI,

        // Velocità (utile per animazione)
        velX: state[2],
        velY: state[3],

        // Contatti a terra
        leg0Ground: state[16] > 0.5,
        leg1Ground: state[20] > 0.5,
    };
}

// ============================================================
// DRAW WALKER ON CANVAS
// ============================================================
function drawWalker(state, action) {
    const parsed = parseWalkerState(state);

    // Centro del canvas
    const centerX = canvas.width * 0.4;
    const centerY = canvas.height * 0.65;

    // Dimensioni corpo
    const bodyRadius = 12;
    const legLength = 40;
    const footRadius = 6;

    ctx.save();

    // Disegna corpo (hull)
    ctx.fillStyle = '#00d4ff';
    ctx.beginPath();
    ctx.arc(centerX + parsed.bodyX, centerY + parsed.bodyY, bodyRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Disegna le due gambe
    drawLeg(
        centerX + parsed.bodyX,
        centerY + parsed.bodyY,
        parsed.leg0Hip,
        parsed.leg0Knee,
        legLength,
        parsed.leg0Ground,
        false
    );

    drawLeg(
        centerX + parsed.bodyX,
        centerY + parsed.bodyY,
        parsed.leg1Hip,
        parsed.leg1Knee,
        legLength,
        parsed.leg1Ground,
        true
    );

    ctx.restore();
}

// ============================================================
// DRAW SINGLE LEG
// ============================================================
function drawLeg(bodyX, bodyY, hipAngle, kneeAngle, legLen, grounded, isRight) {
    const segLen = legLen / 2;
    const footRadius = 6;
    const offset = isRight ? 15 : -15;

    // Hip joint position
    const hip = {
        x: bodyX + offset,
        y: bodyY
    };

    // Knee position (primo segmento)
    const knee = {
        x: hip.x + Math.sin(hipAngle) * segLen,
        y: hip.y + Math.cos(hipAngle) * segLen
    };

    // Foot position (secondo segmento)
    const foot = {
        x: knee.x + Math.sin(hipAngle + kneeAngle) * segLen,
        y: knee.y + Math.cos(hipAngle + kneeAngle) * segLen
    };

    // Colore in base al contatto
    ctx.strokeStyle = grounded ? '#00ff00' : '#ff6b6b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Disegna segmenti
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(knee.x, knee.y);
    ctx.lineTo(foot.x, foot.y);
    ctx.stroke();

    // Disegna ginocchio
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.arc(knee.x, knee.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Disegna piede
    ctx.fillStyle = grounded ? '#00ff00' : '#ff6b6b';
    ctx.beginPath();
    ctx.arc(foot.x, foot.y, footRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = grounded ? '#00cc00' : '#ff4444';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// ============================================================
// DRAW FRAME
// ============================================================
function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!trajectory || trajectory.length === 0) return;

    const idx = Math.floor(frameIndex) % trajectory.length;
    const step = trajectory[idx];

    // Background environment
    drawEnvironment();

    // Draw walker
    drawWalker(step.state, step.action);

    // HUD info
    drawHUD(idx, step);

    // Update stats sidebar
    updateStats(idx, step);
}

// ============================================================
// DRAW COLORFUL CLOUDS (defined first)
// ============================================================
function drawClouds(offset) {
    const cloudY1 = canvas.height * 0.12;
    const cloudY2 = canvas.height * 0.28;
    const cloudY3 = canvas.height * 0.20;

    const scrollOffset = (offset * 1.5) % (canvas.width + 200);

    // Cloud 1 (white)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    drawCloud(scrollOffset - 100, cloudY1, 80, 30);

    // Cloud 2 (light blue)
    ctx.fillStyle = 'rgba(173, 216, 230, 0.16)';
    drawCloud(scrollOffset + 300, cloudY2, 100, 35);

    // Cloud 3 (pink)
    ctx.fillStyle = 'rgba(255, 182, 193, 0.14)';
    drawCloud(scrollOffset - 200, cloudY3, 70, 25);

    // Cloud 4 (cyan)
    ctx.fillStyle = 'rgba(224, 255, 255, 0.15)';
    drawCloud(scrollOffset + 600, cloudY1 + 20, 90, 32);

    // Wrap around clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    drawCloud(scrollOffset - 100 - canvas.width - 200, cloudY1, 80, 30);
    ctx.fillStyle = 'rgba(173, 216, 230, 0.16)';
    drawCloud(scrollOffset + 300 - canvas.width - 200, cloudY2, 100, 35);
}

function drawCloud(x, y, width, height) {
    ctx.beginPath();
    ctx.arc(x, y, height / 2, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(x + width * 0.33, y - height / 2, height * 0.6, Math.PI, Math.PI * 2);
    ctx.arc(x + width * 0.66, y - height / 2, height * 0.5, Math.PI, Math.PI * 2);
    ctx.arc(x + width, y, height / 2, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
    ctx.fill();
}

// ============================================================
// DRAW SUN
// ============================================================
function drawSun(x, y) {
    // Glow effect
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 60);
    glowGradient.addColorStop(0, 'rgba(255, 200, 0, 0.3)');
    glowGradient.addColorStop(0.5, 'rgba(255, 150, 0, 0.1)');
    glowGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, 60, 0, Math.PI * 2);
    ctx.fill();

    // Sun body
    const sunGradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
    sunGradient.addColorStop(0, '#ffeb3b');
    sunGradient.addColorStop(1, '#ff9800');
    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();

    // Sun rays
    ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x1 = x + Math.cos(angle) * 50;
        const y1 = y + Math.sin(angle) * 50;
        const x2 = x + Math.cos(angle) * 70;
        const y2 = y + Math.sin(angle) * 70;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}

// ============================================================
// DRAW MOUNTAINS
// ============================================================
function drawMountains(horizonY) {
    // Mountain 1 (far back, purple)
    ctx.fillStyle = 'rgba(147, 112, 219, 0.3)';
    ctx.beginPath();
    ctx.moveTo(-50, horizonY);
    ctx.lineTo(200, horizonY - 150);
    ctx.lineTo(450, horizonY);
    ctx.closePath();
    ctx.fill();

    // Mountain 2 (middle, blue)
    ctx.fillStyle = 'rgba(65, 105, 225, 0.4)';
    ctx.beginPath();
    ctx.moveTo(300, horizonY);
    ctx.lineTo(550, horizonY - 180);
    ctx.lineTo(800, horizonY);
    ctx.closePath();
    ctx.fill();

    // Mountain 3 (right side, blue-green)
    ctx.fillStyle = 'rgba(72, 209, 204, 0.35)';
    ctx.beginPath();
    ctx.moveTo(800, horizonY);
    ctx.lineTo(1050, horizonY - 160);
    ctx.lineTo(1300, horizonY);
    ctx.closePath();
    ctx.fill();

    // Snow caps
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.moveTo(200, horizonY - 150);
    ctx.lineTo(180, horizonY - 100);
    ctx.lineTo(220, horizonY - 100);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(550, horizonY - 180);
    ctx.lineTo(520, horizonY - 120);
    ctx.lineTo(580, horizonY - 120);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(1050, horizonY - 160);
    ctx.lineTo(1020, horizonY - 100);
    ctx.lineTo(1080, horizonY - 100);
    ctx.closePath();
    ctx.fill();
}

// ============================================================
// DRAW FLOWERS
// ============================================================
function drawFlowers(horizonY) {
    const flowers = [
        { x: 150, y: horizonY - 15, color: '#ff1493', stem: '#228b22' },
        { x: 350, y: horizonY - 12, color: '#ff69b4', stem: '#2d5016' },
        { x: 600, y: horizonY - 18, color: '#ffd700', stem: '#228b22' },
        { x: 800, y: horizonY - 14, color: '#ff6347', stem: '#2d5016' },
        { x: 1000, y: horizonY - 16, color: '#da70d6', stem: '#228b22' },
        { x: 1100, y: horizonY - 13, color: '#00ced1', stem: '#2d5016' },
    ];

    flowers.forEach(flower => {
        // Stem
        ctx.strokeStyle = flower.stem;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(flower.x, horizonY);
        ctx.lineTo(flower.x, flower.y);
        ctx.stroke();

        // Petals
        ctx.fillStyle = flower.color;
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const px = flower.x + Math.cos(angle) * 6;
            const py = flower.y + Math.sin(angle) * 6;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Center
        ctx.fillStyle = '#ffdd00';
        ctx.beginPath();
        ctx.arc(flower.x, flower.y, 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

// ============================================================
// DRAW GRASS DETAILS (COLORFUL)
// ============================================================
function drawGrassDetails(horizonY) {
    const spacing = 12;
    const grassColors = [
        'rgba(46, 204, 113, 0.3)',   // Bright green
        'rgba(52, 211, 153, 0.3)',   // Emerald
        'rgba(76, 175, 80, 0.3)',    // Medium green
        'rgba(39, 174, 96, 0.3)',    // Forest green
    ];

    for (let x = 0; x < canvas.width; x += spacing) {
        const colorIdx = Math.floor((x / spacing) % grassColors.length);
        ctx.strokeStyle = grassColors[colorIdx];
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        const height = 12 + Math.sin(x * 0.05 + frameIndex * 0.1) * 4;
        const wobble = Math.sin(x * 0.08 + frameIndex * 0.05) * 2;

        // Main blade
        ctx.beginPath();
        ctx.moveTo(x + wobble, horizonY);
        ctx.lineTo(x + wobble + 2, horizonY - height);
        ctx.stroke();

        // Side blade
        ctx.beginPath();
        ctx.moveTo(x + 5 + wobble, horizonY);
        ctx.lineTo(x + 3 + wobble, horizonY - height * 0.75);
        ctx.stroke();
    }
}

// ============================================================
// DRAW ENVIRONMENT (Sky + Ground)
// ============================================================
function drawEnvironment() {
    const horizon = canvas.height * 0.65;

    // SKY GRADIENT (vibrant sunset/sunrise vibes)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGradient.addColorStop(0, '#0f1f3c');           // Deep purple-blue top
    skyGradient.addColorStop(0.3, '#2d5a9f');        // Bright blue
    skyGradient.addColorStop(0.6, '#5a8fc7');        // Sky blue
    skyGradient.addColorStop(1, '#87ceeb');          // Light cyan
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, horizon);

    // SUN
    drawSun(canvas.width * 0.85, canvas.height * 0.2);

    // MOUNTAINS in background
    drawMountains(horizon);

    // CLOUDS (colorful)
    drawClouds(frameIndex);

    // GROUND GRADIENT (vibrant grass)
    const groundGradient = ctx.createLinearGradient(0, horizon, 0, canvas.height);
    groundGradient.addColorStop(0, '#2ecc71');       // Bright green
    groundGradient.addColorStop(0.5, '#27ae60');     // Medium green
    groundGradient.addColorStop(1, '#1e8449');       // Dark forest green
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);

    // FLOWERS and details
    drawFlowers(horizon);

    // GRASS DETAILS (blades)
    drawGrassDetails(horizon);

    // GROUND LINE
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(canvas.width, horizon);
    ctx.stroke();
}

// ============================================================
// DRAW SUN
// ============================================================
function drawSun(x, y) {
    // Glow effect
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 60);
    glowGradient.addColorStop(0, 'rgba(255, 200, 0, 0.3)');
    glowGradient.addColorStop(0.5, 'rgba(255, 150, 0, 0.1)');
    glowGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, 60, 0, Math.PI * 2);
    ctx.fill();

    // Sun body
    const sunGradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
    sunGradient.addColorStop(0, '#ffeb3b');
    sunGradient.addColorStop(1, '#ff9800');
    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();

    // Sun rays
    ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x1 = x + Math.cos(angle) * 50;
        const y1 = y + Math.sin(angle) * 50;
        const x2 = x + Math.cos(angle) * 70;
        const y2 = y + Math.sin(angle) * 70;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}

// ============================================================
// DRAW MOUNTAINS
// ============================================================
function drawMountains(horizonY) {
    // Mountain 1 (far back, purple)
    ctx.fillStyle = 'rgba(147, 112, 219, 0.3)';
    ctx.beginPath();
    ctx.moveTo(-50, horizonY);
    ctx.lineTo(200, horizonY - 150);
    ctx.lineTo(450, horizonY);
    ctx.closePath();
    ctx.fill();

    // Mountain 2 (middle, blue)
    ctx.fillStyle = 'rgba(65, 105, 225, 0.4)';
    ctx.beginPath();
    ctx.moveTo(300, horizonY);
    ctx.lineTo(550, horizonY - 180);
    ctx.lineTo(800, horizonY);
    ctx.closePath();
    ctx.fill();

    // Mountain 3 (right side, blue-green)
    ctx.fillStyle = 'rgba(72, 209, 204, 0.35)';
    ctx.beginPath();
    ctx.moveTo(800, horizonY);
    ctx.lineTo(1050, horizonY - 160);
    ctx.lineTo(1300, horizonY);
    ctx.closePath();
    ctx.fill();

    // Snow caps
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.moveTo(200, horizonY - 150);
    ctx.lineTo(180, horizonY - 100);
    ctx.lineTo(220, horizonY - 100);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(550, horizonY - 180);
    ctx.lineTo(520, horizonY - 120);
    ctx.lineTo(580, horizonY - 120);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(1050, horizonY - 160);
    ctx.lineTo(1020, horizonY - 100);
    ctx.lineTo(1080, horizonY - 100);
    ctx.closePath();
    ctx.fill();
}

// ============================================================
// DRAW COLORFUL CLOUDS
// ============================================================
function drawClouds(offset) {
    const cloudY1 = canvas.height * 0.12;
    const cloudY2 = canvas.height * 0.28;
    const cloudY3 = canvas.height * 0.20;

    const scrollOffset = (offset * 1.5) % (canvas.width + 200);

    // Cloud 1 (white)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    drawCloud(scrollOffset - 100, cloudY1, 80, 30);

    // Cloud 2 (light blue)
    ctx.fillStyle = 'rgba(173, 216, 230, 0.16)';
    drawCloud(scrollOffset + 300, cloudY2, 100, 35);

    // Cloud 3 (pink)
    ctx.fillStyle = 'rgba(255, 182, 193, 0.14)';
    drawCloud(scrollOffset - 200, cloudY3, 70, 25);

    // Cloud 4 (cyan)
    ctx.fillStyle = 'rgba(224, 255, 255, 0.15)';
    drawCloud(scrollOffset + 600, cloudY1 + 20, 90, 32);

    // Wrap around clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    drawCloud(scrollOffset - 100 - canvas.width - 200, cloudY1, 80, 30);
    ctx.fillStyle = 'rgba(173, 216, 230, 0.16)';
    drawCloud(scrollOffset + 300 - canvas.width - 200, cloudY2, 100, 35);
}

function drawCloud(x, y, width, height) {
    ctx.beginPath();
    ctx.arc(x, y, height / 2, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(x + width * 0.33, y - height / 2, height * 0.6, Math.PI, Math.PI * 2);
    ctx.arc(x + width * 0.66, y - height / 2, height * 0.5, Math.PI, Math.PI * 2);
    ctx.arc(x + width, y, height / 2, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
    ctx.fill();
}

// ============================================================
// DRAW FLOWERS
// ============================================================
function drawFlowers(horizonY) {
    const flowers = [
        { x: 150, y: horizonY - 15, color: '#ff1493', stem: '#228b22' },
        { x: 350, y: horizonY - 12, color: '#ff69b4', stem: '#2d5016' },
        { x: 600, y: horizonY - 18, color: '#ffd700', stem: '#228b22' },
        { x: 800, y: horizonY - 14, color: '#ff6347', stem: '#2d5016' },
        { x: 1000, y: horizonY - 16, color: '#da70d6', stem: '#228b22' },
        { x: 1100, y: horizonY - 13, color: '#00ced1', stem: '#2d5016' },
    ];

    flowers.forEach(flower => {
        // Stem
        ctx.strokeStyle = flower.stem;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(flower.x, horizonY);
        ctx.lineTo(flower.x, flower.y);
        ctx.stroke();

        // Petals
        ctx.fillStyle = flower.color;
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const px = flower.x + Math.cos(angle) * 6;
            const py = flower.y + Math.sin(angle) * 6;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Center
        ctx.fillStyle = '#ffdd00';
        ctx.beginPath();
        ctx.arc(flower.x, flower.y, 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

// ============================================================
// DRAW HUD (On-Screen Text)
// ============================================================
function drawHUD(idx, step) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`Step: ${idx}/${trajectory.length - 1}`, 20, 30);
    ctx.fillText(`Reward: ${step.reward.toFixed(4)}`, 20, 50);
    ctx.fillText(`Actions: [${step.action.map(a => a.toFixed(2)).join(', ')}]`, 20, 70);
}

// ============================================================
// UPDATE SIDEBAR STATS
// ============================================================
function updateStats(idx, step) {
    cumulativeReward += step.reward;

    const parsed = parseWalkerState(step.state);

    document.getElementById('statStep').textContent = `${idx} / ${trajectory.length - 1}`;
    document.getElementById('statReward').textContent = step.reward.toFixed(4);
    document.getElementById('statCumulative').textContent = cumulativeReward.toFixed(2);
    document.getElementById('statVelX').textContent = parsed.velX.toFixed(3);

    // Progress bar
    const progress = (idx / (trajectory.length - 1)) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
}

// ============================================================
// UPDATE GRAPHS (Simple line charts)
// ============================================================
function updateGraphs() {
    if (!trajectory || trajectory.length === 0) return;

    // Reward chart
    drawLineChart('rewardChart', trajectory.map(s => s.reward), 'Reward', '#00d4ff');

    // Velocity chart
    const velocities = trajectory.map(s => parseWalkerState(s.state).velX);
    drawLineChart('velocityChart', velocities, 'Velocity X', '#7c3aed');

    // Actions chart (media delle 4 azioni)
    const actionMeans = trajectory.map(s =>
        s.action.reduce((a, b) => a + b, 0) / s.action.length
    );
    drawLineChart('actionsChart', actionMeans, 'Avg Action', '#ff6b6b');
}

// ============================================================
// SIMPLE LINE CHART ON SVG
// ============================================================
function drawLineChart(svgId, data, label, color) {
    const svg = document.getElementById(svgId);
    if (!svg) return;

    svg.innerHTML = '';

    const w = svg.clientWidth || 300;
    const h = 150;
    const padding = 30;
    const graphW = w - padding * 2;
    const graphH = h - padding * 2;

    // Normalize data
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;

    // Draw background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', w);
    bg.setAttribute('height', h);
    bg.setAttribute('fill', 'rgba(0, 0, 0, 0.2)');
    svg.appendChild(bg);

    // Draw axes
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', padding);
    line.setAttribute('y1', h - padding);
    line.setAttribute('x2', w - padding);
    line.setAttribute('y2', h - padding);
    line.setAttribute('stroke', 'rgba(255,255,255,0.3)');
    line.setAttribute('stroke-width', '1');
    svg.appendChild(line);

    // Draw points and line
    let pathData = `M ${padding} ${h - padding - ((data[0] - minVal) / range) * graphH}`;

    for (let i = 1; i < data.length; i++) {
        const x = padding + (i / (data.length - 1)) * graphW;
        const y = h - padding - ((data[i] - minVal) / range) * graphH;
        pathData += ` L ${x} ${y}`;
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);
}

// ============================================================
// ANIMATION LOOP
// ============================================================
function animate() {
    if (!playing || !trajectory.length) return;

    drawFrame();
    frameIndex += speed;

    if (frameIndex >= trajectory.length - 1) {
        playing = false;
        document.getElementById('playPauseBtn').textContent = '▶ Play';
        frameIndex = trajectory.length - 1;
        drawFrame();
        return;
    }

    requestAnimationFrame(animate);
}

// ============================================================
// EVENT LISTENERS
// ============================================================
document.getElementById('episodeSelect').addEventListener('change', (e) => {
    currentEpisode = parseInt(e.target.value);
    loadTrajectory(currentEpisode);
});

document.getElementById('speedRange').addEventListener('input', (e) => {
    speed = parseFloat(e.target.value);
    document.getElementById('speedLabel').textContent = speed + 'x';
});

document.getElementById('playPauseBtn').addEventListener('click', () => {
    playing = !playing;
    document.getElementById('playPauseBtn').textContent = playing ? '⏸ Pause' : '▶ Play';
    if (playing) animate();
});

document.getElementById('reloadBtn').addEventListener('click', () => {
    frameIndex = 0;
    cumulativeReward = 0;
    playing = false;
    document.getElementById('playPauseBtn').textContent = '▶ Play';
    drawFrame();
    updateGraphs();
});

// ============================================================
// INIT
// ============================================================
loadEpisodes();
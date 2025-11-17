// ============================================================
// STATE MANAGEMENT
// ============================================================
let episodes = [];
let currentEpisode = null;
let trajectory = [];
let goalFrame = null;
let goalX = null;
let walkerX = 0;
let lastVelX = 0;
let worldX = 0;
let playing = false;
let frameIndex = 0;
let speed = 1;
let cumulativeReward = 0;

// --- PHYSICS & PARTICLES ---
let particles = [];
let legTrail = [];
let footPressure = { leg0: 0, leg1: 0 };

const canvas = document.getElementById('walkerCanvas');
const ctx = canvas.getContext('2d');

// ============================================================
// PARTICLE SYSTEM
// ============================================================
class Particle {
    constructor(x, y, vx, vy, life, size, color, type = 'dust') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.size = size;
        this.color = color;
        this.type = type;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15; // gravità
        this.life -= 1;
        this.vx *= 0.96; // attrito
        this.rotation += this.rotSpeed;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha * 0.8;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        if (this.type === 'dust') {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'spark') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size;
            ctx.beginPath();
            ctx.moveTo(-5, 0);
            ctx.lineTo(5, 0);
            ctx.stroke();
        }

        ctx.restore();
    }
}

function emitParticles(x, y, count, vx, vy, color, type = 'dust') {
    for (let i = 0; i < count; i++) {
        const angle = (Math.random() * Math.PI * 2);
        const speed = Math.random() * 2 + 1;
        const px = x + (Math.random() - 0.5) * 10;
        const py = y + (Math.random() - 0.5) * 5;
        const pvx = Math.cos(angle) * speed + vx * 0.3;
        const pvy = Math.sin(angle) * speed + vy * 0.3;
        const life = Math.random() * 30 + 20;
        const size = Math.random() * 2 + 1;

        particles.push(new Particle(px, py, pvx, pvy, life, size, color, type));
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => p.draw(ctx));
}

// ============================================================
// LEG TRAIL SYSTEM
// ============================================================
class TrailPoint {
    constructor(x, y, life, isLeft) {
        this.x = x;
        this.y = y;
        this.life = life;
        this.maxLife = life;
        this.isLeft = isLeft;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        const color = this.isLeft ? '#9333ea' : '#f97316';
        ctx.strokeStyle = `rgba(${this.isLeft ? '147, 51, 234' : '249, 115, 22'}, ${alpha * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function addTrailPoint(x, y, isLeft) {
    legTrail.push(new TrailPoint(x, y, 15, isLeft));
}

function updateTrail() {
    for (let i = legTrail.length - 1; i >= 0; i--) {
        legTrail[i].life -= 1;
        if (legTrail[i].life <= 0) {
            legTrail.splice(i, 1);
        }
    }
}

function drawTrail() {
    legTrail.forEach(t => t.draw(ctx));
}

// ============================================================
// LOAD EPISODES
// ============================================================
async function loadEpisodes() {
    try {
        const res = await fetch('/walker/api/episodes');
        const data = await res.json();
        episodes = data.episodes || [];

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
        walkerX = 0;
        worldX = 0;
        lastVelX = 0;
        particles = [];
        legTrail = [];

        goalFrame = null;
        for (let i = 0; i < trajectory.length; i++) {
            if (trajectory[i].done) {
                goalFrame = trajectory[i];
                break;
            }
        }
        goalX = null;

        document.getElementById('statEpisode').textContent = ep;
        document.getElementById('playPauseBtn').textContent = '▶ Play';

        drawFrame();
        updateGraphs();
    } catch (err) {
        console.error('Error loading trajectory:', err);
    }
}

// ============================================================
// PARSE WALKER STATE
// ============================================================
function parseWalkerState(state) {
    if (!state || state.length < 20) {
        return {
            hullAngle: 0,
            hullAngVel: 0,
            hullVelX: 0,
            hullVelY: 0,
            leg0Hip: 0,
            leg0HipSpeed: 0,
            leg0Knee: 0,
            leg0KneeSpeed: 0,
            leg1Hip: 0,
            leg1HipSpeed: 0,
            leg1Knee: 0,
            leg1KneeSpeed: 0,
            leg0FootContact: false,
            leg1FootContact: false
        };
    }

    return {
        hullAngle: state[0],
        hullAngVel: state[1],
        hullVelX: state[2],
        hullVelY: state[3],
        leg0Hip: state[4],
        leg0HipSpeed: state[5],
        leg0Knee: state[6],
        leg0KneeSpeed: state[7],
        leg1Hip: state[8],
        leg1HipSpeed: state[9],
        leg1Knee: state[10],
        leg1KneeSpeed: state[11],
        leg0FootContact: state[12] > 0.5 || state[13] > 0.5 || state[14] > 0.5 || state[15] > 0.5,
        leg1FootContact: state[16] > 0.5 || state[17] > 0.5 || state[18] > 0.5 || state[19] > 0.5
    };
}

// ============================================================
// DRAW SHADOW
// ============================================================
function drawShadow(x, y, hullAngle) {
    const horizonY = canvas.height * 0.65;
    const shadowStretch = 1 + Math.abs(Math.sin(hullAngle)) * 0.3;

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#000000';

    ctx.beginPath();
    ctx.ellipse(x, horizonY, 35 * shadowStretch, 8, hullAngle * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// ============================================================
// DRAW MUSCLE TENSION VISUALIZATION
// ============================================================
function drawMuscleTension(state) {
    const parsed = parseWalkerState(state);

    // Calcola lo sforzo dai velocity (energia cinetica delle articolazioni)
    const leg0Effort = Math.min(1, (Math.abs(parsed.leg0HipSpeed) + Math.abs(parsed.leg0KneeSpeed)) / 10);
    const leg1Effort = Math.min(1, (Math.abs(parsed.leg1HipSpeed) + Math.abs(parsed.leg1KneeSpeed)) / 10);

    const x = canvas.width * 0.4;
    const y = canvas.height * 0.7 - 30;

    // Disegna aure di sforzo intorno al corpo
    ctx.save();

    // Leg 0 aura
    const aura0Alpha = leg0Effort * 0.3;
    ctx.fillStyle = `rgba(147, 51, 234, ${aura0Alpha})`;
    ctx.beginPath();
    ctx.arc(x - 20, y + 20, 15 + leg0Effort * 10, 0, Math.PI * 2);
    ctx.fill();

    // Leg 1 aura
    const aura1Alpha = leg1Effort * 0.3;
    ctx.fillStyle = `rgba(249, 115, 22, ${aura1Alpha})`;
    ctx.beginPath();
    ctx.arc(x + 20, y + 20, 15 + leg1Effort * 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    return { leg0Effort, leg1Effort };
}

// ============================================================
// DRAW JOINTS
// ============================================================
function drawJoints(x, y, hipAngle, kneeAngle) {
    const upperLeg = 35;
    const kneeX = x + Math.sin(hipAngle) * upperLeg;
    const kneeY = y + Math.cos(hipAngle) * upperLeg;

    const lowerLeg = 35;
    const footX = kneeX + Math.sin(hipAngle + kneeAngle) * lowerLeg;
    const footY = kneeY + Math.cos(hipAngle + kneeAngle) * lowerLeg;

    // Hip joint
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Knee joint
    ctx.save();
    ctx.fillStyle = 'rgba(200, 200, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(kneeX, kneeY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ankle joint
    ctx.save();
    ctx.fillStyle = 'rgba(255, 200, 200, 0.3)';
    ctx.beginPath();
    ctx.arc(footX, footY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// ============================================================
// DRAW WALKER WITH REALISM
// ============================================================
function drawWalker(state) {
    const parsed = parseWalkerState(state);
    const baseY = canvas.height * 0.7;
    const x = canvas.width * 0.4;
    const y = baseY - 30;

    const effort = drawMuscleTension(state);
    drawShadow(x, y, parsed.hullAngle);

    // Corpo
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(parsed.hullAngle);

    ctx.fillStyle = "#00d4ff";
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Gambe con trail
    drawLegWithTrail(x, y, parsed.leg0Hip, parsed.leg0Knee, "#9333ea", parsed.leg0FootContact, parsed.leg0HipSpeed, parsed.leg0KneeSpeed, true, baseY);
    drawLegWithTrail(x, y, parsed.leg1Hip, parsed.leg1Knee, "#f97316", parsed.leg1FootContact, parsed.leg1HipSpeed, parsed.leg1KneeSpeed, false, baseY);

    // Joints
    drawJoints(x, y, parsed.leg0Hip, parsed.leg0Knee);
    drawJoints(x, y, parsed.leg1Hip, parsed.leg1Knee);
}

// ============================================================
// DRAW LEG WITH TRAIL AND PARTICLES
// ============================================================
function drawLegWithTrail(cx, cy, hipAngle, kneeAngle, color, contact, hipSpeed, kneeSpeed, isLeft, horizonY) {
    const upperLeg = 35;
    const lowerLeg = 35;

    const kneeX = cx + Math.sin(hipAngle) * upperLeg;
    const kneeY = cy + Math.cos(hipAngle) * upperLeg;

    const footX = kneeX + Math.sin(hipAngle + kneeAngle) * lowerLeg;
    const footY = kneeY + Math.cos(hipAngle + kneeAngle) * lowerLeg;

    // Draw leg
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(kneeX, kneeY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();

    // Foot contact indicator
    const contactStrength = contact ? 1 : 0.3;
    ctx.beginPath();
    ctx.fillStyle = contact ? "#22c55e" : "#e11d48";
    ctx.globalAlpha = contactStrength;
    ctx.arc(footX, footY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Trail points
    if (Math.random() < 0.3) {
        addTrailPoint(footX, footY, isLeft);
    }

    // Particles al contatto
    if (contact) {
        const speed = Math.abs(hipSpeed) + Math.abs(kneeSpeed);
        if (speed > 0.5) {
            const dustColor = 'rgba(139, 111, 78, 0.6)';
            emitParticles(footX, footY, Math.floor(speed * 2), 0, -1, dustColor, 'dust');
            footPressure[isLeft ? 'leg0' : 'leg1'] = Math.min(1, speed / 5);
        }
    } else {
        footPressure[isLeft ? 'leg0' : 'leg1'] *= 0.9;
    }
}

// ============================================================
// DRAW FOOT PRESSURE INDICATOR
// ============================================================
function drawFootPressureIndicator() {
    const baseY = canvas.height * 0.7;
    const x = canvas.width * 0.4;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 11px monospace';

    const p0 = (footPressure.leg0 * 100).toFixed(0);
    const p1 = (footPressure.leg1 * 100).toFixed(0);

    ctx.fillText(`L:${p0}%`, x - 35, baseY + 50);
    ctx.fillText(`R:${p1}%`, x + 15, baseY + 50);

    ctx.restore();
}

// ============================================================
// COMPUTE GOAL X POSITION
// ============================================================
function computeGoalX(worldOffset) {
    if (!goalFrame || !goalFrame.state || goalFrame.state.length < 1) return null;

    const walkerGoalX = goalFrame.state[0];
    const walkerScreenX = canvas.width * 0.4;
    const dx = walkerGoalX * 5 - worldOffset;

    return walkerScreenX + dx;
}

// ============================================================
// DRAW GOAL WITH ENHANCED EFFECTS
// ============================================================
function drawGoal(px) {
    if (px === null) return;

    ctx.save();

    // Glow effect
    const glowGradient = ctx.createRadialGradient(px, canvas.height * 0.65, 0, px, canvas.height * 0.65, 100);
    glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.2)');
    glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(px - 100, 0, 200, canvas.height);

    // Linea verticale oro
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, canvas.height);
    ctx.stroke();

    // Bandierina animata
    ctx.fillStyle = "#FFD700";
    const waveOffset = Math.sin(frameIndex * 0.05) * 3;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px + 20 + waveOffset, 14);
    ctx.lineTo(px + waveOffset, 28);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

// ============================================================
// DRAW ENVIRONMENT (con wind effect)
// ============================================================
function drawEnvironment(worldOffset) {
    const horizon = canvas.height * 0.65;

    const skyGradient = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGradient.addColorStop(0, '#0f1f3c');
    skyGradient.addColorStop(0.3, '#2d5a9f');
    skyGradient.addColorStop(0.6, '#5a8fc7');
    skyGradient.addColorStop(1, '#87ceeb');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, horizon);

    drawSun(canvas.width * 0.85, canvas.height * 0.2);
    drawMountains(horizon);
    drawClouds(worldOffset);

    const groundGradient = ctx.createLinearGradient(0, horizon, 0, canvas.height);
    groundGradient.addColorStop(0, '#2ecc71');
    groundGradient.addColorStop(0.5, '#27ae60');
    groundGradient.addColorStop(1, '#1e8449');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);

    drawFlowers(horizon, worldOffset);
    drawGrassDetails(horizon, worldOffset);

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
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 60);
    glowGradient.addColorStop(0, 'rgba(255, 200, 0, 0.3)');
    glowGradient.addColorStop(0.5, 'rgba(255, 150, 0, 0.1)');
    glowGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, 60, 0, Math.PI * 2);
    ctx.fill();

    const sunGradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
    sunGradient.addColorStop(0, '#ffeb3b');
    sunGradient.addColorStop(1, '#ff9800');
    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();

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
    ctx.fillStyle = 'rgba(147, 112, 219, 0.3)';
    ctx.beginPath();
    ctx.moveTo(-50, horizonY);
    ctx.lineTo(200, horizonY - 150);
    ctx.lineTo(450, horizonY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(65, 105, 225, 0.4)';
    ctx.beginPath();
    ctx.moveTo(300, horizonY);
    ctx.lineTo(550, horizonY - 180);
    ctx.lineTo(800, horizonY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(72, 209, 204, 0.35)';
    ctx.beginPath();
    ctx.moveTo(800, horizonY);
    ctx.lineTo(1050, horizonY - 160);
    ctx.lineTo(1300, horizonY);
    ctx.closePath();
    ctx.fill();

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
// DRAW FLOWERS (con wind sway)
// ============================================================
function drawFlowers(horizonY, worldOffset) {
    const baseFlowers = [
        { x: 150, color: '#ff1493', stem: '#228b22' },
        { x: 350, color: '#ff69b4', stem: '#2d5016' },
        { x: 600, color: '#ffd700', stem: '#228b22' },
        { x: 800, color: '#ff6347', stem: '#2d5016' },
        { x: 1000, color: '#da70d6', stem: '#228b22' },
        { x: 1100, color: '#00ced1', stem: '#2d5016' },
    ];

    const scroll = worldOffset * 0.8;
    const width = canvas.width + 300;

    baseFlowers.forEach(f => {
        const fx = ((f.x - scroll) % width) - 100;
        const fy = horizonY - 15;

        // Wind sway
        const sway = Math.sin(frameIndex * 0.03 + f.x * 0.01) * 3;

        ctx.strokeStyle = f.stem;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fx, horizonY);
        ctx.quadraticCurveTo(fx + sway * 0.3, horizonY - 5, fx + sway, fy);
        ctx.stroke();

        ctx.fillStyle = f.color;
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const px = fx + sway + Math.cos(angle) * 6;
            const py = fy + Math.sin(angle) * 6;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#ffdd00';
        ctx.beginPath();
        ctx.arc(fx + sway, fy, 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

// ============================================================
// DRAW GRASS DETAILS (con wind)
// ============================================================
function drawGrassDetails(horizonY, worldOffset) {
    const spacing = 12;
    const grassColors = [
        'rgba(46, 204, 113, 0.3)',
        'rgba(52, 211, 153, 0.3)',
        'rgba(76, 175, 80, 0.3)',
        'rgba(39, 174, 96, 0.3)',
    ];

    const scroll = worldOffset;
    const windForce = Math.sin(frameIndex * 0.02) * 2;

    for (let i = -spacing; i < canvas.width + spacing; i += spacing) {
        const x = i - (scroll % spacing);
        const colorIdx = Math.floor((i / spacing) % grassColors.length);
        ctx.strokeStyle = grassColors[colorIdx];
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        const height = 12 + Math.sin((i + scroll) * 0.05 + frameIndex * 0.1) * 4;
        const wobble = Math.sin((i + scroll) * 0.08 + frameIndex * 0.05) * 2 + windForce;

        ctx.beginPath();
        ctx.moveTo(x + wobble, horizonY);
        ctx.lineTo(x + wobble + 2, horizonY - height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + 5 + wobble, horizonY);
        ctx.lineTo(x + 3 + wobble, horizonY - height * 0.75);
        ctx.stroke();
    }
}

// ============================================================
// DRAW CLOUDS
// ============================================================
function drawClouds(offset) {
    const cloudY1 = canvas.height * 0.12;
    const cloudY2 = canvas.height * 0.28;
    const cloudY3 = canvas.height * 0.20;

    const base = (offset * 0.2);

    function placeCloud(x, y, w, h, color) {
        ctx.fillStyle = color;
        drawCloud(((x - base) % (canvas.width + 200)) - 100, y, w, h);
    }

    placeCloud(0,   cloudY1, 80, 30, 'rgba(255, 255, 255, 0.18)');
    placeCloud(300, cloudY2, 100, 35, 'rgba(173, 216, 230, 0.16)');
    placeCloud(-200, cloudY3, 70, 25, 'rgba(255, 182, 193, 0.14)');
    placeCloud(600, cloudY1 + 20, 90, 32, 'rgba(224, 255, 255, 0.15)');
}

// ============================================================
// CLOUD SHAPE
// ============================================================
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
// DRAW FRAME
// ============================================================
function drawFrame() {
    if (!trajectory || trajectory.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const idx = Math.floor(frameIndex) % trajectory.length;
    const step = trajectory[idx];
    const parsed = parseWalkerState(step.state);

    const smoothVelX = (lastVelX * 0.8) + (parsed.hullVelX * 0.2);
    lastVelX = smoothVelX;

    worldX += smoothVelX * 5;

    updateParticles();
    updateTrail();

    drawEnvironment(worldX);
    drawTrail();
    drawParticles();

    goalX = computeGoalX(worldX);
    drawGoal(goalX);

    drawWalker(step.state);
    drawFootPressureIndicator();

    drawHUD(idx, step);
    updateStats(idx, step);
}

// ============================================================
// DRAW HUD
// ============================================================
function drawHUD(idx, step) {
    const reward = typeof step.reward === 'number' ? step.reward : 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`Step: ${idx}/${trajectory.length - 1}`, 20, 30);
    ctx.fillText(`Reward: ${reward.toFixed(4)}`, 20, 50);

    if (Array.isArray(step.action)) {
        ctx.fillText(
            `Actions: [${step.action.map(a =>
                (typeof a === 'number' ? a : 0).toFixed(2)
            ).join(', ')}]`,
            20,
            70
        );
    }
}

// ============================================================
// UPDATE SIDEBAR STATS
// ============================================================
function updateStats(idx, step) {
    const reward = typeof step.reward === 'number' ? step.reward : 0;
    cumulativeReward += reward;

    const parsed = parseWalkerState(step.state);

    document.getElementById('statStep').textContent =
        `${idx} / ${trajectory.length - 1}`;
    document.getElementById('statReward').textContent = reward.toFixed(4);
    document.getElementById('statCumulative').textContent =
        cumulativeReward.toFixed(2);
    document.getElementById('statVelX').textContent = parsed.hullVelX.toFixed(3);
    document.getElementById('statVelY').textContent = parsed.hullVelY.toFixed(3);
    document.getElementById('statContact').textContent =
        `${parsed.leg0FootContact ? 'L' : '_'}${parsed.leg1FootContact ? 'R' : '_'}`;

    const progress = (idx / (trajectory.length - 1)) * 100;
    document.getElementById('progressBar').style.width = progress + '%';

    const effort0 = Math.min(1, (Math.abs(parsed.leg0HipSpeed) + Math.abs(parsed.leg0KneeSpeed)) / 10);
    const effort1 = Math.min(1, (Math.abs(parsed.leg1HipSpeed) + Math.abs(parsed.leg1KneeSpeed)) / 10);

    ['action0', 'action1', 'action2', 'action3'].forEach((id, i) => {
        const val = Array.isArray(step.action) ? step.action[i] || 0 : 0;
        const elem = document.getElementById(id);
        if (elem) {
            elem.style.width = (((val + 1) / 2) * 100) + '%';
        }
        document.getElementById(`actionVal${i}`).textContent = val.toFixed(2);
    });
}

// ============================================================
// UPDATE GRAPHS
// ============================================================
function updateGraphs() {
    if (!trajectory || trajectory.length === 0) return;

    drawLineChart(
        'rewardChart',
        trajectory.map(s => (typeof s.reward === 'number' ? s.reward : 0)),
        'Reward',
        '#00d4ff'
    );

    const velocities = trajectory.map(s => {
        const p = parseWalkerState(s.state);
        return typeof p.hullVelX === 'number' ? p.hullVelX : 0;
    });
    drawLineChart('velocityChart', velocities, 'Velocity X', '#7c3aed');

    const actionMeans = trajectory.map(s => {
        if (!Array.isArray(s.action) || s.action.length === 0) return 0;
        const sum = s.action.reduce(
            (a, b) => a + (typeof b === 'number' ? b : 0),
            0
        );
        return sum / s.action.length;
    });
    drawLineChart('actionsChart', actionMeans, 'Avg Action', '#ff6b6b');

    const positions = trajectory.map(s => {
        if (!Array.isArray(s.state) || s.state.length < 1) return 0;
        return s.state[0] || 0;
    });
    drawLineChart('positionChart', positions, 'Position X', '#10b981');
}

// ============================================================
// SIMPLE LINE CHART ON SVG
// ============================================================
function drawLineChart(svgId, data, label, color) {
    const svg = document.getElementById(svgId);
    if (!svg || !data.length) return;

    svg.innerHTML = '';

    const w = svg.clientWidth || 300;
    const h = 150;
    const padding = 30;
    const graphW = w - padding * 2;
    const graphH = h - padding * 2;

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', w);
    bg.setAttribute('height', h);
    bg.setAttribute('fill', 'rgba(0, 0, 0, 0.2)');
    svg.appendChild(bg);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', padding);
    line.setAttribute('y1', h - padding);
    line.setAttribute('x2', w - padding);
    line.setAttribute('y2', h - padding);
    line.setAttribute('stroke', 'rgba(255,255,255,0.3)');
    line.setAttribute('stroke-width', '1');
    svg.appendChild(line);

    let pathData =
        `M ${padding} ${h - padding - ((data[0] - minVal) / range) * graphH}`;

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
    document.getElementById('playPauseBtn').textContent =
        playing ? '⏸ Pause' : '▶ Play';
    if (playing) animate();
});

document.getElementById('reloadBtn').addEventListener('click', () => {
    frameIndex = 0;
    cumulativeReward = 0;
    playing = false;
    walkerX = 0;
    worldX = 0;
    lastVelX = 0;
    particles = [];
    legTrail = [];
    document.getElementById('playPauseBtn').textContent = '▶ Play';
    drawFrame();
    updateGraphs();
});

// ============================================================
// INIT
// ============================================================
loadEpisodes();
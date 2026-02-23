// ========================================
// SETUP CANVAS RESPONSIVO
// ========================================

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let width = 0;
let height = 0;

function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    width = rect.width;
    height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resize);
resize();

// ========================================
// CAMERA 2D
// ========================================

let camera = {
    x: 0,
    y: 0,
    zoom: 1,
};

// ========================================
// CAMERA 3D ORBITAL SUAVE
// ========================================

let camera3D = {
    distance: 800,
    yaw: 0,
    pitch: 0.3,
    target: null,
    currentTargetPos: { x: 0, y: 0, z: 0 },
};

// ========================================
// MODO
// ========================================

let mode = "2d";

// ========================================
// MATEMÁTICA 3D
// ========================================

function vec3(x = 0, y = 0, z = 0) {
    return { x, y, z };
}

function add(a, b) {
    return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

function sub(a, b) {
    return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}

function scale(v, s) {
    return vec3(v.x * s, v.y * s, v.z * s);
}

function length(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerpVec(a, b, t) {
    return vec3(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));
}

// ========================================
// FÍSICA N-BODY
// ========================================

const G = 200;

function createBody({ mass, radius, position, velocity, color }) {
    return {
        mass,
        radius,
        position: vec3(position.x, position.y, position.z),
        velocity: vec3(velocity.x, velocity.y, velocity.z),
        acceleration: vec3(0, 0, 0),
        color,
        trail: [],
    };
}

const bodies = [];

// SOL
const sun = createBody({
    mass: 50000,
    radius: 20,
    position: vec3(0, 0, 0),
    velocity: vec3(0, 0, 0),
    color: "orange",
});

bodies.push(sun);

// Função para criar planeta orbitando
function createOrbitingPlanet({ centralBody, distance, mass, radius, color }) {
    const speed = Math.sqrt((G * centralBody.mass) / distance);

    return createBody({
        mass,
        radius,
        position: vec3(distance, 0, 0),
        velocity: vec3(0, speed, 0),
        color,
    });
}

// TERRA
const earth = createOrbitingPlanet({
    centralBody: sun,
    distance: 200,
    mass: 10,
    radius: 10,
    color: "cyan",
});

// MERCÚRIO
const mercury = createOrbitingPlanet({
    centralBody: sun,
    distance: 120,
    mass: 5,
    radius: 5,
    color: "tomato",
});

bodies.push(earth, mercury);

camera3D.target = sun;

// ========================================
// UPDATE FÍSICA
// ========================================

function updatePhysics(dt) {
    for (const b of bodies) {
        b.acceleration = vec3(0, 0, 0);
    }

    for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
            const a = bodies[i];
            const b = bodies[j];

            const r = sub(b.position, a.position);

            const distSq = r.x * r.x + r.y * r.y + r.z * r.z + 0.01;
            const dist = Math.sqrt(distSq);

            const force = (G * a.mass * b.mass) / distSq;
            const dir = scale(r, 1 / dist);
            const forceVec = scale(dir, force);

            a.acceleration = add(a.acceleration, scale(forceVec, 1 / a.mass));
            b.acceleration = add(b.acceleration, scale(forceVec, -1 / b.mass));
        }
    }

    for (const b of bodies) {
        b.velocity = add(b.velocity, scale(b.acceleration, dt));
        b.position = add(b.position, scale(b.velocity, dt));

        b.trail.push({ ...b.position });
        if (b.trail.length > 200) b.trail.shift();
    }
}

// ========================================
// CAMERA 3D UPDATE
// ========================================

function updateCamera() {
    camera3D.currentTargetPos = lerpVec(
        camera3D.currentTargetPos,
        camera3D.target.position,
        0.1,
    );
}

function transform3D(p) {
    let x = p.x - camera3D.currentTargetPos.x;
    let y = p.y - camera3D.currentTargetPos.y;
    let z = p.z - camera3D.currentTargetPos.z;

    // yaw
    const cosY = Math.cos(camera3D.yaw);
    const sinY = Math.sin(camera3D.yaw);

    let dx = cosY * x - sinY * z;
    let dz = sinY * x + cosY * z;

    x = dx;
    z = dz;

    // pitch
    const cosX = Math.cos(camera3D.pitch);
    const sinX = Math.sin(camera3D.pitch);

    let dy = cosX * y - sinX * z;
    dz = sinX * y + cosX * z;

    y = dy;
    z = dz;

    return { x, y, z };
}

function project3D(p) {
    const scale = camera3D.distance / (camera3D.distance + p.z);
    return {
        x: p.x * scale,
        y: p.y * scale,
        s: scale,
    };
}

// ========================================
// RENDER 2D
// ========================================

function render2D() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(camera.x, camera.y);

    for (const b of bodies) {
        // trilha
        ctx.beginPath();
        for (let i = 0; i < b.trail.length; i++) {
            const p = b.trail[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // planeta
        ctx.beginPath();
        ctx.arc(b.position.x, b.position.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
    }

    ctx.restore();
}

// ========================================
// RENDER 3D
// ========================================

function render3D() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);

    const sorted = [...bodies].sort((a, b) => b.position.z - a.position.z);

    for (const b of sorted) {
        // trilha
        ctx.beginPath();
        for (let i = 0; i < b.trail.length; i++) {
            const t = transform3D(b.trail[i]);
            const p = project3D(t);

            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1;

        const t = transform3D(b.position);
        const p = project3D(t);

        ctx.beginPath();
        ctx.arc(p.x, p.y, b.radius * p.s, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
    }

    ctx.restore();
}

// ========================================
// INPUT
// ========================================

let isDragging = false;
let lastMouse = { x: 0, y: 0 };

canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
});

window.addEventListener("mouseup", () => (isDragging = false));

window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;

    if (mode === "2d") {
        camera.x += dx / camera.zoom;
        camera.y += dy / camera.zoom;
    }

    if (mode === "3d") {
        camera3D.yaw += dx * 0.005;
        camera3D.pitch += dy * 0.005;
        camera3D.pitch = Math.max(-1.5, Math.min(1.5, camera3D.pitch));
    }

    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
});

canvas.addEventListener("wheel", (e) => {
    e.preventDefault();

    if (mode === "2d") {
        const zoomFactor = 1.1;
        camera.zoom *= e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
    } else {
        camera3D.distance += e.deltaY * 0.5;
        camera3D.distance = Math.max(100, camera3D.distance);
    }
});

// ========================================
// TECLAS
// ========================================

window.addEventListener("keydown", (e) => {
    if (e.key === "m") mode = mode === "2d" ? "3d" : "2d";

    if (e.key === "1") camera3D.target = sun;
    if (e.key === "2") camera3D.target = earth;
    if (e.key === "3") camera3D.target = mercury;
});

// ========================================
// LOOP
// ========================================

let last = null;

function frame(ts) {
    const dt = last ? Math.min((ts - last) / 1000, 0.05) : 0.016;
    last = ts;

    updatePhysics(dt);

    if (mode === "3d") updateCamera();

    if (mode === "2d") render2D();
    else render3D();

    requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

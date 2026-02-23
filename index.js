const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let width = 0;
let height = 0;

const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    width = rect.width;
    height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};

window.addEventListener("resize", resize);
resize();

const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (v, s) => ({ x: v.x * s, y: v.y * s });
const length = (v) => Math.sqrt(v.x * v.x + v.y * v.y);
const normalize = (v) => {
    const len = length(v) || 1;
    return scale(v, 1 / len);
};

const G = 200;

function createBody({ mass, radius, position, velocity, color }) {
    return {
        mass,
        radius,
        position,
        velocity,
        acceleration: { x: 0, y: 0 },
        color,
    };
}

const bodies = [];

const sun = createBody({
    mass: 5000,
    radius: 20,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    color: "orange",
});

const orbitRadius = 200;
const orbitalSpeed = Math.sqrt((G * sun.mass) / orbitRadius);

const planet = createBody({
    mass: 10,
    radius: 6,
    position: { x: orbitRadius, y: 0 },
    velocity: { x: 0, y: orbitalSpeed },
    color: "cyan",
});

bodies.push(sun, planet);

function updatePhysics(dt) {
    for (const body of bodies) {
        body.acceleration = { x: 0, y: 0 };
    }

    for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
            const a = bodies[i];
            const b = bodies[j];

            const r = sub(b.position, a.position);
            const dist = length(r) + 0.1;
            const forceMag = (G * a.mass * b.mass) / (dist * dist);
            const dir = scale(r, 1 / dist);
            const force = scale(dir, forceMag);

            a.acceleration = add(a.acceleration, scale(force, 1 / a.mass));
            b.acceleration = add(b.acceleration, scale(force, -1 / b.mass));
        }
    }

    for (const body of bodies) {
        body.velocity = add(body.velocity, scale(body.acceleration, dt));
        body.position = add(body.position, scale(body.velocity, dt));
    }
}

function draw() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);

    for (const body of bodies) {
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, body.radius, 0, Math.PI * 2);
        ctx.fillStyle = body.color;
        ctx.fill();
    }

    ctx.restore();
}

let last = null;

function frame(ts) {
    const dt = last ? Math.min((ts - last) / 1000, 0.05) : 0.016;
    last = ts;

    updatePhysics(dt);
    draw();

    requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

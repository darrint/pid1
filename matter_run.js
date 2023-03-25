const Engine = Matter.Engine,
    Events = Matter.Events,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Common = Matter.Common,
    Vector = Matter.Vector,
    Query = Matter.Query,
    MouseConstraint = Matter.MouseConstraint,
    Constraint = Matter.Constraint,
    Composite = Matter.Composite;

const engine = Engine.create();

const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: 800,
        height: 600,
        // showAngleIndicator: true,
        showBounds: true,
        showPositions: false,
        showSleeping: true,
        wireframes: false,
    },
});

// create two boxes and a ground
// const boxA = Bodies.rectangle(50, 200, 80, 80);
// const boxB = Bodies.rectangle(750, 50, 80, 80);
// Composite.add(engine.world, [boxA, boxB]);

const colorIn = '#f55a3c'
const colorOut = '#f5d259'
const indicator = Bodies.rectangle(500, 296, 15, 15, { isStatic: true, isSensor: true, render: { strokeStyle: colorOut, fillStyle: 'transparent', lineWidth: 2 } });
const ground = Bodies.rectangle(400, 590, 8000, 10, { isStatic: true, angle: 0 });
Composite.add(engine.world, [ground, indicator]);

for (let i = 0; i < 20; i++) {
    Composite.add(engine.world, [Bodies.rectangle(Common.random(100, 700), Common.random(300, 350), Common.random(3, 10), Common.random(3, 10), { friction: 0.4 })])
}

const payload = Bodies.circle(200, 50, 10);
// Body.setMass(payload, 1)
const wheel = Bodies.circle(200, 300, 40, { friction: 0.4, render: { sprite: { texture: 'assets/Stormcloud_Wheel.svg', xScale: 0.5, yScale: 0.5 } } });
const join = Constraint.create({ bodyA: wheel, bodyB: payload, stiffness: 0.05, damping: 0.2 });
Composite.add(engine.world, [payload, wheel, join]);

Composite.add(engine.world, [MouseConstraint.create(engine)])

Render.run(render);

const runner = Runner.create();

function applyTorque(body, force) {
    let pos = { x: body.position.x, y: body.position.y - 0.5 }
    Body.applyForce(body, pos, { x: force, y: 0 })
    pos = { x: body.position.x, y: body.position.y + 0.5 }
    Body.applyForce(body, pos, { x: -force, y: 0 })
}

function clamp(magnitude, v) {
    if (v > magnitude) {
        return magnitude;
    } else if (v < -magnitude) {
        return (-magnitude)
    } else {
        return v;
    }
}

// Science! Maths!
class ControlPID {
    constructor(max, kp, ki, kd) {
        this.max = max;
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
        this.prevError = null;
        this.accError = 0;
    }

    run(setPoint, process, delta) {
        const error = setPoint - process;
        const p = error
        this.accError += delta ? error / delta : 0;
        const i = this.accError;

        const d = this.prevError ? (error - this.prevError) * delta : 0;
        let output = this.kp * p + this.ki * i + this.kd * d;
        output = clamp(this.max, output)
        this.prevError = error;
        return output;
    }
}

// TUNE HERE
const speedControl = new ControlPID(100, 5, 0, 3)
const angleControl = new ControlPID(30, 2, 0, 2)
const forceControl = new ControlPID(20, -0.01, 0, -0.01)

function applyForces(event) {
    const delta = event.source.delta;
    const xGoal = 500
    const speedGoal = speedControl.run(xGoal, payload.position.x, delta);
    const angleGoal = angleControl.run(speedGoal / delta, payload.velocity.x, delta);
    const force = forceControl.run(angleGoal, payload.position.x - wheel.position.x, delta);
    applyTorque(wheel, force)
}

Events.on(runner, 'afterUpdate', applyForces);

function checkIndicator(event) {
    if (Query.region([payload], indicator.bounds).includes(payload)) {
        indicator.render.strokeStyle = colorOut;
    } else {
        indicator.render.strokeStyle = colorIn;
    }
}

Events.on(runner, 'afterUpdate', checkIndicator);

Runner.run(runner, engine);

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
    Composite = Matter.Composite,
    World = Matter.World;

const WIDTH = window.innerWidth;

const engine = Engine.create();

const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: WIDTH,
        height: 800,
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

const startPositionSlider = document.getElementById('startPosition');
let startPosition = (parseFloat(startPositionSlider.value) / 100) * WIDTH;

const targetPositionSlider = document.getElementById('targetPosition');
let targetPosition = (parseFloat(targetPositionSlider.value) / 100) * WIDTH;

const colorIn = '#f55a3c'
const colorOut = '#f5d259'
let indicator = Bodies.rectangle(targetPosition, 296, 15, 15, { isStatic: true, isSensor: true, render: { strokeStyle: colorOut, fillStyle: 'transparent', lineWidth: 2 } });
let ground = Bodies.rectangle(400, 590, 8000, 10, { isStatic: true, angle: 0 });
Composite.add(engine.world, [ground, indicator]);

// for (let i = 0; i < 50; i++) {
//     Composite.add(engine.world, [Bodies.rectangle(Common.random(100, 900), Common.random(300, 350), Common.random(3, 10), Common.random(3, 10), { friction: 0.4 })])
// }

let payload = Bodies.circle(startPosition, 330, 10);
// Body.setMass(payload, 1)
let wheel = Bodies.circle(startPosition, 580, 40, { friction: 0.4, render: { sprite: { texture: 'assets/Stormcloud_Wheel.svg', xScale: 0.5, yScale: 0.5 } } });
let join = Constraint.create({ bodyA: wheel, bodyB: payload, stiffness: 0.05, damping: 0.2 });
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

    reset() {
        this.prevError = null;
        this.accError = 0;
    }

    setMax(max) {
        this.max = max;
    }

    setKp(kp) {
        this.kp = kp;
    }

    setKi(ki) {
        this.ki = ki;
    }

    setKd(kd) {
        this.kd = kd;
    }

    setPID(kp, ki, kd) {
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
    }

    setPIDWithMax(kp, ki, kd, max) {
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
        this.max = max;
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
// const speedControl = new ControlPID(100, 5, 0, 3)
// const angleControl = new ControlPID(30, 2, 0, 2)
// const forceControl = new ControlPID(20, -0.01, 0, -0.01)

const speedControl = new ControlPID(100, 0, 0, 0)
const angleControl = new ControlPID(30, 0, 0, 0)
const forceControl = new ControlPID(20, 0, 0, 0)

const resetButton = document.getElementById('resetSim');
resetButton.addEventListener('click', event => {
    event.preventDefault();
    World.clear(engine.world);
    Engine.clear(engine);
    Render.stop(render);
    Runner.stop(runner);
    
    targetPosition = (parseFloat(targetPositionSlider.value) / 100) * WIDTH;
    let indicator = Bodies.rectangle(targetPosition, 296, 15, 15, { isStatic: true, isSensor: true, render: { strokeStyle: colorOut, fillStyle: 'transparent', lineWidth: 2 } });
    let ground = Bodies.rectangle(400, 590, 8000, 10, { isStatic: true, angle: 0 });
    Composite.add(engine.world, [ground, indicator]);

    startPosition = (parseFloat(startPositionSlider.value) / 100) * WIDTH;
    payload = Bodies.circle(startPosition, 330, 10);
    wheel = Bodies.circle(startPosition, 580, 40, { friction: 0.4, render: { sprite: { texture: 'assets/Stormcloud_Wheel.svg', xScale: 0.5, yScale: 0.5 } } });
    join = Constraint.create({ bodyA: wheel, bodyB: payload, stiffness: 0.05, damping: 0.2 });
    Composite.add(engine.world, [payload, wheel, join]);
    Composite.add(engine.world, [MouseConstraint.create(engine)])
    Render.run(render);
    Runner.run(runner, engine);

    // Speed control PID inputs
    const speedKpInput = document.getElementById('speedKp');
    const speedKiInput = document.getElementById('speedKi');
    const speedKdInput = document.getElementById('speedKd');
    const speedMaxInput = document.getElementById('speedMax');
    const speedKp = parseFloat(speedKpInput.value);
    const speedKi = parseFloat(speedKiInput.value);
    const speedKd = parseFloat(speedKdInput.value);
    const speedMax = parseFloat(speedMaxInput.value);

    speedControl.setPIDWithMax(speedKp, speedKi, speedKd, speedMax);
    speedControl.reset();

    // Angle control PID inputs
    const angleKpInput = document.getElementById('angleKp');
    const angleKiInput = document.getElementById('angleKi');
    const angleKdInput = document.getElementById('angleKd');
    const angleMaxInput = document.getElementById('angleMax');
    const angleKp = parseFloat(angleKpInput.value);
    const angleKi = parseFloat(angleKiInput.value);
    const angleKd = parseFloat(angleKdInput.value);
    const angleMax = parseFloat(angleMaxInput.value);

    angleControl.setPIDWithMax(angleKp, angleKi, angleKd, angleMax);
    angleControl.reset();

    // Force control PID inputs
    const forceKpInput = document.getElementById('forceKp');
    const forceKiInput = document.getElementById('forceKi');
    const forceKdInput = document.getElementById('forceKd');
    const forceMaxInput = document.getElementById('forceMax');
    const forceKp = parseFloat(forceKpInput.value);
    const forceKi = parseFloat(forceKiInput.value);
    const forceKd = parseFloat(forceKdInput.value);
    const forceMax = parseFloat(forceMaxInput.value);

    forceControl.setPIDWithMax(forceKp, forceKi, forceKd, forceMax);
    forceControl.reset();
});

const updateButton = document.getElementById('updateSim');
updateButton.addEventListener('click', event => {
    targetPosition = (parseFloat(targetPositionSlider.value) / 100) * WIDTH;
    Body.setPosition(indicator, { x: targetPosition, y: indicator.position.y });

    // Speed control PID inputs
    const speedKpInput = document.getElementById('speedKp');
    const speedKiInput = document.getElementById('speedKi');
    const speedKdInput = document.getElementById('speedKd');
    const speedMaxInput = document.getElementById('speedMax');
    const speedKp = parseFloat(speedKpInput.value);
    const speedKi = parseFloat(speedKiInput.value);
    const speedKd = parseFloat(speedKdInput.value);
    const speedMax = parseFloat(speedMaxInput.value);

    speedControl.setPIDWithMax(speedKp, speedKi, speedKd, speedMax);
    speedControl.reset();

    // Angle control PID inputs
    const angleKpInput = document.getElementById('angleKp');
    const angleKiInput = document.getElementById('angleKi');
    const angleKdInput = document.getElementById('angleKd');
    const angleMaxInput = document.getElementById('angleMax');
    const angleKp = parseFloat(angleKpInput.value);
    const angleKi = parseFloat(angleKiInput.value);
    const angleKd = parseFloat(angleKdInput.value);
    const angleMax = parseFloat(angleMaxInput.value);

    angleControl.setPIDWithMax(angleKp, angleKi, angleKd, angleMax);
    angleControl.reset();

    // Force control PID inputs
    const forceKpInput = document.getElementById('forceKp');
    const forceKiInput = document.getElementById('forceKi');
    const forceKdInput = document.getElementById('forceKd');
    const forceMaxInput = document.getElementById('forceMax');
    const forceKp = parseFloat(forceKpInput.value);
    const forceKi = parseFloat(forceKiInput.value);
    const forceKd = parseFloat(forceKdInput.value);
    const forceMax = parseFloat(forceMaxInput.value);

    forceControl.setPIDWithMax(forceKp, forceKi, forceKd, forceMax);
    forceControl.reset();
});

function applyForces(event) {
    const delta = event.source.delta;
    const xGoal = targetPosition;
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

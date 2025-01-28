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
const HEIGHT = 300;
const GROUND_LEVEL = HEIGHT;
const INDICATOR_LEVEL = GROUND_LEVEL - 200;
const PAYLOAD_HEIGHT = INDICATOR_LEVEL + 25;
const WHEEL_SIZE = 40;
const WHEEL_HEIGHT = GROUND_LEVEL - (WHEEL_SIZE / 2);

const engine = Engine.create();

const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: WIDTH,
        height: HEIGHT,
        showBounds: true,
        showPositions: false,
        showSleeping: true,
        wireframes: false,
    },
});

const startPositionSlider = document.getElementById('startPosition');
let startPosition = (parseFloat(startPositionSlider.value) / 100) * WIDTH;

const targetPositionSlider = document.getElementById('targetPosition');
let targetPosition = (parseFloat(targetPositionSlider.value) / 100) * WIDTH;

const colorIn = '#f55a3c';
const colorOut = '#f5d259';
let indicator = Bodies.rectangle(targetPosition, INDICATOR_LEVEL, 15, 15, { isStatic: true, isSensor: true, render: { strokeStyle: colorOut, fillStyle: 'transparent', lineWidth: 2 } });
let ground = Bodies.rectangle(400, GROUND_LEVEL, 8000, 10, { isStatic: true, angle: 0 });
Composite.add(engine.world, [ground, indicator]);

// for (let i = 0; i < 50; i++) {
//     Composite.add(engine.world, [Bodies.rectangle(Common.random(100, 900), Common.random(300, 350), Common.random(3, 10), Common.random(3, 10), { friction: 0.4 })])
// }

let payload = Bodies.circle(startPosition, PAYLOAD_HEIGHT, 10);
let wheel = Bodies.circle(startPosition, WHEEL_HEIGHT, WHEEL_SIZE, { friction: 0.4, render: { sprite: { texture: 'assets/Stormcloud_Wheel.svg', xScale: 0.5, yScale: 0.5 } } });
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
        this.lastOutput = 0;
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
        this.lastOutput = output;
        return output;
    }
}

const speedControl = new ControlPID(100, 0, 0, 0)
const angleControl = new ControlPID(30, 0, 0, 0)
const forceControl = new ControlPID(20, 0, 0, 0)

const speedKpInput = document.getElementById('speedKp');
const speedKiInput = document.getElementById('speedKi');
const speedKdInput = document.getElementById('speedKd');
const speedMaxInput = document.getElementById('speedMax');

const angleKpInput = document.getElementById('angleKp');
const angleKiInput = document.getElementById('angleKi');
const angleKdInput = document.getElementById('angleKd');
const angleMaxInput = document.getElementById('angleMax');

const forceKpInput = document.getElementById('forceKp');
const forceKiInput = document.getElementById('forceKi');
const forceKdInput = document.getElementById('forceKd');
const forceMaxInput = document.getElementById('forceMax');


const updateButton = document.getElementById('updateSim');
updateButton.addEventListener('click', () => {
    targetPosition = (parseFloat(targetPositionSlider.value) / 100) * WIDTH;
    World.remove(engine.world, indicator);
    indicator = Bodies.rectangle(targetPosition, INDICATOR_LEVEL, 15, 15, { isStatic: true, isSensor: true, render: { strokeStyle: colorOut, fillStyle: 'transparent', lineWidth: 2 } });
    Composite.add(engine.world, [indicator]);

    // Speed control PID inputs
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

const resetButton = document.getElementById('resetSim');
resetButton.addEventListener('click', event => {
    event.preventDefault();
    World.clear(engine.world);
    Engine.clear(engine);
    Render.stop(render);
    Runner.stop(runner);
    
    updateButton.click();
    targetPosition = (parseFloat(targetPositionSlider.value) / 100) * WIDTH;
    // We don't need to add the indicator here as it is added in updateButton.click()
    let ground = Bodies.rectangle(400, GROUND_LEVEL, 8000, 10, { isStatic: true, angle: 0 });
    Composite.add(engine.world, [ground]);

    startPosition = (parseFloat(startPositionSlider.value) / 100) * WIDTH;
    payload = Bodies.circle(startPosition, PAYLOAD_HEIGHT, 10);
    wheel = Bodies.circle(startPosition, WHEEL_HEIGHT, WHEEL_SIZE, { friction: 0.4, render: { sprite: { texture: 'assets/Stormcloud_Wheel.svg', xScale: 0.5, yScale: 0.5 } } });
    join = Constraint.create({ bodyA: wheel, bodyB: payload, stiffness: 0.05, damping: 0.2 });
    Composite.add(engine.world, [payload, wheel, join]);
    Composite.add(engine.world, [MouseConstraint.create(engine)])
    Render.run(render);
    Runner.run(runner, engine);

    // Clear the graph data
    positionGraphData.labels = [];
    positionGraphData.datasets.forEach(dataset => {
        dataset.data = [];
    });
    positionGraph.update();

    // Clear the graph data
    pidGraphData.labels = [];
    pidGraphData.datasets.forEach(dataset => {
        dataset.data = [];
    });
    pidGraph.update();
});

const setAcceptableValues = document.getElementById('setAcceptableValues');
setAcceptableValues.addEventListener('click', () => {
    // Set acceptable values for the PID inputs
    speedKpInput.value = 5;
    speedKiInput.value = 0;
    speedKdInput.value = 3;
    speedMaxInput.value = 100;

    angleKpInput.value = 2;
    angleKiInput.value = 0;
    angleKdInput.value = 2;
    angleMaxInput.value = 30;

    forceKpInput.value = -0.01;
    forceKiInput.value = 0;
    forceKdInput.value = -0.01;
    forceMaxInput.value = 20;

    // Trigger the reset button to reset the simulation
    resetButton.click();
})

function applyForces(event) {
    const delta = event.source.delta;
    const xGoal = targetPosition;
    const speedGoal = speedControl.run(xGoal, payload.position.x, delta);
    const angleGoal = angleControl.run(speedGoal / delta, payload.velocity.x, delta);
    const force = forceControl.run(angleGoal, payload.position.x - wheel.position.x, delta);
    applyTorque(wheel, force)
}

Events.on(runner, 'afterUpdate', applyForces);

const shouldRandomizeCheckbox = document.getElementById("randomizeTarget")
let setTheTimeout = false;
function checkIndicator() {
    if (Query.region([payload], indicator.bounds).includes(payload)) {
        indicator.render.strokeStyle = colorIn;
        if(!setTheTimeout && shouldRandomizeCheckbox.checked){
            setTheTimeout = true;
            setTimeout(() => {
                // Randomize the target position when reached
                setTheTimeout = false;
                if(!Query.region([payload], indicator.bounds).includes(payload))
                    return;
                let newTarget = Math.random() * 100
                targetPositionSlider.value = newTarget;
                targetPosition = ((newTarget / 100) * WIDTH);
                World.remove(engine.world, indicator);
                indicator = Bodies.rectangle(targetPosition, INDICATOR_LEVEL, 15, 15, { isStatic: true, isSensor: true, render: { strokeStyle: colorOut, fillStyle: 'transparent', lineWidth: 2 } });
                Composite.add(engine.world, [indicator]);
            }, 1000 + (Math.random() * 5000))
        }
    } else {
        indicator.render.strokeStyle = colorOut;
    }
}

const graphContainer = document.createElement('div');
graphContainer.id = 'graphContainer';
document.body.appendChild(graphContainer);



const positionGraphCheckbox = document.createElement('input');
positionGraphCheckbox.type = 'checkbox';
positionGraphCheckbox.id = 'chart1Checkbox';
positionGraphCheckbox.checked = true;
const positionGraphLabel = document.createElement('label');
positionGraphLabel.htmlFor = 'chart1Checkbox';
positionGraphLabel.appendChild(document.createTextNode('Enable Position Graph'));
graphContainer.appendChild(positionGraphCheckbox);
graphContainer.appendChild(positionGraphLabel);

const pidGraphCheckbox = document.createElement('input');
pidGraphCheckbox.type = 'checkbox';
pidGraphCheckbox.id = 'chart2Checkbox';
pidGraphCheckbox.checked = true;
const pidGraphLabel = document.createElement('label');
pidGraphLabel.htmlFor = 'chart2Checkbox';
pidGraphLabel.appendChild(document.createTextNode('Enable PID Graph'));
graphContainer.appendChild(pidGraphCheckbox);
graphContainer.appendChild(pidGraphLabel);

const positionGraphCanvas = document.createElement('canvas');
positionGraphCanvas.id = 'graphCanvas';
graphContainer.appendChild(positionGraphCanvas);

const positionGraphCTX = positionGraphCanvas.getContext('2d');
positionGraphCanvas.width = 800;
positionGraphCanvas.height = 200;

const positionGraphData = {
    labels: [],
    datasets: [
        {
            label: 'Target Position',
            borderColor: 'red',
            data: [],
            fill: false,
        },
        {
            label: 'Current Position',
            borderColor: 'blue',
            data: [],
            fill: false,
        },
        {
            label: 'Error',
            borderColor: 'green',
            data: [],
            fill: false,
        },
    ],
};

const positionConfig = {
    type: 'line',
    data: positionGraphData,
    options: {
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
            },
        },
    },
};

const positionGraph = new Chart(positionGraphCTX, positionConfig);

const pidGraphCanvas = document.createElement('canvas');
pidGraphCanvas.id = 'graphCanvas2';
graphContainer.appendChild(pidGraphCanvas);

const pidCTX = pidGraphCanvas.getContext('2d');
pidGraphCanvas.width = 800;
pidGraphCanvas.height = 200;

const pidGraphData = {
    labels: [],
    datasets: [
        {
            label: 'Speed',
            borderColor: 'yellow',
            data: [],
            fill: false,
        },
        {
            label: 'Angle',
            borderColor: 'purple',
            data: [],
            fill: false,
        },
        {
            label: 'Force',
            borderColor: 'orange',
            data: [],
            fill: false,
        },
    ],
};

const pidGraphConfig = {
    type: 'line',
    data: pidGraphData,
    options: {
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
            },
        },
    },
};

const pidGraph = new Chart(pidCTX, pidGraphConfig);

let startTime = Date.now();
let lastUpdateTime = 0;
const updateInterval = 100; // Update every 100ms

function updateGraph() {
    const currentTime = (Date.now() - startTime) / 1000;
    if (currentTime - lastUpdateTime >= updateInterval / 1000) {
        const scaledCurrentPosition = (payload.position.x / WIDTH) * 100;
        const scaledTargetPosition = (targetPosition / WIDTH) * 100;
        const error = scaledTargetPosition - scaledCurrentPosition;

        positionGraphData.labels.push(currentTime);
        positionGraphData.datasets[0].data.push({ x: currentTime, y: scaledTargetPosition });
        positionGraphData.datasets[1].data.push({ x: currentTime, y: scaledCurrentPosition });
        positionGraphData.datasets[2].data.push({ x: currentTime, y: error });
        positionGraph.update();

        pidGraphData.labels.push(currentTime);
        pidGraphData.datasets[0].data.push({ x: currentTime, y: speedControl.lastOutput });
        pidGraphData.datasets[1].data.push({ x: currentTime, y: angleControl.lastOutput });
        pidGraphData.datasets[2].data.push({ x: currentTime, y: forceControl.lastOutput });
        pidGraph.update();

        if (positionGraphCheckbox.checked) {
            positionGraphCanvas.style.display = 'block';
        } else {
            positionGraphCanvas.style.display = 'none';
        }

        if (pidGraphCheckbox.checked) {
            pidGraphCanvas.style.display = 'block';
        } else {
            pidGraphCanvas.style.display = 'none';
        }

        lastUpdateTime = currentTime;
    }
}

Events.on(runner, 'afterUpdate', updateGraph);

Events.on(runner, 'afterUpdate', checkIndicator);

Runner.run(runner, engine);
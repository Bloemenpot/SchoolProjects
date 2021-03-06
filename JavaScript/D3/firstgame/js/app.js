// Scene
const scene = new THREE.Scene();

// let camera, scene, renderer;
let world;
const originalBoxSize = 3;
let stack = [];
const boxHeight = 1;
let overhangs = [];

//setup cannonjs
world = new CANNON.World();
world.gravity.set(0, -10, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 40;


addLayer(0, 0, originalBoxSize, originalBoxSize);

addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");

// Add a cube to the scene
const geometry = new THREE.BoxGeometry(3, 1, 3);
const material = new THREE.MeshLambertMaterial({
  color: 0xfb8e00
});
const mesh = new THREE.Mesh(geometry, material);
mesh.position.set(0, 0, 0);
scene.add(mesh);

// Setup lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(10, 20, 0);
scene.add(directionalLight);

//Camera
const width = 10;
const height = width * (window.innerHeight / window.innerWidth);
const camera = new THREE.OrthographicCamera(
  width / -2, // left
  width / 2, // right
  height / 2, // top
  height / -2, // bottom
  1, // near
  100 //far
);

camera.position.set(4, 4, 4);
camera.lookAt(0, 0, 0)


//Renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.render(scene, camera);

document.body.appendChild(renderer.domElement);



function addLayer(x, z, width, depth, direction){
    console.log(stack.length);
    const y = boxHeight * stack.length;
    const layer = generateBox(x, y, z, width, depth, false);
    layer.direction = direction;

    stack.push(layer);
}

function addOverhang(x, z, width, depth) {
  const y = boxHeight * (stack.length -1);
  const overhang = generateBox(x, y, z, width, depth, true);
  overhangs.push(overhang);
}

function generateBox(x, y, z, width, depth, falls){
    const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
    const color = new THREE.Color(`hsl(${30 + stack.length * 4}, 100%, 50%)`);
    const material = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    scene.add(mesh);

    //cannonjs
    const shape = new CANNON.Box(
      new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2)
    );
    let mass = falls ? 5 : 0;
    const body = new CANNON.Body({ mass, shape });
    body.position.set(x, y, z);
    world.addBody(body);

    return{
        threejs: mesh,
        cannonjs: body,
        width,
        depth,
    };
}

let gameStarted = false;

window.addEventListener("click", () => {
    if(!gameStarted) {
        renderer.setAnimationLoop(animation);
        gameStarted = true;
    } else {
        const topLayer = stack[stack.length - 1];
        const previousLayer = stack[stack.length - 2];

        const direction = topLayer.direction;

        const delta = 
          topLayer.threejs.position[direction] - 
          previousLayer.threejs.position[direction];

        const overhangSize = Math.abs(delta);
        const size = direction == "x" ? topLayer.width : topLayer.depth;
        const overlap = size - overhangSize;

        if(overlap > 0) {
            const newWidth = direction == "x" ? overlap : topLayer.width;
            const newDepth = direction == "y" ? overlap : topLayer.depth;

            topLayer.width = newWidth;
            topLayer.depth = newDepth;

            topLayer.threejs.scale[direction] = overlap / size;
            topLayer.threejs.position[direction] -= delta / 2;

            // topLayer.cannonjs.position[direction] -= delta / 2;

            // const shape = new CANNON.Box(
            //   new CANNON.Vec3(newWidth / 2, boxHeight / 2, newDepth / 2)
            // );
            // topLayer.cannonjs.shapes = [];
            // topLayer.cannonjs.addShape(shape);

            const overhangShift = (overlap / 2 + overhangSize / 2) * Math.sign(delta);
            const overhangX =
              direction == "x"
                ? topLayer.threejs.position.x + overhangShift
                : topLayer.threejs.position.x;
            const overhangZ =
              direction == "z"
                ? topLayer.threejs.position.z + overhangShift
                : topLayer.threejs.position.z;
            const overhangWidth = direction == "x" ? overhangSize : newWidth;
            const overhangDepth = direction == "z" ? overhangSize : newDepth;

            addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth);

            // //next layer
            const nextX = direction == "x" ? topLayer.threejs.position.x : -10;
            const nextZ = direction == "z" ? topLayer.threejs.position.z : -10;
            
            // const nextX = direction == "x" ? 0 : -10;
            // const nextZ = direction == "z" ? 0 : -10;
            
            const nextDirection = direction == "x" ? "z" : "x";
            
            addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
        }
    }
});

function animation(){
    const speed = 0.15;
    
    const topLayer = stack[stack.length -1];
    topLayer.threejs.position[topLayer.direction] += speed;
    topLayer.cannonjs.position[topLayer.direction] += speed;

    if(camera.position.y < boxHeight * (stack.length - 2) + 4){
        camera.position.y += speed;
    }
    updatePhysics();
    renderer.render(scene, camera);
}

function updatePhysics() {
  world.step(1 / 60);

  overhangs.forEach((element) => {
    element.threejs.position.copy(element.cannonjs.position);
    element.threejs.quaternion.copy(element.cannonjs.quaternion);
  });
}

console.log(scene);
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { createBackground } from "./createBackground.js";
// Import functions
import { loadScene } from "./loadScene.js";
import { loadSidewalk } from "./loadSidewalk.js";
import {
  capAt,
  compareArrays1d,
  convertPosition,
  indexOf2d,
  inferMove,
  largestObstacle,
  shortenArrayList2,
  updateArray,
} from "./utils.js";

// ThreeJS
let camera, renderer, scene, dim, odim;
let mixers;
let animationId;
let isPlaying, isMoving;
let timeDelta, clock;
let mouse, raycaster, hoveredButton, mousePos, interactions;
let destinations = [];
let actions;
let pastObject = null;
let response_inter;
let speed = 2;

// Button definitions
let overlayCanvas = document.createElement("canvas");
let overlayCtx = overlayCanvas.getContext("2d");

const buttons = [
  {
    x: 0,
    y: 0,
    width: 40,
    height: 40,
    text: () => (isPlaying ? "⏸️" : "▶️"),
    action: onPlay,
    color: "#90EE90",
  },
  {
    x: 40,
    y: 0,
    width: 40,
    height: 40,
    text: () => "🔄",
    action: onReset,
    color: "#ADD8E6",
  },
];

export async function World(
  array_list,
  array_map,
  sidewalk_type,
  trial_type,
  interaction_info,
  actions_list,
  animation_controls = "all",
  camera_controls = true,
  c
) {
  // Initialize
  clock = new THREE.Clock();
  mixers = {};
  isPlaying = true;
  isMoving = false;

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  interactions = [];
  actions = actions_list;
  console.log(actions);

  // Buttons
  //const overlayCanvas = document.createElement("canvas");
  overlayCanvas.style.position = c.style.position;
  overlayCanvas.style.top = c.style.top;
  overlayCanvas.style.left = c.style.left;
  overlayCanvas.style.width = "300px";
  overlayCanvas.style.height = "40px";
  overlayCanvas.width = 300;
  overlayCanvas.height = 40;
  overlayCanvas.style.pointerEvents = "auto";
  overlayCanvas.style.display = "block";
  overlayCanvas.id = "overlay";
  //const overlayCtx = overlayCanvas.getContext("2d");
  c.parentNode.appendChild(overlayCanvas);

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  // Create scene
  scene = new THREE.Scene();
  scene.name = "scene";

  // For interacive
  if (trial_type == "interactive") {
    // Event listeners for clicking and highlighting
    renderer.domElement.addEventListener("click", inClick, false);
    renderer.domElement.addEventListener("mousemove", mouseHighlight);
  }

  // Information about character control
  scene.userData.moves = 0;
  if (trial_type == "interactive") {
    scene.userData.control_character = interaction_info.control_character;
    scene.userData.total_moves = interaction_info.moves;
  } else {
    scene.userData.control_character = "NA";
    scene.userData.total_moves = 0;
  }

  // Camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 10, 20);
  scene.userData.camera = camera;

  /* light
  let light = new THREE.AmbientLight(0x404040, 20); // soft white light
  scene.add(light);

  let directionalLight = new THREE.DirectionalLight(0xffffff, 5);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);
  */

  // Set camera controls
  if (camera_controls) {
    let controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 2;
    controls.maxDistance = 60;
    controls.target.set(0, 0, 0);
    controls.update();
    scene.userData.controls = controls;
  }

  // Calculate dim
  dim = [array_list[0].length, array_list[0][0].length];
  scene.userData.dim = dim;

  // Load sidewalk
  let obstacles = array_map.filter((x) => x.entity_type == "obstacle").map((x) => x.model_path);
  odim = await largestObstacle(obstacles);
  //console.log("ODIM: ", odim);
  await loadSidewalk(scene, sidewalk_type, odim, dim);

  // Create background
  await createBackground(scene, odim, dim);

  // Load scene
  let initial = array_list[0];
  await loadScene(scene, array_map, initial, mixers, odim, dim);

  //console.log("SCENE: ", scene);
  //console.log("MIXERS: ", mixers);

  // Store agents
  let agents = array_map.filter((x) => x.entity_type == "agent").map((x) => x.number);
  let names = array_map.filter((x) => x.entity_type == "agent").map((x) => x.name);
  let paths = {};
  let paths_m = {};
  let moves_inf = {};

  // Reduce array list
  let al = shortenArrayList2(array_list, agents);
  console.log("AL: ", al);

  // Create paths
  for (let i = 0; i < agents.length; i++) {
    let a = agents[i];
    let n = names[i];
    paths[n] = [];
    paths_m[n] = [];
    moves_inf[n] = [];

    for (let j = 0; j < al.length; j++) {
      let arr = al[j];
      let next = indexOf2d(arr, a);

      if (next.includes(-1)) {
        next = paths[n][paths[n].length - 1];
      }

      paths[n].push(next);

      let next_arr;
      if (j < al.length - 1) {
        next_arr = al[j + 1];
      } else {
        next_arr = al[j];
      }

      let move = inferMove(arr, next_arr, a);
      moves_inf[n].push(move);
    }

    paths_m[n] = paths[n].map((node) => convertPosition(node, odim, dim));
  }

  //console.log("PATHS_M: ", paths_m);

  scene.userData.names = names;
  scene.userData.agent_numbers = agents;
  scene.userData.array_list = al;

  scene.traverse((child) => {
    //console.log("CHILD NAME: ", child.name);
    if (!child.name.includes("sidewalk")) {
      //console.log("CHILD: ", child);
    }
    if (names.includes(child.name)) {
      child.path = paths[child.name];
      child.path_m = paths_m[child.name];

      child.idle_anim = array_map.filter((x) => x.name == child.name).map((x) => x.idle)[0];
      child.walk_anim = array_map.filter((x) => x.name == child.name).map((x) => x.walk)[0];
      console.log("ANIMATION NAMES: ", child.idle_anim, child.walk_anim);

      changeAnimation(scene, child.name, child.idle_anim);

      child.node = 0;
      child.fraction = 0;
      child.justFinished = true;

      let moves_in = array_map.filter((x) => x.name == child.name).map((x) => x.actions)[0];
      if (moves_in.includes(undefined)) {
        moves_in = moves_inf[child.name];
      }
      child.moves_in = moves_in;
      child.moves_inf = moves_inf[child.name];

      console.log("CHILD MOVES INPUT: ", child.moves_in);
      console.log("CHILD MOVES INFERRED: ", child.moves_inf);
    }
  });

  render();

  setTimeout(() => {
    // Code to be executed after 1000ms
    isPlaying = false;
  }, 50);

  // Button interaction state
  hoveredButton = null;
  mousePos = { x: 0, y: 0 };

  // Mouse event handlers
  overlayCanvas.addEventListener("mousemove", (event) => {
    let rect = overlayCanvas.getBoundingClientRect();
    mousePos.x = event.clientX - rect.left;
    mousePos.y = event.clientY - rect.top;

    // Check button hover
    let newHoveredButton = null;
    buttons.forEach((button, index) => {
      if (isPointInButton(mousePos.x, mousePos.y, button)) {
        newHoveredButton = index;
      }
    });

    if (newHoveredButton !== hoveredButton) {
      hoveredButton = newHoveredButton;
      overlayCanvas.style.cursor = hoveredButton !== null ? "pointer" : "default";
      drawButtons(overlayCanvas, overlayCtx);
    }
  });

  overlayCanvas.addEventListener("click", (event) => {
    let rect = overlayCanvas.getBoundingClientRect();
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;

    buttons.forEach((button) => {
      if (isPointInButton(x, y, button)) {
        button.action();
        drawButtons(overlayCanvas, overlayCtx); // Redraw to update button text
      }
    });
  });

  overlayCanvas.addEventListener("mouseleave", () => {
    hoveredButton = null;
    overlayCanvas.style.cursor = "default";
    drawButtons(overlayCanvas, overlayCtx);
  });

  // Draw buttons
  drawButtons(overlayCanvas, overlayCtx);
}

// Function to draw buttons on canvas
function drawButtons(canvas, canvas_2d) {
  canvas_2d.clearRect(0, 0, canvas.width, canvas.height);

  buttons.forEach((button, index) => {
    let isHovered = hoveredButton === index;

    // Button background
    canvas_2d.fillStyle = button.color;
    canvas_2d.globalAlpha = isHovered ? 0.9 : 0.7;

    // Rounded rectangle
    let radius = 8;
    canvas_2d.beginPath();
    canvas_2d.roundRect(button.x, button.y, button.width, button.height, radius);
    canvas_2d.fill();

    // Button border (when hovered)
    if (isHovered) {
      canvas_2d.strokeStyle = "#ffffff";
      canvas_2d.lineWidth = 2;
      canvas_2d.globalAlpha = 0.8;
      canvas_2d.stroke();
    }

    // Button text
    canvas_2d.globalAlpha = 1;
    canvas_2d.fillStyle = "#ffffff";
    canvas_2d.font = "16px Arial";
    canvas_2d.textAlign = "center";
    canvas_2d.textBaseline = "middle";

    let textX = button.x + button.width / 2;
    let textY = button.y + button.height / 2;
    canvas_2d.fillText(button.text(), textX, textY);
  });
}

// Check if point is inside button
function isPointInButton(x, y, button) {
  return (
    x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height
  );
}

function onPlay() {
  if (isPlaying == false || isMoving == false) {
    clock.getDelta();

    isPlaying = true;
    isMoving = true;
    render();
  } else {
    isPlaying = false;
    isMoving = false;
  }
}

function onReset() {
  if (isPlaying == false || isMoving == false) {
    onPlay();
  }
  let names = scene.userData.names;
  scene.traverse((child) => {
    if (names.includes(child.name)) {
      child.path_m = child.path.map((node) => convertPosition(node, odim, dim));
      child.node = 0;
      let position = child.path_m[child.node];

      let start_pos = new THREE.Vector3(position[0], 0.2, position[1]);
      child.position.copy(start_pos);
      child.justFinished = true;

      changeAnimation(scene, child.name, child.idle_anim);
    }
  });
  unhighlightAll(scene);
  isMoving = false;
  isPlaying = true;
  setTimeout(() => {
    // Code to be executed after 1000ms
    isPlaying = false;
  }, 50);
}

function advanceCharacter(scene, character, time) {
  let child = Array.from(scene.children).filter((child) => child.name === character)[0];
  let cc = scene.userData.control_character;
  let start, end, target;

  /* If character has reached end of path, just keep copying current node */
  if (child.path_m.length == child.node + 1) {
    target = child.path_m[child.path_m.length - 1];
    changeAnimation(scene, child.name, child.idle_anim);

    //console.log("CHILD NAME: ", child.name);
    let ot;
    if (child.name == "A") {
      ot = findOrient(child, dim);
      orientToAction(child, ot);
    } else if (child.name == "B") {
      ot = findOrient(child, dim);
      orientToAction(child, ot);
    }

    /* If user can control character, give interaction options */
    if (child.name == cc && child.justFinished == true) {
      let arr = scene.userData.array_list[child.node];
      let aactions = getActions(arr, child.path[child.node], actions);
      highlightTargets(scene, child.path[child.node], aactions);
      child.justFinished = false;
    }
  } else {
    let orient = true;
    // The fraction of the distance the character has covered is speed*time
    child.fraction += speed * time;

    // Prevent overshooting
    if (child.fraction > 1) {
      child.fraction = 1;
    }

    // Start is current node location; end is next node
    start = child.path_m[child.node];
    end = child.path_m[child.node + 1];

    // If blocked, fraction function caps at set point, then decreases to 0 and stops
    let cap = 0.5; // Character disappears if lower than 0.5
    let blocked =
      child.moves_in[child.node][0] != child.moves_inf[child.node][0] ||
      child.moves_in[child.node][1] != child.moves_inf[child.node][1];

    if (blocked) {
      console.log("BLOCKED! ", child.name, child.moves_in[child.node], child.moves_inf[child.node]);
      start = child.path_m[child.node];
      let pmove;
      if (child.fraction < 0.5) {
        pmove = [
          child.path[child.node][0] + cap * 2 * child.moves_in[child.node][0],
          child.path[child.node][1] + cap * 2 * child.moves_in[child.node][1],
        ];
        end = convertPosition(pmove, odim, dim);
      } else {
        pmove = [
          child.path[child.node][0] + cap * 2 * child.moves_in[child.node][0],
          child.path[child.node][1] + cap * 2 * child.moves_in[child.node][1],
        ];
        start = convertPosition(pmove, odim, dim);
        orient = false;
      }
    }

    // Target of current advance is faction of distance
    target = [
      start[0] + child.fraction * (end[0] - start[0]),
      start[1] + child.fraction * (end[1] - start[1]),
    ];

    //console.log(start, end, target)

    if (child.fraction >= 1) {
      child.node++;
      child.fraction = 0;

      // Orient to nearby character
      //orientToOther(scene, child);

      if (scene.userData.total_moves > scene.userData.moves) {
        child.justFinished = true;
      }
    }

    if (end[0] === start[0] && end[1] === start[1]) {
      changeAnimation(scene, child.name, child.idle_anim);

      // Orient to nearby character
      orientToOther(scene, child);
    } else {
      moveCharacter(scene, character, target, orient);
    }
  }
}

function moveCharacter(scene, character, target, orient = true) {
  let child = Array.from(scene.children).filter((child) => child.name === character)[0];
  let new_pos = new THREE.Vector3(target[0], 0.2, target[1]);

  if (!child.position.equals(new_pos)) {
    if (orient) {
      child.lookAt(new_pos);
    }
    child.position.copy(new_pos);

    changeAnimation(scene, character, child.walk_anim);
  }
}

// Change animation
function changeAnimation(scene, object, animation) {
  mixers[object]["active"] = mixers[object][animation];
}

// Find orientation away from start
function findOrient(child, dim) {
  let start = child.path[0];
  let out;
  if (start[1] == 0) {
    out = [0, 1];
  } else if (start[1] == dim[1] - 1) {
    out = [0, -1];
  }
  return out;
}

// Orient to action
function orientToAction(child, action) {
  let position = child.path[child.node];
  let destX = position[0] + action[0];
  let destY = position[1] + action[1];
  let dest = convertPosition([destX, destY], odim, dim);
  let pos = convertPosition(position, odim, dim);
  let new_pos = new THREE.Vector3(dest[0], 0.2, dest[1]);
  child.lookAt(new_pos);
}

// Orient to other
function orientToOther(scene, child, env_list = [0, 1]) {
  let arr = scene.userData.array_list[child.node];
  let position = child.path[child.node];
  let cc_num = arr[position[0]][position[1]];
  let acts = [
    [1, 0],
    [0, 1],
    [0, -1],
    [-1, 0],
  ];
  let omit_list = structuredClone(env_list);
  omit_list.push(cc_num);

  for (let act of acts) {
    let destX = position[0] + act[0];
    let destY = position[1] + act[1];
    if (arr.length > destX && destX >= 0) {
      if (arr[destX].length > destY && destY >= 0) {
        let target = arr[destX][destY];
        if (!omit_list.includes(target)) {
          let dest = convertPosition([destX, destY], odim, dim);
          let new_pos = new THREE.Vector3(dest[0], 0.2, dest[1]);
          child.lookAt(new_pos);
          break;
        }
      }
    }
  }
}

// Create action list
function getActions(array, position, actions) {
  let cc_num = array[position[0]][position[1]];
  let aactions = [];
  for (let action of actions) {
    let destX = position[0] + action[0];
    let destY = position[1] + action[1];
    if (array.length > destX && destX >= 0) {
      if (array[destX].length > destY && destY >= 0) {
        let target = array[destX][destY];
        if ([0, cc_num].includes(target)) {
          aactions.push(action);
        }
      }
    }
  }
  return aactions;
}

// Highlight target squares
function highlightTargets(scene, position, actions) {
  destinations = actions.map(
    (action) => "sidewalk_" + (position[0] + action[0]) + (position[1] + action[1])
  );
  scene.traverse((child) => {
    if (destinations.includes(child.name)) {
      child.material.color.set(0x90ee90);
    }
  });
}

function mouseHighlight() {
  //console.log("mouseover event");
  event.preventDefault();

  // Get the canvas bounding rectangle
  let rect = renderer.domElement.getBoundingClientRect();

  // Calculate mouse position relative to the canvas
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  if (destinations.length > 0) {
    raycaster.setFromCamera(mouse, camera);
    let intersects = raycaster.intersectObject(scene, true);

    if (intersects.length > 0) {
      let object = intersects[0].object;
      if (destinations.includes(object.name)) {
        object.material.color.set(0xff0000);
      }
      if (object != pastObject) {
        //console.log("new object");
        if (pastObject != null) {
          if (destinations.includes(pastObject.name)) {
            //console.log("restore color");
            pastObject.material.color.set(0x90ee90);
          }
        }
        pastObject = object;
      }
    } else {
      //console.log("No object");
      if (pastObject != null) {
        if (destinations.includes(pastObject.name)) {
          //console.log("restore color");
          pastObject.material.color.set(0x90ee90);
        }
      }
    }

    render();
  }
}

function unhighlightAll(scene) {
  scene.traverse((child) => {
    if (child.name.includes("sidewalk")) {
      child.material.color.set(child.userData.originalColor);
    }
  });
}

function inClick() {
  event.preventDefault();

  // Get character under control
  let cc = scene.userData.control_character;

  // Get the canvas bounding rectangle
  let rect = renderer.domElement.getBoundingClientRect();

  // Calculate mouse position relative to the canvas
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  let intersects = raycaster.intersectObject(scene, true);

  if (intersects.length > 0) {
    let object = intersects[0].object;
    //object.material.color.set( Math.random() * 0xffffff );

    if (destinations.includes(object.name)) {
      let child = Array.from(scene.children).filter((child) => child.name === cc)[0];

      // Add action to arrays
      child.path_m.push([object.position.x, object.position.z]);
      let new_pos = [
        parseInt(object.name.substring(9, 10)),
        parseInt(object.name.substring(10, 11)),
      ];
      child.path.push(new_pos);
      interactions.push(new_pos);

      let cc_num = scene.userData.agent_numbers[scene.userData.names.indexOf(cc)];
      let last_arr = [...scene.userData.array_list][scene.userData.array_list.length - 1];
      let new_arr = updateArray(last_arr, new_pos, cc_num);
      scene.userData.array_list.push(new_arr);
      scene.userData.moves++;

      // Resent
      unhighlightAll(scene);
      destinations = [];

      // Remove buttons
      if (scene.userData.moves == 1) {
        let canvas = document.getElementById("overlay"); // Assuming canvas has the ID 'overlay'
        canvas.style.display = "none";
      }

      if (scene.userData.moves == scene.userData.total_moves) {
        renderer.domElement.removeEventListener("click", inClick, false);
      }
    }
  }

  render();
}

// Render
function render() {
  //console.log("call render");
  if (isPlaying) {
    //console.log("isPlaying");
    timeDelta = speed * clock.getDelta();

    // Update all the animation frames
    if (Object.keys(mixers).length > 0) {
      for (var i = 0; i < Object.keys(mixers).length; ++i) {
        let objects = Object.keys(mixers);
        if (Object.keys(mixers[objects[i]]).includes("active")) {
          mixers[objects[i]]["active"].update(timeDelta);
        }
      }
    }

    if (isMoving) {
      //console.log("isMoving");

      let names = scene.userData.names;

      for (let name of names) {
        advanceCharacter(scene, name, timeDelta);
      }
    } else {
      //console.log("Not moving");
    }

    renderer.render(scene, scene.userData.camera);
    animationId = requestAnimationFrame(render);
  } else {
    //console.log("Not playing");
  }
}

export function endWorld() {
  // Remove existing canvas
  let elementToRemove = document.getElementById("overlay");
  elementToRemove.parentNode.removeChild(elementToRemove);

  // Create new canvas
  overlayCanvas = document.createElement("canvas");
  overlayCtx = overlayCanvas.getContext("2d");

  // Return
  response_inter = JSON.stringify(interactions);
  return response_inter;
}

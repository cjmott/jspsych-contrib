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
let mouse, raycaster, hoveredButton, mousePos, out;
let destinations = [];
let actions;
let pastObject = null;
let response_inter;
let speed = 1.5;
let t, tleft;
let played;

// For buttons
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
    color: "#ADD8E6",
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
  animation_controls,
  camera_controls,
  camera_position,
  c,
  pad_ends = true
) {
  // Initialize
  clock = new THREE.Clock();
  t = 0;
  tleft = pad_ends ? 25 : 20;
  mixers = {};
  isPlaying = false;
  isMoving = false;
  played = false;

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  out = [];
  actions = actions_list;
  console.log(actions);

  // Buttons
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
  camera.position.set(camera_position[0], camera_position[1], camera_position[2]);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  console.log("CAMERA:", camera);
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
  await loadScene(scene, array_map, initial, mixers, odim, dim, pad_ends);

  //console.log("SCENE: ", scene);
  //console.log("MIXERS: ", mixers);

  // Store agents
  let agents = array_map.filter((x) => x.entity_type == "agent").map((x) => x.number);
  let names = array_map.filter((x) => x.entity_type == "agent").map((x) => x.name);
  let paths = {};
  let paths_m = {};
  let moves_inf = {};
  let moves_in = {};
  let blocked = {};
  let addstart = {};
  let addend = {};
  let goals = {};

  // Reduce array list
  let al = shortenArrayList2(array_list, agents);

  console.log("AL: ", al);
  console.log("AL LENGTH: ", al.length);
  console.log("ARRAY LIST LENGTH: ", array_list.length);

  // Create paths
  for (let i = 0; i < agents.length; i++) {
    let a = agents[i];
    let n = names[i];
    paths[n] = [];
    paths_m[n] = [];
    moves_inf[n] = [];
    moves_in[n] = [];
    blocked[n] = [];
    let copy = false;

    actions = array_map.filter((x) => x.name == n).map((x) => x.actions)[0];
    if (actions.includes(undefined)) {
      copy = true;
    }

    for (let j = 0; j < al.length; j++) {
      let arr = al[j];
      let next = indexOf2d(arr, a);

      if (next.includes(-1)) {
        next = paths[n][paths[n].length - 1];
      }

      paths[n].push(next);

      // On first step determine goal
      if (j == 0) {
        let start = paths[n][0];
        if (start[1] == 0) {
          goals[n] = dim[1] - 1;
        } else if (start[1] == dim[1] - 1) {
          goals[n] = 0;
        } else {
          goals[n] = null;
        }
      }

      let next_arr;
      if (j < al.length - 1) {
        next_arr = al[j + 1];
        let move_inf = inferMove(arr, next_arr, a);

        let move_in = [0, 0];
        if (copy) {
          move_in = move_inf;
        } else if (goals[n] == dim[1] - 1) {
          move_in = actions[j];
        } else {
          let action = actions[j];
          if (action[0] != 0) {
            move_in[0] = -1 * action[0];
          }
          if (action[1] != 0) {
            move_in[1] = -1 * action[1];
          }
        }

        moves_inf[n].push(move_inf);
        moves_in[n].push(move_in);
        blocked[n].push(move_inf[0] != move_in[0] || move_inf[1] != move_in[1]);
      }
    }
    // Add padding at beginning and end
    scene.userData.pad_ends = pad_ends;
    addstart[n] = [];
    addend[n] = [];
    if (pad_ends) {
      let start = paths[n][0];
      let end = paths[n][paths[n].length - 1];
      let goaly;

      if (start[1] == 0) {
        addstart[n] = [
          [0, 1],
          [0, 1],
          [0, 1],
          [0, 1],
          [0, 1],
        ];
        paths[n] = [
          ...[
            [start[0], -5],
            [start[0], -4],
            [start[0], -3],
            [start[0], -2],
            [start[0], -1],
          ],
          ...paths[n],
        ];
        goaly = dim[1] - 1;

        if (end[1] == goaly) {
          addend[n] = [
            [0, 1],
            [0, 1],
            [0, 1],
            [0, 1],
            [0, 1],
          ];
          paths[n] = [
            ...paths[n],
            ...[
              [end[0], 1 + end[1]],
              [end[0], 2 + end[1]],
              [end[0], 3 + end[1]],
              [end[0], 4 + end[1]],
              [end[0], 5 + end[1]],
            ],
          ];
        }
      } else if (start[1] == dim[1] - 1) {
        addstart[n] = [
          [0, -1],
          [0, -1],
          [0, -1],
          [0, -1],
          [0, -1],
        ];
        paths[n] = [
          ...[
            [start[0], start[1] + 5],
            [start[0], start[1] + 4],
            [start[0], start[1] + 3],
            [start[0], start[1] + 2],
            [start[0], start[1] + 1],
          ],
          ...paths[n],
        ];
        goaly = 0;
        if (end[1] == goaly) {
          addend[n] = [
            [0, -1],
            [0, -1],
            [0, -1],
            [0, -1],
            [0, -1],
          ];
          paths[n] = [
            ...paths[n],
            ...[
              [end[0], -1],
              [end[0], -2],
              [end[0], -3],
              [end[0], -4],
              [end[0], -5],
            ],
          ];
        }
      } else {
        goaly = null;
      }
    }
    // Convert grid coordinates to real coordinates
    paths_m[n] = paths[n].map((pos) => convertPosition(pos, odim, dim));

    console.log("PATHS: ", paths[n], paths_m[n]);
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
      child.goal = goals[child.name];

      child.moves_in = [...addstart[child.name], ...moves_in[child.name], ...addend[child.name]];
      child.moves_inf = [...addstart[child.name], ...moves_inf[child.name], ...addend[child.name]];

      let fsarray = Array.from({ length: addstart[child.name].length }, () => false);
      let fearray = Array.from({ length: addend[child.name].length }, () => false);
      child.blocked = [...fsarray, ...blocked[child.name], ...fearray];

      console.log("CHILD PATH: ", child.path);
      console.log("CHILD MOVES INPUT: ", child.moves_in);
      console.log("CHILD MOVES INFERRED: ", child.moves_inf);
      console.log("BLOCKED: ", child.blocked);
    }
  });

  render();

  /*
  setTimeout(() => {
    // Code to be executed after 1000ms
    isPlaying = false;
  }, 5);
  */

  addButtons();
  onPlay();
}

// CREATE BUTTON OVERLAY
function addButtons() {
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

  // Timer
  // Paramters for content
  let x = 120;
  let y = 0;
  let width = 160;
  let height = 40;
  const text = () => "Time left: " + tleft;
  let color = "#008450";

  // Button background
  canvas_2d.fillStyle = color;
  canvas_2d.globalAlpha = 1;

  // Rounded rectangle
  let radius = 8;
  canvas_2d.beginPath();
  canvas_2d.roundRect(x, y, width, height, radius);
  canvas_2d.fill();

  // Button border (when hovered)
  if (tleft < 10) {
    canvas_2d.fillStyle = "#CC3232";
    canvas_2d.fill();
  }

  // Button text
  canvas_2d.globalAlpha = 1;
  canvas_2d.fillStyle = "#000000";
  canvas_2d.font = "16px Arial";
  canvas_2d.textAlign = "center";
  canvas_2d.textBaseline = "middle";

  let textX = x + width / 2;
  let textY = y + height / 2;
  canvas_2d.fillText(text(), textX, textY);
}

// Check if point is inside button
function isPointInButton(x, y, button) {
  return (
    x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height
  );
}

// Button functions
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
      t = 0;
      console.log("TIME LEFT: ", tleft);
      tleft = scene.userData.pad_ends ? 25 : 20;
      console.log("TIME LEFT: ", tleft);
      drawButtons(overlayCanvas, overlayCtx);
      let position = child.path_m[child.node];

      let start_pos = new THREE.Vector3(position[0], 0.2, position[1]);
      child.position.copy(start_pos);
      child.justFinished = true;

      changeAnimation(scene, child.name, child.idle_anim);
    }
  });
  unhighlightAll(scene);
  isMoving = false;
  isPlaying = false;
  onPlay();
  /*
  setTimeout(() => {
    // Code to be executed after 1000ms
    isPlaying = false;
  }, 10);
  */
}

function advanceCharacter(scene, character, time) {
  let child = Array.from(scene.children).filter((child) => child.name === character)[0];
  let cc = scene.userData.control_character;
  let start, end, target;

  /* If character has reached end of path, just keep copying current node */
  if (child.path_m.length <= child.node + 1) {
    // At end of path, look sad
    target = child.path_m[child.path_m.length - 1];

    if (child.goal > 0 && target[1] >= child.goal) {
      changeAnimation(scene, child.name, child.idle_anim);
    } else if (child.goal <= 0 && target[1] <= child.goal) {
      changeAnimation(scene, child.name, child.idle_anim);
    } else {
      changeAnimation(scene, child.name, "sad");
    }

    //console.log("CHILD NAME: ", child.name);
    let ot;
    if (["A", "B"].includes(child.name)) {
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

    // If blocked, fraction function caps at set point, then decreases to 0 and stops
    let cap = 0.3; // Character disappears if lower than 0.5
    let blocked = child.blocked[child.node];

    if (blocked) {
      console.log("BLOCKED! ", child.name, child.moves_in[child.node], child.moves_inf[child.node]);
    }

    if (blocked) {
      start = child.path[child.node];
      let pmove = child.moves_in[child.node];
      let amove;
      console.log("FRACTION: ", child.fraction);
      console.log("PLANNED MOVE: ", pmove);
      if (child.fraction < cap) {
        amove = [child.fraction * pmove[0], child.fraction * pmove[1]];
      } else if (child.fraction >= cap && child.fraction <= 1 - cap) {
        amove = [cap * pmove[0], cap * pmove[1]];
      } else if (child.fraction > 1 - cap) {
        amove = [(1 - child.fraction) * pmove[0], (1 - child.fraction) * pmove[1]];
        orient = false;
      }
      console.log("ACTUAL MOVE: ", amove);
      end = [start[0] + amove[0], start[1] + amove[1]];
      console.log("ACTUAL END: ", end);
      target = convertPosition(end, odim, dim);
      console.log("TARGET: ", target);
    } else {
      // Start is current node location; end is next node
      start = child.path_m[child.node];
      end = child.path_m[child.node + 1];
      // Target of current advance is faction of distance
      target = [
        start[0] + child.fraction * (end[0] - start[0]),
        start[1] + child.fraction * (end[1] - start[1]),
      ];
    }

    if (child.fraction >= 1) {
      child.node++;
      child.fraction = 0;

      if (scene.userData.total_moves > scene.userData.moves) {
        child.justFinished = true;
      }
    }

    if (end[0] === start[0] && end[1] === start[1] && !blocked) {
      // Orient to nearby character
      orientToOther(scene, child);
      // Become idle
      changeAnimation(scene, child.name, child.idle_anim);
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
  if (start[1] <= 0) {
    out = [0, 1];
  } else if (start[1] >= dim[1] - 1) {
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
  let arr;
  let node = scene.userData.pad_ends ? child.node - 5 : child.node;
  if (node > scene.userData.array_list.length) {
    node = scene.userData.array_list.length;
  } else {
    arr = scene.userData.array_list[node];
  }
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
      out.push(new_pos);

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
      let incTime = true;

      for (let name of names) {
        advanceCharacter(scene, name, timeDelta);
        let child = Array.from(scene.children).filter((child) => child.name === name)[0];

        if (child.node <= t) {
          incTime = false;
          if (child.node >= child.path.length - 1) {
            played = true;
          }
        }
      }

      if (incTime) {
        t++;
        tleft--;
        drawButtons(overlayCanvas, overlayCtx);
        if (tleft <= 0) {
          played = true;
        }
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
  response_inter = JSON.stringify(out);
  return response_inter;
}

export function checkWorld() {
  return played;
}

export async function World(
  array_list,
  array_map,
  sidewalk,
  trial_type,
  animation_controls = "all",
  camera_controls = true,
  c
) {
  // Alphabet array (will use later)
  const alpha = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
  ];

  // ThreeJS
  let camera, renderer, canvas, views, scene, dim;
  let mixers;
  let animationId;
  let isPlaying, isMoving;
  let timeDelta, clock, startTime, lastTime, thisTime;
  let mouse, raycaster;
  let destinations = [];
  let actions = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
  let pastObject = null;

  // Define init
  async function init(c, array_list) {
    // Initialize
    clock = new THREE.Clock();
    mixers = {};
    isPlaying = true;
    isMoving = false;

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    interactions = [];

    // Buttons
    const overlayCanvas = document.createElement("canvas");
    overlayCanvas.style.position = c.style.position;
    overlayCanvas.style.top = c.style.top;
    overlayCanvas.style.left = c.style.left;
    overlayCanvas.style.width = "300px";
    overlayCanvas.style.height = "40px";
    overlayCanvas.width = 300;
    overlayCanvas.height = 40;
    overlayCanvas.style.pointerEvents = "auto";
    overlayCanvas.id = "overlay";
    const overlayCtx = overlayCanvas.getContext("2d");
    c.parentNode.appendChild(overlayCanvas);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;

    // Add event listeners
    renderer.domElement.addEventListener("click", inClick, false);
    renderer.domElement.addEventListener("mousemove", mouseHighlight);

    // Create scene
    scene = new THREE.Scene();
    scene.name = "scene";

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 10, 20);
    scene.userData.camera = camera;

    // light
    const light = new THREE.AmbientLight(0x404040, 20); // soft white light
    scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Set camera controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 2;
    controls.maxDistance = 60;
    controls.target.set(0, 0, 0);
    controls.update();
    scene.userData.controls = controls;

    // Calculate dim
    dim = [array_list[0].length, array_list[0][0].length];
    scene.userData.dim = dim;

    // Load sidewalk
    await loadSidewalkv3(scene, dim);

    // Load scene
    let initial = array_list[0];
    await loadScenev2(scene, initial, mixers, dim);

    // Reduce array list
    let al = shortenArrayList(array_list);

    // Store agents
    let agents = initial.flat().filter((x) => x > 1);
    let letters = agents.map((i) => alpha[i - 2]);
    let paths = {};
    let paths_m = {};

    for (let i = 0; i < agents.length; i++) {
      let a = agents[i];
      let l = alpha[a - 2];
      paths[l] = [];
      paths_m[l] = [];

      for (let j = 0; j < al.length; j++) {
        let arr = al[j];
        let next = indexOf2d(arr, a);

        if (next.includes(-1)) {
          next = paths[l][paths[l].length - 1];
        }

        paths[l].push(next);
        //paths_m[l].push(convertPosition(next, "agent", dim));
      }

      paths_m[l] = paths[l].map((node) => convertPosition(node, "agent", dim));
    }

    scene.userData.letters = letters;
    scene.userData.array_list = al;

    scene.traverse((child) => {
      if (letters.includes(child.name)) {
        child.path = paths[child.name];
        child.path_m = paths_m[child.name];

        changeAnimation(scene, child.name, "idle");

        child.node = 0;
        child.fraction = 0;
        child.justFinished = true;
      }
    });

    render();

    setTimeout(() => {
      // Code to be executed after 1000ms
      isPlaying = false;
    }, 50);

    // Button definitions
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

    // Button interaction state
    let hoveredButton = null;
    let mousePos = { x: 0, y: 0 };

    // Mouse event handlers
    overlayCanvas.addEventListener("mousemove", (event) => {
      const rect = overlayCanvas.getBoundingClientRect();
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
        drawButtons();
      }
    });

    overlayCanvas.addEventListener("click", (event) => {
      const rect = overlayCanvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      buttons.forEach((button) => {
        if (isPointInButton(x, y, button)) {
          button.action();
          drawButtons(); // Redraw to update button text
        }
      });
    });

    overlayCanvas.addEventListener("mouseleave", () => {
      hoveredButton = null;
      overlayCanvas.style.cursor = "default";
      drawButtons();
    });

    // Draw buttons
    drawButtons();

    // Draw buttons on canvas
    function drawButtons() {
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      buttons.forEach((button, index) => {
        const isHovered = hoveredButton === index;

        // Button background
        overlayCtx.fillStyle = button.color;
        overlayCtx.globalAlpha = isHovered ? 0.9 : 0.7;

        // Rounded rectangle
        const radius = 8;
        overlayCtx.beginPath();
        overlayCtx.roundRect(button.x, button.y, button.width, button.height, radius);
        overlayCtx.fill();

        // Button border (when hovered)
        if (isHovered) {
          overlayCtx.strokeStyle = "#ffffff";
          overlayCtx.lineWidth = 2;
          overlayCtx.globalAlpha = 0.8;
          overlayCtx.stroke();
        }

        // Button text
        overlayCtx.globalAlpha = 1;
        overlayCtx.fillStyle = "#ffffff";
        overlayCtx.font = "16px Arial";
        overlayCtx.textAlign = "center";
        overlayCtx.textBaseline = "middle";

        const textX = button.x + button.width / 2;
        const textY = button.y + button.height / 2;
        overlayCtx.fillText(button.text(), textX, textY);
      });
    }

    // Check if point is inside button
    function isPointInButton(x, y, button) {
      return (
        x >= button.x &&
        x <= button.x + button.width &&
        y >= button.y &&
        y <= button.y + button.height
      );
    }
  }

  function onPlay() {
    if (isPlaying == false || isMoving == false) {
      startTime = performance.now();
      lastTime = startTime;

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
    let letters = scene.userData.letters;
    scene.traverse((child) => {
      if (letters.includes(child.name)) {
        child.path_m = child.path.map((node) => convertPosition(node, "agent", dim));
        child.node = 0;
        let position = child.path_m[child.node];

        let start_pos = new THREE.Vector3(position[0], 0.2, position[1]);
        child.position.copy(start_pos);
        child.justFinished = true;

        changeAnimation(scene, child.name, "idle");
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

    let start, end, target;

    if (child.path_m.length == child.node + 1) {
      target = child.path_m[child.path_m.length - 1];
      changeAnimation(scene, child.name, "idle");
      if (child.name == "A" && child.justFinished == true) {
        let arr = scene.userData.array_list[child.node];
        let aactions = getActions(arr, child.path[child.node], actions);
        highlightTargets(scene, child.path[child.node], aactions);
        child.justFinished = false;
      }
    } else {
      child.fraction += time;

      start = child.path_m[child.node];
      end = child.path_m[child.node + 1];

      target = [
        start[0] + child.fraction * (end[0] - start[0]),
        start[1] + child.fraction * (end[1] - start[1]),
      ];

      //console.log(start, end, target)

      if (child.fraction >= 1) {
        child.node++;
        child.fraction = 0;
      }

      if (end[0] === start[0] && end[1] === start[1]) {
        changeAnimation(scene, child.name, "idle");
      } else {
        moveCharacter(scene, character, target);
      }
    }
  }

  function moveCharacter(scene, character, target) {
    let child = Array.from(scene.children).filter((child) => child.name === character)[0];
    let new_pos = new THREE.Vector3(target[0], 0.2, target[1]);

    if (!child.position.equals(new_pos)) {
      child.lookAt(new_pos);
      child.position.copy(new_pos);

      changeAnimation(scene, character, "walk");
    }
  }

  // Change animation
  function changeAnimation(scene, object, animation) {
    mixers[object]["active"] = mixers[object][animation];
  }

  // Create action list
  function getActions(array, position, actions) {
    let aactions = [];
    for (let action of actions) {
      let destX = position[0] + action[0];
      let destY = position[1] + action[1];
      if (array.length > destX && destX >= 0) {
        if (array[destX].length > destY && destY >= 0) {
          let target = array[destX][destY];
          if (target == 0) {
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
    console.log("mouseover event");
    event.preventDefault();

    // Get the canvas bounding rectangle
    const rect = renderer.domElement.getBoundingClientRect();

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
          console.log("new object");
          if (pastObject != null) {
            if (destinations.includes(pastObject.name)) {
              console.log("restore color");
              pastObject.material.color.set(0x90ee90);
            }
          }
          pastObject = object;
        }
      } else {
        console.log("No object");
        if (pastObject != null) {
          if (destinations.includes(pastObject.name)) {
            console.log("restore color");
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

    // Get the canvas bounding rectangle
    const rect = renderer.domElement.getBoundingClientRect();

    // Calculate mouse position relative to the canvas
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    let intersects = raycaster.intersectObject(scene, true);

    if (intersects.length > 0) {
      let object = intersects[0].object;
      //object.material.color.set( Math.random() * 0xffffff );

      if (destinations.includes(object.name)) {
        let child = Array.from(scene.children).filter((child) => child.name === "A")[0];
        //child.path.push([parseInt(object.name.substring(9, 9)), parseInt(object.name.substring(10, 10))])
        child.path_m.push([object.position.x, object.position.z]);
        interactions.push([
          parseInt(object.name.substring(9, 10)),
          parseInt(object.name.substring(10, 11)),
        ]);
        unhighlightAll(scene);
        destinations = [];
        renderer.domElement.removeEventListener("click", inClick, false);

        // Remove buttons
        let canvas = document.getElementById("overlay"); // Assuming your canvas has the ID 'myCanvas'
        canvas.style.display = "none";
      }
    }

    render();
  }

  // Shorten array
  function shortenArrayList(a) {
    let out;
    out = a;
    if (a.length > 2) {
      for (var i = a.length - 2; i >= 1; i--) {
        let last = out[i];
        let seclast = out[i - 1];
        if (compareArrays2d(seclast, last)) {
          out.pop();
        }
      }
    }
    return out;
  }

  // Render
  function render() {
    if (isPlaying) {
      timeDelta = clock.getDelta();

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
        thisTime = performance.now();
        lastTime = thisTime;

        let letters = scene.userData.letters;

        for (let letter of letters) {
          advanceCharacter(scene, letter, timeDelta);
        }
      }

      renderer.render(scene, scene.userData.camera);
      animationId = requestAnimationFrame(render);
    }
  }
}

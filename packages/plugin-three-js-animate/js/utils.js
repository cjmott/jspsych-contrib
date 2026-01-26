import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export async function largestObstacle(obstacles) {
  //const gltfloader = new GLTFLoader().setPath("assets/");
  const gltfloader = new GLTFLoader();

  // Load obstacle model to get dimensions
  let filename, gltf;
  let uwidth = 0;
  let ulength = 0;

  for (let ob of obstacles) {
    filename = ob;
    gltf = await gltfloader.loadAsync(filename);

    gltf.scene.traverse((child) => {
      if (child.geometry != null) {
        let x =
          child.scale.x *
          Math.abs(child.geometry.boundingBox.max.x - child.geometry.boundingBox.min.x);
        let z =
          child.scale.z *
          Math.abs(child.geometry.boundingBox.max.z - child.geometry.boundingBox.min.z);
        if (x > uwidth) uwidth = x;
        if (z > ulength) ulength = z;
      }
    });
  }

  return [uwidth, ulength];
}

export function convertPosition(indices, odim, wdim) {
  //let bwidth = 1.5915793398780806;
  //let blength = 2.022771790592742;
  let bwidth = odim[0];
  let blength = odim[1];

  //let ws = [];
  //let ls = [];
  let fw, fl;

  fw = (bwidth * wdim[0]) / 2 - bwidth / 2;
  fl = (blength * wdim[1]) / 2 - blength / 2;

  /*
  for (let i = 0; i < wdim[0]; i++) {
    ws.push(bwidth * i - fw);
  }
  for (let j = 0; j < wdim[1]; j++) {
    ls.push(blength * j - fl);
  }

  let position = [ws[indices[0]], ls[indices[1]]];
  */

  let position = [bwidth * indices[0] - fw, blength * indices[1] - fl];
  //console.log("Convert Position: ", position);
  return position;
}

export function indexOf2d(array, item) {
  let num = array.flat().indexOf(item);
  if (num == -1) {
    return [-1, -1];
  }

  let i = Math.floor(num / array[0].length);
  let j = num - array[0].length * i;

  return [i, j];
}

export function allIndexOf2d(array, item) {
  let indices = [];
  let idx = array.flat().indexOf(item);
  while (idx !== -1) {
    let i = Math.floor(idx / array[0].length);
    let j = idx - array[0].length * i;
    indices.push([i, j]);

    idx = array.flat().indexOf(item, idx + 1);
  }
  return indices;
}

/* Define shuffle function */
export function shuffle(array) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
}

/* Define function to compare two 2d arrays */
export function compareArrays2d(a1, a2) {
  let out = false;
  if (a1.length === a2.length) {
    out = true;
    for (let i = 0; i < a1.length; i++) {
      out *= a1[i].every((value, index) => value === a2[i][index]);
    }
  }
  return out;
}

export function compareArrays1d(arrA, arrB) {
  return arrA.length === arrB.length && arrA.every((value, index) => value === arrB[index]);
}

/* Define function to infer move of agent between two arrays */
export function inferMove(arr1, arr2, a) {
  let out;
  if (compareArrays2d(arr1, arr2)) {
    out = [0, 0];
  } else {
    let l1 = indexOf2d(arr1, a);
    let l2 = indexOf2d(arr2, a);

    out = [l2[0] - l1[0], l2[1] - l1[1]];
  }
  return out;
}

/* Define function to fetch arrays */
export async function fetchArrays(files) {
  let array_lists = [];
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    let response = await fetch(file);
    let json = await response.json();
    let array_list;
    if (Object.keys(json[0]).includes("grid_with_agents")) {
      array_list = Object.keys(json).map((key) => json[key]["grid_with_agents"]);
    } else {
      array_list = Object.keys(json).map((key) => json[key]["grid_agent"]);
    }
    array_lists.push(array_list);
  }
  return array_lists;
}

export async function fetchArray(file) {
  let response = await fetch(file);
  let json = await response.json();
  let array_list;
  if (Object.keys(json[0]).includes("grid_with_agents")) {
    array_list = Object.keys(json).map((key) => json[key]["grid_with_agents"]);
  } else {
    array_list = Object.keys(json).map((key) => json[key]["grid_agent"]);
  }
  return array_list;
}

/* Functions from World.js */
// Update array
export function replaceDeepElement(arr, oldValue, newValue) {
  let out = [...arr];
  for (let i = 0; i < out.length; i++) {
    if (Array.isArray(out[i])) {
      out[i] = replaceDeepElement(out[i], oldValue, newValue); // Recursively call for nested arrays
    } else if (out[i] === oldValue) {
      out[i] = newValue; // Replace the element
    }
  }
  return out;
}

export function updateArray(arr, new_pos, num) {
  let out = [...replaceDeepElement(arr, num, 0)];
  // Add num at new_pos
  out[new_pos[0]][new_pos[1]] = num;

  return out;
}

// Shorten array
export function searchArray2d(arr, list) {
  let count = 0;
  for (let i of list) {
    count += Number(arr.flat().indexOf(i) != -1);
  }

  return count;
}

export function shortenArrayList(a) {
  let out;
  out = a;
  if (a.length > 2) {
    for (let i = a.length - 2; i >= 1; i--) {
      let last = out[i];
      let seclast = out[i - 1];
      if (compareArrays2d(seclast, last)) {
        out.pop();
      }
    }
  }
  return out;
}

export function shortenArrayList2(al, agent_numbers) {
  let out = al;
  for (let i = al.length - 1; i >= 0; i--) {
    let current = out[i];
    let pop = false;
    if (searchArray2d(current, agent_numbers) == 0) {
      pop = true;
    }

    /*
    if (i - 1 >= 0) {
      let next = out[i - 1];
      if (compareArrays2d(current, next)) {
        pop = true;
      }
    }
    */

    if (pop) {
      out.pop();
    }
  }

  return out;
}

export function capAt(n, l) {
  let out;
  if (n < l) {
    out = n;
  } else if (n < 2 * l) {
    out = l + (l - n);
  } else {
    out = 0;
  }
  return out;
}

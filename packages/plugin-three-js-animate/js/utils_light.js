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
  */
  //let position = [ws[indices[0]], ls[indices[1]]];
  //console.log("Convert Position: ", position);
  let position = [bwidth * indices[0] - fw, blength * indices[1] - fl];
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

/* Define function to fetch arrays */
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

export async function fetchArrays(files) {
  let array_lists = [];
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    let array_list = await fetchArray(file);
    array_lists.push(array_list);
  }
  return array_lists;
}

/* Function to construct arrays from grid and allocentric move vector */
export async function makeArray(file) {
  let response = await fetch(file);
  let json = await response.json();
  let array = json.grid;
  let array_list = [];
  let agents = Object.keys(json.allocentric_move_vectors);
  agents.sort(); // alphabetical sort

  for (let i = 0; i < json.trajectory.length; i++) {
    let temp = structuredClone(array);
    for (let j = 0; j < agents.length; j++) {
      let ag = agents[j];
      let ag_loc = json.positions[ag][i];
      temp[ag_loc[0]][ag_loc[1]] = j + 2;
    }
    array_list.push(temp);
  }

  return array_list;
}

export async function makeArrays(files) {
  let array_lists = [];
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    let array_list = await makeArray(file);
    array_lists.push(array_list);
  }
  return array_lists;
}

/* Function to construct objects from grid and allocentric move vector */
export async function makeObject(file) {
  let response = await fetch(file);
  let json = await response.json();
  let array = json.grid;
  let array_list = [];
  let agents = Object.keys(json.allocentric_move_vectors);
  agents.sort(); // alphabetical sort

  for (let i = 0; i < json.trajectory.length; i++) {
    let temp = structuredClone(array);
    for (let j = 0; j < agents.length; j++) {
      let ag = agents[j];
      let ag_loc = json.positions[ag][i];
      temp[ag_loc[0]][ag_loc[1]] = j + 2;
    }
    array_list.push(temp);
  }

  let out = { array_list: array_list };
  for (let j = 0; j < agents.length; j++) {
    let ag = agents[j];
    out[ag] = json.allocentric_move_vectors[ag];
  }

  return out;
}

export async function makeObjects(files) {
  let out = [];
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    let obj = await makeObject(file);
    out.push(obj);
  }
  return out;
}

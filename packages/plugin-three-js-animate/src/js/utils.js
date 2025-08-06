export function convertPosition(indices, object, dim) {
  /*
    if (object == "bush") {
        let ws = [-1, 0.45, 1.9];
        let ls = [-6, -4, -2, 0, 2, 4, 6];
        let position = [ws[indices[0]], ls[indices[1]]];
        return(position)
    }

    if (object == "agent") {
        let ws = [-1.5, 0, 1.5];
        let ls = [-6.24, -4.16, -2.08, 0, 2.08, 4.16, 6.24];
        let position = [ws[indices[0]], ls[indices[1]]];
        return(position)
    }
    */
  //console.log(indices);
  let bwidth = 1.5915793398780806;
  let blength = 2.022771790592742;

  let ws = [];
  let ls = [];
  let fw, fl;

  if (object == "NULL") {
    fw = (bwidth * dim[0]) / 2 - bwidth / 1.25;
    fl = (blength * dim[1]) / 2 - blength / 2;
  } else {
    fw = (bwidth * dim[0]) / 2 - bwidth / 2;
    fl = (blength * dim[1]) / 2 - blength / 2;
  }

  for (let i = 0; i < dim[0]; i++) {
    ws.push(bwidth * i - fw);
  }
  for (let j = 0; j < dim[1]; j++) {
    ls.push(blength * j - fl);
  }

  let position = [ws[indices[0]], ls[indices[1]]];
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

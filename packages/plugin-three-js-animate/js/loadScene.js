import { loadObject } from "./loadObject.js";
import { allIndexOf2d, convertPosition } from "./utils.js";

export async function loadScene(scene, map, array, mixers, odim, wdim, pad_ends) {
  for (let o of map) {
    let name = o.name;
    let number = o.number;
    let path = o.model_path;
    let etype = o.entity_type;
    let color_scheme = o.color_scheme;

    let positions = allIndexOf2d(array, number);

    for (let position of positions) {
      if (etype == "agent") {
        if (pad_ends) {
          console.log("PAD ENDS LOAD AGENT");
          let pposition = position;
          if (position[1] == wdim[1] - 1) {
            pposition[1] += 5;
          } else if (position[1] == 0) {
            pposition[1] -= 5;
          }
          await loadObject(
            scene,
            name,
            convertPosition(pposition, odim, wdim),
            path,
            color_scheme,
            mixers
          );
        } else {
          await loadObject(
            scene,
            name,
            convertPosition(position, odim, wdim),
            path,
            color_scheme,
            mixers
          );
        }
      } else {
        await loadObject(scene, name, convertPosition(position, odim, wdim), path, color_scheme);
      }
    }
  }
}

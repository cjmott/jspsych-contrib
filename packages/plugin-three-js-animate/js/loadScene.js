import { loadObject } from "./loadObject.js";
import { allIndexOf2d, convertPosition } from "./utils.js";

export async function loadScene(scene, map, array, mixers, odim, wdim) {
  for (let o of map) {
    let name = o.name;
    let number = o.number;
    let path = o.model_path;
    let etype = o.entity_type;

    let positions = allIndexOf2d(array, number);

    for (let position of positions) {
      if (etype == "agent") {
        await loadObject(scene, name, convertPosition(position, odim, wdim), path, mixers);
      } else {
        await loadObject(scene, name, convertPosition(position, odim, wdim), path);
      }
    }
  }
}

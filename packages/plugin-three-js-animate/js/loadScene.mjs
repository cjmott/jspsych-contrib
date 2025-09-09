import { loadObject } from "loadObject.js";
import { convertPosition, indexOf2d } from "utils.js";

export async function loadScene(scene, map, array, mixers, odim, wdim) {
  for (o of map) {
    let name = o.name;
    let number = o.number;
    let path = o.model_path;
    let etype = o.entity_type;

    let position = indexOf2d(array, number);
    if (etype == "agent") {
      loadObject(scene, name, convertPosition(position, odim, wdim), path, mixers);
    } else {
      loadObject(scene, name, convertPosition(position, odim, wdim), path);
    }
  }
}

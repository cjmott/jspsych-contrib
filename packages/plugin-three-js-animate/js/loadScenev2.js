import { loadObjectv2 } from "/auto-blame/auto_blame/world_env/javascript/loadObjectv2.js";
import { convertPosition } from "/auto-blame/auto_blame/world_env/javascript/utils.js";

export async function loadScenev2(scene, array, mixers, dim) {
  for (let i = 0; i < array.length; i++) {
    let c = array[i];
    for (let j = 0; j < c.length; j++) {
      if (c[j] == 1) {
        loadObjectv2(scene, "bush", convertPosition([i, j], "bush", dim), "bush.glb");
      } else if (c[j] == 2) {
        await loadObjectv2(
          scene,
          "A",
          convertPosition([i, j], "agent", dim),
          "man_basic.glb",
          mixers
        );
      } else if (c[j] == 3) {
        //loadObject(scene, 'cone', convertPosition([i, j], 'agent'), 'B')
        await loadObjectv2(
          scene,
          "B",
          convertPosition([i, j], "agent", dim),
          "man_basic.glb",
          mixers
        );
      }
    }
  }
}

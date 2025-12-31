// Imports
import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";

// Function
export async function createBackground(scene, odim, wdim) {
  // Create vars
  let uwidth = odim[0];
  let ulength = odim[1];

  // Add paths (consider making curved or split around pond)
  let twidth = wdim[0] * uwidth;
  let tlength = wdim[1] * ulength;

  const pMaterial = new THREE.MeshBasicMaterial({ color: 0x48494b });

  const pGeometry = new THREE.PlaneGeometry(twidth, 1000);

  const pMesh = new THREE.Mesh(pGeometry, pMaterial);
  pMesh.rotateX(-Math.PI / 2);

  pMesh.position.x = 0;
  pMesh.position.y = 0;
  pMesh.position.z = 0;

  pMesh.receiveShadow = true;
  scene.add(pMesh);

  // Add grass
  const gMaterial = new THREE.MeshBasicMaterial({ color: 0x7bb369 });

  const gGeometry = new THREE.PlaneGeometry(1000, 1000);

  const gMesh = new THREE.Mesh(gGeometry, gMaterial);
  gMesh.rotateX(-Math.PI / 2);

  gMesh.position.x = 0;
  gMesh.position.y = -0.1;
  gMesh.position.z = 0;

  gMesh.receiveShadow = true;
  scene.add(gMesh);

  // Add trees (lining path)
  const tGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  const tMaterial = new THREE.MeshBasicMaterial({ color: 0x523f31 });
  const tMesh = new THREE.Mesh(tGeometry, tMaterial);

  const lGeometry = new THREE.ConeGeometry(1.5, 10, 8);
  const lMaterial = new THREE.MeshBasicMaterial({ color: 0x2b5d34 });
  const lMesh = new THREE.Mesh(lGeometry, lMaterial);

  for (let t = -10; t < 10; t++) {
    for (let s = 0; s < 2; s++) {
      let side = 2 * s - 1;

      let tClone = tMesh.clone();
      let lClone = lMesh.clone();

      tClone.position.x = (twidth / 2 + 4) * side;
      tClone.position.y = 0.25;
      tClone.position.z = 0 + 10 * t;

      lClone.position.x = (twidth / 2 + 4) * side;
      lClone.position.y = 5.5;
      lClone.position.z = 0 + 10 * t;

      scene.add(tClone);
      scene.add(lClone);
    }
  }

  // Add bushes (continuing on path)

  // Add sky
  // Create sky
  let sky = new Sky();
  sky.scale.setScalar(10000);

  // Set sky uniforms
  const uniforms = sky.material.uniforms;
  uniforms["turbidity"].value = 1;
  uniforms["rayleigh"].value = 0.5;
  uniforms["mieCoefficient"].value = 0.005;
  uniforms["mieDirectionalG"].value = 0.8;

  // Set sun position**
  const phi = THREE.MathUtils.degToRad(0); // elevation angle
  const theta = THREE.MathUtils.degToRad(180); // azimuth angle
  const sunPosition = new THREE.Vector3();
  sunPosition.setFromSphericalCoords(1, phi, theta);
  uniforms["sunPosition"].value.copy(sunPosition);

  // Add sky to scene
  scene.add(sky);

  // Add hemisphere light (simulates sky dome lighting)
  const hemiLight = new THREE.HemisphereLight(
    0xffffff, // sky color
    0x444444, // ground color
    1.0 // intensity
  );
  scene.add(hemiLight);

  // Add directional light from sun position (simulates sun)
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
  sunLight.position.copy(sunPosition);
  sunLight.position.multiplyScalar(100); // Move it far away
  scene.add(sunLight);

  // Optional: Add shadows
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
}

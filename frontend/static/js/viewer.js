// static/js/viewer.js
async function loadPolicy() {
  const res = await fetch('/api/taxi/policy');
  const data = await res.json();
  return data.policy;
}

function createScene(policy) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('scene')});
  renderer.setSize(window.innerWidth, window.innerHeight);

  // luci
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 10, 10);
  scene.add(light);

  // griglia 5x5
  const N = 5;
  const plane = new THREE.GridHelper(N, N);
  scene.add(plane);

  // punti policy
  policy.forEach(p => {
    const color = new THREE.Color(`hsl(${p.value * 60}, 80%, 50%)`);
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const material = new THREE.MeshLambertMaterial({color});
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(p.col - N/2 + 0.5, 0, -(p.row - N/2 + 0.5));
    scene.add(cube);
  });

  camera.position.set(3, 4, 5);
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}

loadPolicy().then(createScene);

// Preview-Banner anzeigen wenn IS_PREVIEW gesetzt
if (window.IS_PREVIEW) {
  document.getElementById('preview-banner').style.display = 'block';
  document.getElementById('branch-name').textContent = window.BRANCH_NAME;
}

// ── Scene ──────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color('#87CEEB');
scene.fog = new THREE.Fog('#87CEEB', 100, 400);

// ── Renderer ───────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Camera ─────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

// ── Lights ─────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(50, 100, 50);
dirLight.castShadow = true;
scene.add(dirLight);

// ── Ground ─────────────────────────────────────────────────────────────────
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500),
  new THREE.MeshLambertMaterial({ color: '#4a5e23' })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ── Houses ─────────────────────────────────────────────────────────────────
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomPositionFarFrom(minDist, range) {
  let x, z;
  do {
    x = randomBetween(-range, range);
    z = randomBetween(-range, range);
  } while (Math.sqrt(x * x + z * z) < minDist);
  return { x, z };
}

for (let i = 0; i < 10; i++) {
  const w = randomBetween(8, 15);
  const h = randomBetween(8, 20);
  const d = randomBetween(8, 15);
  const house = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color: '#888888' })
  );
  const pos = randomPositionFarFrom(30, 180);
  house.position.set(pos.x, h / 2, pos.z);
  house.castShadow = true;
  house.receiveShadow = true;
  scene.add(house);
}

// ── Trees ──────────────────────────────────────────────────────────────────
for (let i = 0; i < 15; i++) {
  const tree = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.4, 3, 8),
    new THREE.MeshLambertMaterial({ color: '#5a3a1a' })
  );
  trunk.position.y = 1.5;
  trunk.castShadow = true;
  tree.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 8, 8),
    new THREE.MeshLambertMaterial({ color: '#2d7a2d' })
  );
  crown.position.y = 4.5;
  crown.castShadow = true;
  tree.add(crown);

  const pos = randomPositionFarFrom(15, 190);
  tree.position.set(pos.x, 0, pos.z);
  scene.add(tree);
}

// ── Tank ───────────────────────────────────────────────────────────────────
const tankColor = new THREE.MeshLambertMaterial({ color: '#3a5a2a' });

const tank = new THREE.Group();

// Korpus
const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 6), tankColor);
body.position.y = 1.0;
body.castShadow = true;
body.receiveShadow = true;
tank.add(body);

// Ketten
const trackMat = new THREE.MeshLambertMaterial({ color: '#222222' });
[-2.3, 2.3].forEach(xOffset => {
  const track = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 6.2), trackMat);
  track.position.set(xOffset, 0.85, 0);
  track.castShadow = true;
  tank.add(track);
});

// Turm (Kind des body)
const turret = new THREE.Group();
turret.position.set(0, 1.3, 0);
body.add(turret);

const turretBox = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 2.5), tankColor);
turretBox.castShadow = true;
turret.add(turretBox);

// Kanone (Kind des turrets)
const cannon = new THREE.Mesh(
  new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
  new THREE.MeshLambertMaterial({ color: '#2a4a1a' })
);
cannon.rotation.z = Math.PI / 2;
cannon.position.set(0, 0, 2.5);
cannon.castShadow = true;
turret.add(cannon);

tank.position.set(0, 0, 0);
scene.add(tank);

// ── Input ──────────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup',   e => { keys[e.key.toLowerCase()] = false; });

// Touch Joysticks
const joystickLeft  = { active: false, touchId: null, x: 0, y: 0, baseX: 0, baseY: 0 };
const joystickRight = { active: false, touchId: null, x: 0, y: 0, baseX: 0, baseY: 0 };

const leftBase  = document.getElementById('joystick-left-base');
const leftKnob  = document.getElementById('joystick-left-knob');
const rightBase = document.getElementById('joystick-right-base');
const rightKnob = document.getElementById('joystick-right-knob');

const JOYSTICK_RADIUS = 50;
const KNOB_MAX = 40;

function getJoystickCenter(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function updateKnob(knob, jx, jy) {
  const dx = Math.min(Math.max(jx, -1), 1) * KNOB_MAX;
  const dy = Math.min(Math.max(jy, -1), 1) * KNOB_MAX;
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
}

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    const isLeft = touch.clientX < window.innerWidth / 2;
    const joy = isLeft ? joystickLeft : joystickRight;
    if (!joy.active) {
      joy.active = true;
      joy.touchId = touch.identifier;
      const center = getJoystickCenter(isLeft ? leftBase : rightBase);
      joy.baseX = center.x;
      joy.baseY = center.y;
      joy.x = 0;
      joy.y = 0;
    }
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    let joy, knob;
    if (joystickLeft.active  && touch.identifier === joystickLeft.touchId)  { joy = joystickLeft;  knob = leftKnob; }
    if (joystickRight.active && touch.identifier === joystickRight.touchId) { joy = joystickRight; knob = rightKnob; }
    if (!joy) continue;

    const dx = touch.clientX - joy.baseX;
    const dy = touch.clientY - joy.baseY;
    joy.x = Math.min(Math.max(dx / JOYSTICK_RADIUS, -1), 1);
    joy.y = Math.min(Math.max(dy / JOYSTICK_RADIUS, -1), 1);
    updateKnob(knob, joy.x, joy.y);
  }
}, { passive: false });

function resetJoystick(joy, knob) {
  joy.active = false;
  joy.touchId = null;
  joy.x = 0;
  joy.y = 0;
  knob.style.transform = 'translate(0px, 0px)';
}

canvas.addEventListener('touchend',    e => { for (const t of e.changedTouches) { if (joystickLeft.touchId  === t.identifier) resetJoystick(joystickLeft,  leftKnob);  if (joystickRight.touchId === t.identifier) resetJoystick(joystickRight, rightKnob); } }, { passive: false });
canvas.addEventListener('touchcancel', e => { for (const t of e.changedTouches) { if (joystickLeft.touchId  === t.identifier) resetJoystick(joystickLeft,  leftKnob);  if (joystickRight.touchId === t.identifier) resetJoystick(joystickRight, rightKnob); } }, { passive: false });

// ── Movement constants ─────────────────────────────────────────────────────
const speed     = 0.15;
const turnSpeed = 0.03;

// ── Animation Loop ─────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  // 1. Input sammeln
  let moveY = 0;
  let rotY  = 0;
  let turretY = 0;

  // Tastatur
  if (keys['w'] || keys['arrowup'])    moveY += 1;
  if (keys['s'] || keys['arrowdown'])  moveY -= 1;
  if (keys['a'] || keys['arrowleft'])  rotY  += 1;
  if (keys['d'] || keys['arrowright']) rotY  -= 1;
  if (keys['q']) turretY += 1;
  if (keys['e']) turretY -= 1;

  // Touch Joystick (überschreibt Tastatur wenn aktiv)
  if (joystickLeft.active) {
    moveY = -joystickLeft.y;
    rotY  = -joystickLeft.x;
  }
  if (joystickRight.active) {
    turretY = -joystickRight.x;
  }

  // 2. Panzer bewegen
  tank.translateZ(-speed * moveY);
  tank.rotateY(turnSpeed * rotY);
  tank.position.y = 0; // bleibt auf Boden

  // 3. Turm drehen
  turret.rotateY(turnSpeed * turretY);

  // 4. Kamera nachführen (Third-Person, hinter+über dem Panzer)
  const tankPos = new THREE.Vector3();
  tank.getWorldPosition(tankPos);

  const behind = new THREE.Vector3(0, 8, 15);
  behind.applyQuaternion(tank.quaternion);
  camera.position.copy(tankPos).add(behind);
  camera.lookAt(tankPos.x, tankPos.y + 2, tankPos.z);

  // Test-Hook: Kamera-Position für Playwright-Tests zugänglich machen
  window.__testCameraZ = camera.position.z;
  window.__testTankX = tank.position.x;
  window.__testTankZ = tank.position.z;

  // 5. Rendern
  renderer.render(scene, camera);
}

animate();

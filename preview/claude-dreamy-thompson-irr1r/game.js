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

const houses = [];
for (let i = 0; i < 10; i++) {
  const w = randomBetween(8, 15);
  const h = randomBetween(8, 20);
  const d = randomBetween(8, 15);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color: '#888888' })
  );
  const pos = randomPositionFarFrom(30, 180);
  mesh.position.set(pos.x, h / 2, pos.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  houses.push({ mesh, hp: 3, destroyed: false });
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

const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 6), tankColor);
body.position.y = 1.0;
body.castShadow = true;
body.receiveShadow = true;
tank.add(body);

const trackMat = new THREE.MeshLambertMaterial({ color: '#222222' });
[-2.3, 2.3].forEach(xOffset => {
  const track = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 6.2), trackMat);
  track.position.set(xOffset, 0.85, 0);
  track.castShadow = true;
  tank.add(track);
});

const turret = new THREE.Group();
turret.position.set(0, 1.3, 0);
body.add(turret);

const turretBox = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 2.5), tankColor);
turretBox.castShadow = true;
turret.add(turretBox);

const cannon = new THREE.Mesh(
  new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
  new THREE.MeshLambertMaterial({ color: '#2a4a1a' })
);
cannon.rotation.x = Math.PI / 2;
cannon.position.set(0, 0, -2.5); // -Z = Vorderseite (Tank fährt in -Z)
cannon.castShadow = true;
turret.add(cannon);

tank.position.set(0, 0, 0);
scene.add(tank);

// ── Dummy-Ziele ─────────────────────────────────────────────────────────────
const dummyMat = new THREE.MeshLambertMaterial({ color: '#8b0000' });

const dummyTargetDefs = [
  { position: new THREE.Vector3(50, 0, 50),  hp: 100 },
  { position: new THREE.Vector3(-60, 0, 80), hp: 100 },
  { position: new THREE.Vector3(30, 0, -70), hp: 100 },
];

function buildDummyTank(pos) {
  const group = new THREE.Group();

  const dBody = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 6), dummyMat.clone());
  dBody.position.y = 1.0;
  dBody.castShadow = true;
  group.add(dBody);

  [-2.3, 2.3].forEach(xOffset => {
    const tr = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 6.2), new THREE.MeshLambertMaterial({ color: '#222' }));
    tr.position.set(xOffset, 0.85, 0);
    group.add(tr);
  });

  const dTurret = new THREE.Group();
  dTurret.position.set(0, 1.3, 0);
  dBody.add(dTurret);

  const dTurretBox = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 2.5), dummyMat.clone());
  dTurret.add(dTurretBox);

  const dCannon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
    new THREE.MeshLambertMaterial({ color: '#550000' })
  );
  dCannon.rotation.x = Math.PI / 2;
  dCannon.position.set(0, 0, -2.5);
  dTurret.add(dCannon);

  group.position.copy(pos);
  scene.add(group);
  return group;
}

const dummyTargets = dummyTargetDefs.map(def => ({
  mesh: buildDummyTank(def.position),
  hp: def.hp,
  maxHp: def.hp,
  destroyed: false,
  position: def.position.clone(),
}));

// ── Target HP Bars (DOM) ───────────────────────────────────────────────────
const targetHud = document.getElementById('target-hud');

dummyTargets.forEach((t, i) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'target-hp-wrapper';
  wrapper.id = `target-hp-${i}`;

  const bg = document.createElement('div');
  bg.className = 'target-hp-bar-bg';

  const bar = document.createElement('div');
  bar.className = 'target-hp-bar';
  bar.id = `target-bar-${i}`;

  const label = document.createElement('div');
  label.className = 'target-hp-label';
  label.id = `target-label-${i}`;
  label.textContent = `${t.hp}/${t.maxHp}`;

  bg.appendChild(bar);
  wrapper.appendChild(bg);
  wrapper.appendChild(label);
  targetHud.appendChild(wrapper);
});

function updateTargetHpBar(i) {
  const t = dummyTargets[i];
  const bar = document.getElementById(`target-bar-${i}`);
  const label = document.getElementById(`target-label-${i}`);
  if (!bar || !label) return;
  const pct = Math.max(0, t.hp / t.maxHp * 100);
  bar.style.width = pct + '%';
  bar.style.background = pct > 50 ? '#22cc22' : pct > 25 ? '#ccaa00' : '#cc2222';
  label.textContent = `${Math.max(0, t.hp)}/${t.maxHp}`;
}

function updateTargetHpPositions() {
  dummyTargets.forEach((t, i) => {
    const wrapper = document.getElementById(`target-hp-${i}`);
    if (!wrapper || t.destroyed) { if (wrapper) wrapper.style.display = 'none'; return; }

    const worldPos = new THREE.Vector3();
    t.mesh.getWorldPosition(worldPos);
    worldPos.y += 4;

    const projected = worldPos.clone().project(camera);
    if (projected.z > 1) { wrapper.style.display = 'none'; return; }

    const sx = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-projected.y * 0.5 + 0.5) * window.innerHeight;

    wrapper.style.display = 'flex';
    wrapper.style.left = sx + 'px';
    wrapper.style.top = sy + 'px';
  });
}

// ── Krater ─────────────────────────────────────────────────────────────────
const craters = [];
const MAX_CRATERS = 50;

function createCrater(position) {
  const geo = new THREE.CircleGeometry(2.5, 16);
  const mat = new THREE.MeshLambertMaterial({ color: '#2a1a0a' });
  const crater = new THREE.Mesh(geo, mat);
  crater.rotation.x = -Math.PI / 2;
  crater.position.set(position.x, 0.05, position.z);
  scene.add(crater);
  craters.push(crater);
  if (craters.length > MAX_CRATERS) {
    const old = craters.shift();
    scene.remove(old);
  }
}

// ── Partikel-Helfer ────────────────────────────────────────────────────────
const particles = [];

function spawnParticles(position, count, colorHex, speed, lifetime, gravity, size) {
  for (let i = 0; i < count; i++) {
    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshLambertMaterial({ color: colorHex });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    scene.add(mesh);

    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * speed,
      Math.random() * speed * 0.8 + speed * 0.2,
      (Math.random() - 0.5) * speed
    );

    particles.push({ mesh, vel, lifetime, age: 0, gravity, mat });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    p.vel.y -= p.gravity * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    const alpha = Math.max(0, 1 - p.age / p.lifetime);
    p.mat.opacity = alpha;
    p.mat.transparent = true;
    if (p.age >= p.lifetime) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
    }
  }
}

// ── Rauch-Partikel ─────────────────────────────────────────────────────────
const smokeParticles = [];

function spawnSmoke(position, count, lifetime) {
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.4 + Math.random() * 0.4, 5, 5);
    const mat = new THREE.MeshLambertMaterial({ color: '#555', transparent: true, opacity: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position).add(new THREE.Vector3(
      (Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2
    ));
    scene.add(mesh);
    smokeParticles.push({ mesh, vel: new THREE.Vector3((Math.random()-0.5)*0.3, 0.8+Math.random()*0.5, (Math.random()-0.5)*0.3), lifetime, age: 0, mat });
  }
}

function updateSmoke(dt) {
  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    const p = smokeParticles[i];
    p.age += dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mat.opacity = Math.max(0, 0.7 * (1 - p.age / p.lifetime));
    if (p.age >= p.lifetime) {
      scene.remove(p.mesh);
      smokeParticles.splice(i, 1);
    }
  }
}

// ── Explosion ──────────────────────────────────────────────────────────────
function createExplosion(position) {
  // Blitz-Licht
  const flash = new THREE.PointLight(0xff8800, 20, 30);
  flash.position.copy(position);
  scene.add(flash);
  setTimeout(() => scene.remove(flash), 100);

  // Feuer-Partikel
  spawnParticles(position, 15, 0xff4400, 8, 1.0, 9.8, 0.4);
  // Rauch
  spawnSmoke(position, 8, 3.0);

  playExplosion();
}

// ── Mündungsfeuer ──────────────────────────────────────────────────────────
function createMuzzleFlash(position) {
  const flash = new THREE.PointLight(0xffff00, 5, 15);
  flash.position.copy(position);
  scene.add(flash);
  setTimeout(() => scene.remove(flash), 80);

  spawnParticles(position, 6, 0xffdd00, 5, 0.3, 9.8, 0.15);
}

// ── Abpraller-Funken ───────────────────────────────────────────────────────
function createRicochet(position) {
  spawnParticles(position, 4, 0xffff88, 6, 0.3, 9.8, 0.08);
  playRicochet();
}

// ── Haus-Zerstörung ────────────────────────────────────────────────────────
function destroyHouse(house) {
  house.destroyed = true;
  scene.remove(house.mesh);

  const pos = house.mesh.position.clone();
  for (let i = 0; i < 7; i++) {
    const s = randomBetween(1, 3);
    const debris = new THREE.Mesh(
      new THREE.BoxGeometry(s, s, s),
      new THREE.MeshLambertMaterial({ color: '#777' })
    );
    debris.position.set(
      pos.x + randomBetween(-4, 4),
      s / 2,
      pos.z + randomBetween(-4, 4)
    );
    debris.rotation.y = Math.random() * Math.PI;
    scene.add(debris);
  }
}

// ── Dummy-Zerstörung ───────────────────────────────────────────────────────
function destroyDummy(i) {
  const t = dummyTargets[i];
  t.destroyed = true;

  // Farbe zu schwarz, leicht schief
  t.mesh.traverse(child => {
    if (child.isMesh) {
      child.material = new THREE.MeshLambertMaterial({ color: '#111' });
    }
  });
  t.mesh.rotation.z += 0.3;

  createExplosion(t.position.clone().add(new THREE.Vector3(0, 2, 0)));
  spawnSmoke(t.position.clone().add(new THREE.Vector3(0, 3, 0)), 10, 3.0);
}

// ── Trefferberechnung ──────────────────────────────────────────────────────
const armorFactor = { front: 1.0, side: 1.5, rear: 2.0, top: 3.0 };

function calculateDamage(projectileVelocity, targetNormal, baseDamage) {
  const angle = projectileVelocity.clone().normalize().angleTo(targetNormal.clone().normalize());
  if (angle < 0.35) return 0;
  const factor = Math.sin(angle);
  return Math.round(baseDamage * factor);
}

function getHitSide(projectileVelocity, targetObject) {
  const localVel = projectileVelocity.clone();
  const invQuat = targetObject.quaternion.clone().inverse();
  localVel.applyQuaternion(invQuat);

  const ax = Math.abs(localVel.x);
  const ay = Math.abs(localVel.y);
  const az = Math.abs(localVel.z);

  if (ay > ax && ay > az) return 'top';
  if (az > ax) return localVel.z > 0 ? 'front' : 'rear';
  return 'side';
}

// ── Projektile ─────────────────────────────────────────────────────────────
const projectiles = [];

function fireShell() {
  // Kanone: CylinderGeometry, rotation.x=PI/2 → lokale -Y zeigt in Welt-Z=-Z (vorne).
  // (0,-1,0) in Kanonen-Lokalraum → (0,0,-1) Weltrichtung = Vorwärts.
  const dir = new THREE.Vector3(0, -1, 0);
  dir.transformDirection(cannon.matrixWorld).normalize();

  // Mündungsspitze = Kanonenmitte + 2 Einheiten in Schussrichtung
  const muzzlePos = new THREE.Vector3();
  cannon.getWorldPosition(muzzlePos);
  muzzlePos.addScaledVector(dir, 2);

  const geo = new THREE.SphereGeometry(0.2, 6, 6);
  const mat = new THREE.MeshLambertMaterial({ color: '#333' });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(muzzlePos);
  scene.add(mesh);

  createMuzzleFlash(muzzlePos.clone());
  playCannonShot();

  projectiles.push({
    mesh,
    velocity: dir.multiplyScalar(3),
    alive: true,
    distanceTravelled: 0,
    maxDistance: 400,
    damage: 30,
    isShell: true,
  });

  shotCount++;
  document.getElementById('shot-count').textContent = shotCount;
}

function fireMG() {
  const dir = new THREE.Vector3(0, -1, 0);
  dir.transformDirection(cannon.matrixWorld).normalize();

  const muzzlePos = new THREE.Vector3();
  cannon.getWorldPosition(muzzlePos);
  muzzlePos.addScaledVector(dir, 2);

  const geo = new THREE.SphereGeometry(0.08, 4, 4);
  const mat = new THREE.MeshLambertMaterial({ color: '#FFD700' });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(muzzlePos);
  scene.add(mesh);

  playMGShot();

  projectiles.push({
    mesh,
    velocity: dir.multiplyScalar(6),
    alive: true,
    distanceTravelled: 0,
    maxDistance: 150,
    damage: 5,
    isShell: false,
  });
}

function checkCollision(projectile, targetMesh) {
  const box = new THREE.Box3().setFromObject(targetMesh);
  return box.containsPoint(projectile.mesh.position);
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (!p.alive) { scene.remove(p.mesh); projectiles.splice(i, 1); continue; }

    const prevPos = p.mesh.position.clone();
    if (p.isShell) p.velocity.y -= 0.005;
    const move = p.velocity.clone().multiplyScalar(dt * 60);
    p.mesh.position.add(move);
    p.distanceTravelled += move.length();

    // Boden
    if (p.mesh.position.y <= 0) {
      if (p.isShell) createCrater(p.mesh.position);
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
      continue;
    }

    // Reichweite überschritten
    if (p.distanceTravelled > p.maxDistance) {
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
      continue;
    }

    // Dummy-Ziele
    let hit = false;
    for (let j = 0; j < dummyTargets.length; j++) {
      const t = dummyTargets[j];
      if (t.destroyed) continue;
      if (checkCollision(p, t.mesh)) {
        const normal = new THREE.Vector3(0, 1, 0);
        const dmg = calculateDamage(p.velocity, normal, p.damage);
        if (dmg === 0) {
          createRicochet(p.mesh.position.clone());
        } else {
          const side = getHitSide(p.velocity, t.mesh);
          const finalDmg = Math.round(dmg * armorFactor[side]);
          t.hp -= finalDmg;
          updateTargetHpBar(j);
          if (t.hp <= 0) destroyDummy(j);
        }
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
        hit = true;
        break;
      }
    }
    if (hit) continue;

    // Häuser
    for (let j = 0; j < houses.length; j++) {
      const h = houses[j];
      if (h.destroyed) continue;
      if (checkCollision(p, h.mesh)) {
        const normal = new THREE.Vector3(0, 1, 0);
        const dmg = calculateDamage(p.velocity, normal, p.damage);
        if (dmg === 0) {
          createRicochet(p.mesh.position.clone());
        } else {
          h.hp--;
          if (h.hp <= 0) destroyHouse(h);
        }
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
        hit = true;
        break;
      }
    }
  }
}

// ── Input ──────────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === ' ' || e.key === ' ') tryFireCannon();
  if (e.key.toLowerCase() === 'z') toggleScope();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// Touch Joysticks
const joystickLeft  = { active: false, touchId: null, x: 0, y: 0, baseX: 0, baseY: 0 };
const joystickRight = { active: false, touchId: null, x: 0, y: 0, baseX: 0, baseY: 0 };

const leftBase  = document.getElementById('joystick-left-base');
const leftKnob  = document.getElementById('joystick-left-knob');
const rightBase = document.getElementById('joystick-right-base');
const rightKnob = document.getElementById('joystick-right-knob');

const JOYSTICK_RADIUS = 50;
const KNOB_MAX = 40;

function updateKnob(knob, jx, jy) {
  const dx = Math.min(Math.max(jx, -1), 1) * KNOB_MAX;
  const dy = Math.min(Math.max(jy, -1), 1) * KNOB_MAX;
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
}

document.addEventListener('touchstart', e => {
  e.preventDefault();
  resumeAudio();
  for (const touch of e.changedTouches) {
    // Buttons haben eigene Handler – kein Joystick aktivieren
    if (touch.target.tagName === 'BUTTON') continue;

    const isLeft = touch.clientX < window.innerWidth / 2;
    const joy  = isLeft ? joystickLeft  : joystickRight;
    const base = isLeft ? leftBase      : rightBase;
    if (!joy.active) {
      joy.active  = true;
      joy.touchId = touch.identifier;
      joy.baseX   = touch.clientX;
      joy.baseY   = touch.clientY;
      joy.x = 0;
      joy.y = 0;
      base.style.left   = (touch.clientX - 55) + 'px';
      base.style.top    = (touch.clientY - 55) + 'px';
      base.style.bottom = 'auto';
      base.style.right  = 'auto';
    }
  }
}, { passive: false });

document.addEventListener('touchmove', e => {
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

function resetJoystick(joy, knob, base, isLeft) {
  joy.active = false;
  joy.touchId = null;
  joy.x = 0;
  joy.y = 0;
  knob.style.transform = 'translate(0px, 0px)';
  base.style.left   = isLeft ? '30px' : 'auto';
  base.style.right  = isLeft ? 'auto' : '30px';
  base.style.top    = 'auto';
  base.style.bottom = '40px';
}

function handleTouchEnd(e) {
  for (const t of e.changedTouches) {
    if (joystickLeft.touchId  === t.identifier) resetJoystick(joystickLeft,  leftKnob,  leftBase,  true);
    if (joystickRight.touchId === t.identifier) resetJoystick(joystickRight, rightKnob, rightBase, false);
  }
  // Watchdog: Falls touchId nicht mehr in der aktiven Touch-Liste ist, trotzdem resetten.
  // Verhindert hängende Joysticks wenn ein touchend verpasst wurde (z.B. über Buttons).
  const activeIds = new Set(Array.from(e.touches).map(t => t.identifier));
  if (joystickLeft.active  && !activeIds.has(joystickLeft.touchId))  resetJoystick(joystickLeft,  leftKnob,  leftBase,  true);
  if (joystickRight.active && !activeIds.has(joystickRight.touchId)) resetJoystick(joystickRight, rightKnob, rightBase, false);
}

document.addEventListener('touchend',    handleTouchEnd, { passive: false });
document.addEventListener('touchcancel', handleTouchEnd, { passive: false });

// ── Kanone Cooldown ────────────────────────────────────────────────────────
const CANNON_COOLDOWN = 3000;
let cannonLastFired = -CANNON_COOLDOWN;
let shotCount = 0;
let cannonCooldownTimer = null;

const shootBtn = document.getElementById('shoot-btn');

function tryFireCannon() {
  const now = performance.now();
  if (now - cannonLastFired < CANNON_COOLDOWN) return;
  cannonLastFired = now;
  fireShell();
  startCannonCooldown();
}

function startCannonCooldown() {
  shootBtn.disabled = true;
  shootBtn.textContent = '⏳ 3s';
  let remaining = CANNON_COOLDOWN;
  const interval = setInterval(() => {
    remaining -= 100;
    if (remaining <= 0) {
      clearInterval(interval);
      shootBtn.disabled = false;
      shootBtn.innerHTML = '&#x1F534; Kanone';
    } else {
      shootBtn.textContent = `⏳ ${(remaining / 1000).toFixed(1)}s`;
    }
  }, 100);
}

shootBtn.addEventListener('click', () => { resumeAudio(); tryFireCannon(); });
shootBtn.addEventListener('touchstart', e => { e.preventDefault(); resumeAudio(); tryFireCannon(); }, { passive: false });

// ── MG ─────────────────────────────────────────────────────────────────────
const MG_COOLDOWN = 150;
let mgLastFired = 0;
let mgFiring = false;

const btnMG = document.getElementById('btn-mg');

btnMG.addEventListener('mousedown', () => { resumeAudio(); mgFiring = true; });
btnMG.addEventListener('mouseup', () => { mgFiring = false; });
btnMG.addEventListener('touchstart', e => { e.preventDefault(); resumeAudio(); mgFiring = true; }, { passive: false });
btnMG.addEventListener('touchend', e => { e.preventDefault(); mgFiring = false; }, { passive: false });

// ── Zielfernrohr ───────────────────────────────────────────────────────────
const scopeEl = document.getElementById('scope');
const btnScope = document.getElementById('btn-scope');
let scopeActive = false;

function toggleScope() {
  scopeActive = !scopeActive;
  if (scopeActive) {
    camera.fov = 15;
    camera.updateProjectionMatrix();
    scopeEl.style.display = 'block';
    btnScope.classList.add('active');
  } else {
    camera.fov = 60;
    camera.updateProjectionMatrix();
    scopeEl.style.display = 'none';
    btnScope.classList.remove('active');
  }
}

function updateScopeCamera() {
  // Zielkamera: Blick entlang der Kanonenlinie von hinten durch das Rohr
  const dir = new THREE.Vector3(0, -1, 0);
  dir.transformDirection(cannon.matrixWorld).normalize();

  const cannonCenter = new THREE.Vector3();
  cannon.getWorldPosition(cannonCenter);

  // Kameraposition: hinter dem Verschluss, leicht erhöht
  const camPos = cannonCenter.clone().addScaledVector(dir, -3);
  camPos.y += 0.2;
  camera.position.copy(camPos);

  // Blickziel: weit vor der Mündung entlang der Schussrichtung
  const lookTarget = cannonCenter.clone().addScaledVector(dir, 300);
  camera.lookAt(lookTarget);
}

btnScope.addEventListener('click', () => toggleScope());
btnScope.addEventListener('touchstart', e => { e.preventDefault(); toggleScope(); }, { passive: false });

// ── Movement constants ─────────────────────────────────────────────────────
const speed     = 0.15;
const turnSpeed = 0.03;

// ── Animation Loop ─────────────────────────────────────────────────────────
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  // 1. Input
  let moveY = 0;
  let rotY  = 0;
  let turretY = 0;

  if (keys['w'] || keys['arrowup'])    moveY += 1;
  if (keys['s'] || keys['arrowdown'])  moveY -= 1;
  if (keys['a'] || keys['arrowleft'])  rotY  += 1;
  if (keys['d'] || keys['arrowright']) rotY  -= 1;
  if (keys['q']) turretY += 1;
  if (keys['e']) turretY -= 1;

  if (joystickLeft.active) {
    moveY = -joystickLeft.y;
    rotY  = -joystickLeft.x;
  }
  if (joystickRight.active) {
    turretY = -joystickRight.x;
  }

  // MG auto-fire
  if (keys['f'] || mgFiring) {
    if (now - mgLastFired >= MG_COOLDOWN) {
      mgLastFired = now;
      fireMG();
    }
  }

  // 2. Panzer
  tank.translateZ(-speed * moveY);
  tank.rotateY(turnSpeed * rotY);
  tank.position.y = 0;

  // 3. Turm
  turret.rotateY(turnSpeed * turretY);

  // 4. Projektile
  updateProjectiles(dt);

  // 5. Partikel
  updateParticles(dt);
  updateSmoke(dt);

  // 6. HP-Balken Positionen
  updateTargetHpPositions();

  // 7. Kamera
  const tankPos = new THREE.Vector3();
  tank.getWorldPosition(tankPos);

  const behind = new THREE.Vector3(0, 8, 15);
  behind.applyQuaternion(tank.quaternion);
  camera.position.copy(tankPos).add(behind);
  camera.lookAt(tankPos.x, tankPos.y + 2, tankPos.z);

  // Scope überschreibt die Third-Person-Kamera
  if (scopeActive) updateScopeCamera();

  // Test-Hooks für Playwright
  window.__testCameraZ = camera.position.z;
  window.__testTankX = tank.position.x;
  window.__testTankZ = tank.position.z;
  const _cp = new THREE.Vector3();
  cannon.getWorldPosition(_cp);
  window.__testCannonWorldPos = { x: _cp.x, y: _cp.y, z: _cp.z };
  const _tp = new THREE.Vector3();
  tank.getWorldPosition(_tp);
  window.__testTankWorldPos = { x: _tp.x, y: _tp.y, z: _tp.z };
  window.__testJoystickLeft = { active: joystickLeft.active, x: joystickLeft.x, y: joystickLeft.y };
  const _cd = new THREE.Vector3(0, 1, 0);
  _cd.transformDirection(cannon.matrixWorld);
  window.__testCannonDir = { x: _cd.x, y: _cd.y, z: _cd.z };

  // 8. Rendern
  renderer.render(scene, camera);
}

animate();

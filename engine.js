// ═══════════════════════════════════════════════════════════════════════
//   ENGINE — Physics, rendering, input. You shouldn't need to edit
//   this unless you're adding new engine-level features!
// ═══════════════════════════════════════════════════════════════════════

const GRAVITY       = 820;
const BOUNCE        = 0.74;
const FRICTION      = 0.9994;
const MIN_BOUNCE_VY = 500;  // minimum upward rebound so balls never stick to floor
const WALL_BOUNCE_THRESH = 80; // min velocity to trigger onWallBounce

const ARENA = { x: 10, y: 10, w: 500, h: 500 };

const canvas  = document.getElementById("arena");
const ctx     = canvas.getContext("2d");

let balls         = [];
let floatingTexts = [];
let gameRunning   = false;
let lastTime      = 0;
let selectedTeam1 = [];  // Team 1 (orange)
let selectedTeam2 = [];  // Team 2 (blue)
let isFreeForAll  = false;  // true if only one team has fighters
let spawnCounts = {};

// ── Helpers ──────────────────────────────────────────────────────────

let mouseX = 0, mouseY = 0;
let controllableBall = null;

window.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

window.addEventListener("click", e => {
  if (!controllableBall || controllableBall.dead) return;
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  const angle = Math.atan2(clickY - controllableBall.y, clickX - controllableBall.x);
  controllableBall.vx = Math.cos(angle) * 700;
  controllableBall.vy = Math.sin(angle) * 700;
});

document.addEventListener('keydown', (e) => {
  if (document.getElementById('menu').classList.contains('active') && e.altKey && e.key === 's') {
    e.preventDefault();
    const totalSelected = selectedTeam1.length + selectedTeam2.length;
    if (totalSelected === 2) {
      alert("Must not be 1v1!");
      return;
    }
  }
});

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("back-btn").addEventListener("click", showMenu);

function setHPExtra(ball, text, color = ball.color) {
  const id = ball.uid;
  const el = document.getElementById(`hpext_${id}`);
  el.style.color = color;
  if (el) el.textContent = text;
}

function spawnText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 1.0, vy: -55 });
}

function stunBall(ball, duration = 0.24) {
  if (ball.vx !== 0 && ball.vy !== 0) {
    ball._prestunVx = ball.vx;
    ball._prestunVy = ball.vy;
  }
  ball.vx = 0;
  ball.vy = 0;
  ball.stunTimer = duration;
}

function rayToArenaEdge(ox, oy, angle) {
  const A = ARENA;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let t = Infinity;
  if (dx > 0) t = Math.min(t, (A.x + A.w - ox) / dx);
  else if (dx < 0) t = Math.min(t, (A.x - ox) / dx);
  if (dy > 0) t = Math.min(t, (A.y + A.h - oy) / dy);
  else if (dy < 0) t = Math.min(t, (A.y - oy) / dy);
  return { x: ox + dx * t, y: oy + dy * t };
}

function drawFlame(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);

  // Outer flame (orange)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(8, -6, 10, -14, 0, -20);
  ctx.bezierCurveTo(-10, -14, -8, -6, 0, 0);
  ctx.fillStyle = "#FF6600";
  ctx.shadowColor = "#FF4400";
  ctx.shadowBlur = 14;
  ctx.fill();

  // Inner flame (yellow core)
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.bezierCurveTo(4, -8, 5, -13, 0, -17);
  ctx.bezierCurveTo(-5, -13, -4, -8, 0, -2);
  ctx.fillStyle = "#FFD700";
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 8;
  ctx.fill();

  ctx.restore();
}

// Segment vs circle collision
function segCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1;
  const fx = x1 - cx, fy = y1 - cy;
  const a = dx*dx + dy*dy;
  if (a === 0) return false;
  const b = 2*(fx*dx + fy*dy);
  const c = fx*fx + fy*fy - r*r;
  const disc = b*b - 4*a*c;
  if (disc < 0) return false;
  const sq = Math.sqrt(disc);
  const t1 = (-b - sq) / (2*a);
  const t2 = (-b + sq) / (2*a);
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
}

function ballCheck(ball, other) {
  if (other === ball) return true;
  if (other.dead) return true;
  if (!isFreeForAll && other.team === ball.team) return true;
  return false;
}

// ── Ball factory ─────────────────────────────────────────────────────

function createBall(defKey, x, y) {
  const def = BALL_DEFINITIONS[defKey];
  if (!def) return null;
  const angle = Math.random() * Math.PI * 2;
  const speed = 500 + Math.random() * 350;

  spawnCounts[defKey] = (spawnCounts[defKey] ?? 0) + 1;
  const uid = defKey.replace(/\s+/g, "_") + "_" + spawnCounts[defKey];
  const displayName = spawnCounts[defKey] > 1
    ? `${def.label ?? defKey} #${spawnCounts[defKey]}`
    : (def.label ?? defKey);

  const ball = {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: def.radius ?? 22,
    color:  def.color  ?? "#ffffff",
    maxHP:  def.maxHP  ?? 99,
    hp:     def.maxHP  ?? 99,
    dead:   false,
    name:   displayName,
    uid:    uid,
    def,
  };
  if (def.onInit) def.onInit(ball);
  return ball;
}

// ── Physics ───────────────────────────────────────────────────────────

function physicsUpdate(ball, dt) {
  if (ball.dead) return;

  // ── Stun (hit-freeze) ─────────────────────────────────────────────
  if (ball.stunTimer > 0) {
    ball.stunned = true;
    ball.stunTimer -= dt;
    if (ball.stunTimer <= 0) {
      ball.vx = ball._prestunVx ?? 0;
      ball.vy = ball._prestunVy ?? 0;
      ball.stunned = false;
    }
    return;
  }

  ball.vy += GRAVITY * dt;
  ball.x  += ball.vx * dt;
  ball.y  += ball.vy * dt;
  ball.vx *= FRICTION;

  // ── Minimum horizontal speed ──────────────────────────────────────
  if (Math.abs(ball.vx) < 160 && Math.abs(ball.vx) > 0.1) {
    ball.vx = 160 * Math.sign(ball.vx);
  }

  const A = ARENA;

  if (ball.x - ball.radius < A.x) {
    ball.x = A.x + ball.radius;
    const impact = Math.abs(ball.vx);
    const randomFactor = 0.9 + Math.random() * 0.2;
    ball.vx = Math.abs(ball.vx) * BOUNCE * randomFactor;
    if (impact > WALL_BOUNCE_THRESH && ball.def.onWallBounce) ball.def.onWallBounce(ball, "left");
  }
  if (ball.x + ball.radius > A.x + A.w) {
    ball.x = A.x + A.w - ball.radius;
    const impact = Math.abs(ball.vx);
    const randomFactor = 0.9 + Math.random() * 0.2;
    ball.vx = -Math.abs(ball.vx) * BOUNCE * randomFactor;
    if (impact > WALL_BOUNCE_THRESH && ball.def.onWallBounce) ball.def.onWallBounce(ball, "right");
  }
  if (ball.y - ball.radius < A.y) { // top bounce
    ball.y = A.y + ball.radius;
    const impact = Math.abs(ball.vy);
    const randomFactor = 0.9 + Math.random() * 0.2;
    ball.vy = Math.abs(ball.vy) * BOUNCE * randomFactor; // bouncing downward
    if (impact > WALL_BOUNCE_THRESH && ball.def.onWallBounce) ball.def.onWallBounce(ball, "top");
  }
  if (ball.y + ball.radius > A.y + A.h) { // bottom bounce
    ball.y = A.y + A.h - ball.radius;
    const impact = Math.abs(ball.vy);
    const randomFactor = 0.9 + Math.random() * 0.2;
    ball.vy = -Math.max(MIN_BOUNCE_VY, Math.abs(ball.vy) * BOUNCE * randomFactor); // Ensure minimum upward velocity
    if (impact > WALL_BOUNCE_THRESH && ball.def.onWallBounce) ball.def.onWallBounce(ball, "bottom");
  }
}

function resolveBallCollisions() {
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i], b = balls[j];
      if (a.dead || b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const min  = a.radius + b.radius;
      if (dist < min && dist > 0) {
        const overlap = (min - dist) * 0.5;
        const nx = dx / dist, ny = dy / dist;
        a.x -= nx * overlap; a.y -= ny * overlap;
        b.x += nx * overlap; b.y += ny * overlap;
        const dvx = b.vx - a.vx, dvy = b.vy - a.vy;
        const dot = dvx*nx + dvy*ny;
        if (dot < 0) {
          const imp = -dot * 0.78;
          const BOOST = 240;
          const randBoost = 100 + Math.random() * 200; // random added impulse
          const totalImpulse = imp + BOOST + randBoost;
          a.vx -= nx * totalImpulse;
          a.vy -= ny * totalImpulse;
          b.vx += nx * totalImpulse;
          b.vy += ny * totalImpulse;

        }
        if (a.def.onBallCollide) a.def.onBallCollide(a, b);
        if (b.def.onBallCollide) b.def.onBallCollide(b, a);
      }
    }
  }
}

// ── Rendering ─────────────────────────────────────────────────────────

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = "#07070f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid
  ctx.save();
  ctx.strokeStyle = "#111120";
  ctx.lineWidth = 1;
  for (let gx = ARENA.x; gx <= ARENA.x + ARENA.w; gx += 40) {
    ctx.beginPath(); ctx.moveTo(gx, ARENA.y); ctx.lineTo(gx, ARENA.y + ARENA.h); ctx.stroke();
  }
  for (let gy = ARENA.y; gy <= ARENA.y + ARENA.h; gy += 40) {
    ctx.beginPath(); ctx.moveTo(ARENA.x, gy); ctx.lineTo(ARENA.x + ARENA.w, gy); ctx.stroke();
  }
  // Border
  ctx.strokeStyle = "#2a2a40";
  ctx.lineWidth = 2;
  ctx.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  ctx.restore();

  // Draw all puddles (background layer)
  for (const ball of balls) {
    if (ball.dead) continue;
    if (ball.puddles && ball.puddles.length > 0) {
      for (const puddle of ball.puddles) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(puddle.x, puddle.y, puddle.radius, 0, Math.PI * 2);
        ctx.fillStyle = puddle.color;
        ctx.globalAlpha = 0.25;
        ctx.shadowColor = puddle.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // Balls
  for (const ball of balls) {
    if (ball.dead) continue;
    ctx.save();
    // Glow shadow
    ctx.shadowColor = ball.color;
    ctx.shadowBlur  = 20;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    // Highlight layer
    ctx.shadowBlur = 0;
    const hl = ctx.createRadialGradient(
      ball.x - ball.radius * 0.32, ball.y - ball.radius * 0.38, ball.radius * 0.08,
      ball.x, ball.y, ball.radius
    );
    hl.addColorStop(0, "rgba(255,255,255,0.28)");
    hl.addColorStop(1, "rgba(0,0,0,0.36)");
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = hl;
    ctx.fill();
    
    // Team ring (only in team mode)
    if (!isFreeForAll) {
      ctx.save();
      const teamColor = ball.team === 1 ? "#ff7700" : "#3399ff";
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = teamColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    
    ctx.restore();

    // Ball extras (weapons, labels, etc.)
    if (ball.def.onDraw) ball.def.onDraw(ctx, ball);
  }

  // Floating damage text
  for (const ft of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.life);
    ctx.font        = "bold 13px 'Lato', sans-serif";
    ctx.fillStyle   = ft.color;
    ctx.textAlign   = "center";
    ctx.shadowColor = ft.color;
    ctx.shadowBlur  = 8;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

// ── HP Bars ───────────────────────────────────────────────────────────

function buildHPBars() {
  const container = document.getElementById("hp-bars");
  container.innerHTML = "";
  for (const ball of balls) {
    const id = ball.uid;
    const isLight = ball.color === "#dddddd" || ball.color === "#ffffff" || ball.color === "#eeeeee";
    const barColor = isLight ? "#999" : ball.color;
    const wrap = document.createElement("div");
    wrap.className = "hp-bar-wrap";
    if (!isFreeForAll && ball.team) {
      wrap.classList.add(`team${ball.team}`);
    }
    wrap.innerHTML = `
      <div class="hp-bar-head">
        <span class="fighter-name" style="color:${isLight ? '#ccc' : ball.color}">${ball.name}</span>
        <span class="hp-count" id="hpnum_${id}">${ball.hp}/${ball.maxHP}</span>
      </div>
      <div class="hp-track">
        <div class="hp-fill" id="hpfill_${id}" style="width:100%;background:${barColor}"></div>
      </div>
      <div class="hp-extra" id="hpext_${id}"></div>
    `;
    container.appendChild(wrap);
  }
}

function updateHPBars() {
  for (const ball of balls) {
    const id  = ball.uid;
    const pct = Math.max(0, ball.hp / ball.maxHP * 100).toFixed(1);
    const fill = document.getElementById(`hpfill_${id}`);
    const num  = document.getElementById(`hpnum_${id}`);
    const ext  = document.getElementById(`hpext_${id}`);
    if (fill) fill.style.width = pct + "%";
    if (num) num.textContent = `${Math.round(Math.max(0, ball.hp))}/${ball.maxHP}`;
    if (ext) {
      const parts = [];
      ext.textContent = parts.join("  ·  ");
    }
  }
}

// ── Menu ──────────────────────────────────────────────────────────────

function buildMenu() {
  const menuDiv = document.getElementById("menu");
  const grid = document.getElementById("fighter-grid");
  grid.innerHTML = "";
  selectedTeam1 = [];
  selectedTeam2 = [];
  updateStartBtn();

  // Remove any existing controllable row
  const existingRow = menuDiv.querySelector('.controllable-row');
  if (existingRow) existingRow.remove();

  // Create a separate row for Controllable
  const controllableRow = document.createElement("div");
  controllableRow.className = "controllable-row"; // Optional: Add a class for styling
  controllableRow.style.display = "flex";
  controllableRow.style.justifyContent = "center";
  controllableRow.style.marginBottom = "20px"; // Space below the row

  // Create the Controllable card
  const controllableDef = BALL_DEFINITIONS["Controllable"];
  if (controllableDef) {
    const card = document.createElement("div");
    card.className = "fighter-card";
    card.dataset.key = "Controllable";

    const preview = document.createElement("div");
    preview.className = "ball-preview";
    const isLight = controllableDef.color === "#dddddd" || controllableDef.color === "#ffffff" || controllableDef.color === "#eeeeee";
    preview.style.background = controllableDef.color;
    preview.style.boxShadow = `0 0 18px ${controllableDef.color}55`;
    if (isLight) preview.style.border = "2px solid #555";

    card.innerHTML = `
      <div class="name">${controllableDef.label ?? "Controllable"}</div>
      <div class="desc">${controllableDef.description ?? ""}</div>
      <div class="stats">HP: ${controllableDef.maxHP}</div>
    `;
    card.prepend(preview);

    // Hold detection
    let holdTimer = null;
    let pressTime = 0;
    let rightHoldTimer = null;
    let rightMirrorFired = false;

    card.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        pressTime = Date.now();
        holdTimer = setTimeout(() => {
          removeFighterFromTeam("Controllable", card);
        }, 300);
      }
      if (e.button === 2) {
        rightMirrorFired = false;
        rightHoldTimer = setTimeout(() => {
          rightMirrorFired = true;
          const totalSelected = selectedTeam1.length + selectedTeam2.length;
          if (totalSelected >= 8) return;
          selectedTeam2.push("Controllable");
          card.classList.add("selected-team2");
          card.style.borderColor = "#3399ff";
          card.style.boxShadow = "0 0 12px #3399ff88";
          updateStartBtn();
        }, 300);
      }
    });

    card.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        const holdDuration = Date.now() - pressTime;
        clearTimeout(holdTimer);
        if (holdDuration < 300) {
          addFighterToTeam("Controllable", card, 1);
        }
      }
      if (e.button === 2) {
        clearTimeout(rightHoldTimer);
      }
    });

    card.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      clearTimeout(holdTimer);
      if (!rightMirrorFired) {
        addFighterToTeam("Controllable", card, 2);
      }
      rightMirrorFired = false;
    });

    controllableRow.appendChild(card);
  }

  // Insert the Controllable row before the main grid
  menuDiv.insertBefore(controllableRow, grid);

  // Now build the main grid for other fighters
  for (const [key, def] of Object.entries(BALL_DEFINITIONS)) {
    if (key === "Controllable") continue; // Skip Controllable since it's in its own row

    const card = document.createElement("div");
    card.className = "fighter-card";
    card.dataset.key = key;

    const preview = document.createElement("div");
    preview.className = "ball-preview";
    const isLight = def.color === "#dddddd" || def.color === "#ffffff" || def.color === "#eeeeee";
    preview.style.background  = def.color;
    preview.style.boxShadow   = `0 0 18px ${def.color}55`;
    if (isLight) preview.style.border = "2px solid #555";

    card.innerHTML = `
      <div class="name">${def.label ?? key}</div>
      <div class="desc">${def.description ?? ""}</div>
      <div class="stats">HP: ${def.maxHP}</div>
    `;
    card.prepend(preview);
    
    // Hold detection
    let holdTimer = null;
    let pressTime = 0;
    let rightHoldTimer = null;
    let rightMirrorFired = false;

    // Mouse down
    card.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        pressTime = Date.now();
        holdTimer = setTimeout(() => {
          removeFighterFromTeam(key, card);
        }, 300);
      }
      if (e.button === 2) {
        rightMirrorFired = false;
        rightHoldTimer = setTimeout(() => {
          rightMirrorFired = true;
          const totalSelected = selectedTeam1.length + selectedTeam2.length;
          if (totalSelected >= 8) return;
          // Always add to team 2, never remove from team 1
          selectedTeam2.push(key);
          card.classList.add("selected-team2");
          card.style.borderColor = "#3399ff";
          card.style.boxShadow = "0 0 12px #3399ff88";
          updateStartBtn();
        }, 300);
      }
    });

    // Mouse up
    card.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        const holdDuration = Date.now() - pressTime;
        clearTimeout(holdTimer);
        if (holdDuration < 300) {
          addFighterToTeam(key, card, 1);
        }
      }
      if (e.button === 2) {
        clearTimeout(rightHoldTimer);
      }
    });

    // Right click: normal add to team 2 (with replacement) — only if hold didn't fire
    card.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      clearTimeout(holdTimer);
      if (!rightMirrorFired) {
        addFighterToTeam(key, card, 2);
      }
      rightMirrorFired = false;
    });
    
    grid.appendChild(card);
  }
}

function addFighterToTeam(key, card, team) {
  const totalSelected = selectedTeam1.length + selectedTeam2.length;
  if (totalSelected < 8) {
    if (team === 1) {
      selectedTeam1.push(key);
      // Toggle team1 class, remove team2 if exists
      if (card.classList.contains("selected-team2")) {
        selectedTeam2 = selectedTeam2.filter((k) => k !== key || selectedTeam2.indexOf(k) !== selectedTeam2.lastIndexOf(k));
        const instanceIdx = selectedTeam2.indexOf(key);
        if (instanceIdx >= 0) selectedTeam2.splice(instanceIdx, 1);
        card.classList.remove("selected-team2");
      }
      card.classList.add("selected-team1");
    } else {
      selectedTeam2.push(key);
      // Toggle team2 class, remove team1 if exists
      if (card.classList.contains("selected-team1")) {
        selectedTeam1 = selectedTeam1.filter((k) => k !== key || selectedTeam1.indexOf(k) !== selectedTeam1.lastIndexOf(k));
        const instanceIdx = selectedTeam1.indexOf(key);
        if (instanceIdx >= 0) selectedTeam1.splice(instanceIdx, 1);
        card.classList.remove("selected-team1");
      }
      card.classList.add("selected-team2");
    }
    const teamColor = team === 1 ? "#ff7700" : "#3399ff";
    card.style.borderColor = teamColor;
    card.style.boxShadow = `0 0 12px ${teamColor}88`;
    updateStartBtn();
  }
}

function removeFighterFromTeam(key, card, team) {
  if (team === undefined) {
    // Remove from whichever team it's on
    const idx1 = selectedTeam1.indexOf(key);
    const idx2 = selectedTeam2.indexOf(key);
    
    if (idx1 >= 0) {
      selectedTeam1.splice(idx1, 1);
      // Only remove class if no more instances on team 1
      if (!selectedTeam1.includes(key)) {
        card.classList.remove("selected-team1");
      }
    }
    if (idx2 >= 0) {
      selectedTeam2.splice(idx2, 1);
      // Only remove class if no more instances on team 2
      if (!selectedTeam2.includes(key)) {
        card.classList.remove("selected-team2");
      }
    }
  } else if (team === 1) {
    const idx = selectedTeam1.indexOf(key);
    if (idx >= 0) {
      selectedTeam1.splice(idx, 1);
      // Only remove class if no more instances on team 1
      if (!selectedTeam1.includes(key)) {
        card.classList.remove("selected-team1");
      }
    }
  } else {
    const idx = selectedTeam2.indexOf(key);
    if (idx >= 0) {
      selectedTeam2.splice(idx, 1);
      // Only remove class if no more instances on team 2
      if (!selectedTeam2.includes(key)) {
        card.classList.remove("selected-team2");
      }
    }
  }
  const stillOnTeam1 = selectedTeam1.includes(key);
  const stillOnTeam2 = selectedTeam2.includes(key);
  if (stillOnTeam1 && !stillOnTeam2) {
    card.style.borderColor = "#ff7700";
    card.style.boxShadow = "0 0 12px #ff770088";
  } else if (stillOnTeam2 && !stillOnTeam1) {
    card.style.borderColor = "#3399ff";
    card.style.boxShadow = "0 0 12px #3399ff88";
  } else if (!stillOnTeam1 && !stillOnTeam2) {
    card.style.borderColor = "";
    card.style.boxShadow = "";
  }
  updateStartBtn();
}

function updateStartBtn() {
  const btn = document.getElementById("start-btn");
  const hint = document.getElementById("select-hint");
  const totalSelected = selectedTeam1.length + selectedTeam2.length;
  const team1Count = selectedTeam1.length;
  const team2Count = selectedTeam2.length;
  const ready = totalSelected >= 2;
  btn.classList.toggle("ready", ready);
  if (ready) {
    if (team1Count === 0 || team2Count === 0) {
      hint.textContent = `${totalSelected} fighter${totalSelected !== 1 ? "s" : ""} - free for all mode!`;
    } else {
      hint.textContent = `${team1Count} vs ${team2Count} - ready!`;
    }
  } else {
    hint.textContent = `Pick 2-8 fighters (Click = Team Orange, Right-click = Team Blue, Hold = Deselect)`;
  }
}

function showMenu() {
  gameRunning = false;
  document.getElementById("menu").classList.add("active");
  document.getElementById("game").classList.remove("active");
  document.getElementById("result").classList.remove("active");
  buildMenu();
}

// ── Game Start ────────────────────────────────────────────────────────

function startGame() {
  const totalSelected = selectedTeam1.length + selectedTeam2.length;
  if (totalSelected < 2) return;

  spawnCounts = {};

  balls         = [];
  floatingTexts = [];
  isFreeForAll  = false;  // Will check if teams have fighters

  const count   = selectedTeam1.length + selectedTeam2.length;
  const spacing = ARENA.w / (count + 1);
  
  // Spawn Team 1 fighters
  selectedTeam1.forEach((key, i) => {
    const bx = ARENA.x + spacing * (i + 1);
    const by = ARENA.y + ARENA.h * 0.38;
    const ball = createBall(key, bx, by);
    ball.team = 1;
    balls.push(ball);
  });
  
  // Spawn Team 2 fighters
  selectedTeam2.forEach((key, i) => {
    const bx = ARENA.x + spacing * (selectedTeam1.length + i + 1);
    const by = ARENA.y + ARENA.h * 0.38;
    const ball = createBall(key, bx, by);
    ball.team = 2;
    balls.push(ball);
  });
  
  // Check if we have fighters from both teams
  const team1Count = balls.filter(b => b.team === 1).length;
  const team2Count = balls.filter(b => b.team === 2).length;
  // Free-for-all if: all on one team, or 1v1 (single fighter per team)
  isFreeForAll = team1Count === 0 || team2Count === 0 || (team1Count === 1 && team2Count === 1);

  buildHPBars();
  document.getElementById("menu").classList.remove("active");
  document.getElementById("game").classList.add("active");
  document.getElementById("result").classList.remove("active");

  gameRunning = true;
  lastTime    = performance.now();
  requestAnimationFrame(gameLoop);
}

// ── Main Loop ─────────────────────────────────────────────────────────

function gameLoop(timestamp) {
  if (!gameRunning) return;

  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  for (const ball of balls) {
    if (ball.dead) continue;
    physicsUpdate(ball, dt);
    if (ball.def.onUpdate) ball.def.onUpdate(ball, dt, ARENA, balls);
    if (ball.hp < 0.5 && !ball.dead) {
      ball.dead = true;
      if (ball.def.onDeath) ball.def.onDeath(ball, balls);
    }
  }

  resolveBallCollisions();

  for (const ft of floatingTexts) {
    ft.y    += ft.vy * dt;
    ft.life -= dt * 1.1;
  }
  floatingTexts = floatingTexts.filter(f => f.life > 0);

  const alive = balls.filter(b => !b.dead);
  
  if (isFreeForAll) {
    // Free for all: game ends when only 1 or 0 fighters remain
    if (alive.length <= 1) {
      gameRunning = false;
      render(); updateHPBars();
      setTimeout(() => showResult(alive[0] ?? null), 700);
      return;
    }
  } else {
    // Team mode: game ends when one team is eliminated
    const team1Alive = alive.filter(b => b.team === 1);
    const team2Alive = alive.filter(b => b.team === 2);
    
    if (team1Alive.length === 0 || team2Alive.length === 0) {
      gameRunning = false;
      render(); updateHPBars();
      const winner = team1Alive.length > 0 ? 1 : (team2Alive.length > 0 ? 2 : 0);
      setTimeout(() => showResult(winner), 700);
      return;
    }
  }

  updateHPBars();
  render();
  requestAnimationFrame(gameLoop);
}

// ── Result ────────────────────────────────────────────────────────────

function showResult(winner) {
  document.getElementById("game").classList.remove("active");
  document.getElementById("result").classList.add("active");
  const nameEl = document.getElementById("winner-name");
  const subEl  = document.getElementById("winner-sub");
  
  if (isFreeForAll) {
    // Free for all mode: display winner fighter name
    if (winner) {
      const isLight = winner.color === "#dddddd" || winner.color === "#ffffff" || winner.color === "#eeeeee";
      nameEl.textContent  = winner.name;
      nameEl.style.color  = isLight ? "#ccc" : winner.color;
      subEl.textContent   = "wins the arena!";
    } else {
      nameEl.textContent = "Draw!";
      nameEl.style.color = "#888";
      subEl.textContent  = "they knocked each other out";
    }
  } else {
    // Team mode: display winning team
    if (winner === 1) {
      nameEl.textContent  = "Team Orange";
      nameEl.style.color  = "#ff7700";
      subEl.textContent   = "wins the arena!";
    } else if (winner === 2) {
      nameEl.textContent  = "Team Blue";
      nameEl.style.color  = "#3399ff";
      subEl.textContent   = "wins the arena!";
    } else {
      nameEl.textContent = "Draw!";
      nameEl.style.color = "#888";
      subEl.textContent  = "both teams knocked each other out";
    }
  }
}

// ── Boot ──────────────────────────────────────────────────────────────
showMenu();
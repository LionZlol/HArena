// ═══════════════════════════════════════════════════════════════════════
//
//   BALL DEFINITIONS — Add your new fighters below!
//
//   Each fighter is an object with:
//
//   REQUIRED:
//     color       CSS color string (e.g. "#ff3333")
//     radius      Ball size in pixels
//     maxHP       Max + starting HP
//     label       Display name
//     description Short flavor text shown on the menu card
//
//   OPTIONAL HOOKS:
//
//     onInit(ball)
//       → Called once when the ball is spawned.
//         Add custom properties here (e.g. ball.myTimer = 0).
//
//     onUpdate(ball, dt, arena, balls)
//       → Called every frame. Use for passive effects, custom attacks, etc.
//         dt     = seconds since last frame (usually ~0.016)
//         arena  = { x, y, w, h } of the playfield rectangle
//         balls  = array of ALL active Ball instances
//
//     onWallBounce(ball, wall)
//       → Called when the ball bounces off a wall hard enough (vel > 80).
//         wall = "left" | "right" | "top" | "bottom"
//
//     onBallCollide(ball, other)
//       → Called when this ball physically touches another ball.
//
//     onDraw(ctx, ball)
//       → Called AFTER the ball circle is drawn. Use to draw weapons,
//         accessories, labels, effects, etc. on the canvas.
//
//     onDeath(ball, balls)
//       → Called once when HP drops to 0.
//
//   BALL PROPERTIES AVAILABLE IN ALL HOOKS:
//     ball.x, ball.y     — position (pixels)
//     ball.vx, ball.vy   — velocity (pixels/sec)
//     ball.hp            — current HP
//     ball.maxHP         — max HP
//     ball.radius        — radius (pixels)
//     ball.dead          — true once eliminated
//     ball.color         — CSS color string
//     ball.name          — display name
//     ball.def           — reference to this definition object
//     + any custom props you set in onInit!
//
//   HELPER FUNCTIONS (call these anywhere):
//     spawnText(x, y, text, color)   — floating damage text on the canvas
//     segCircle(x1,y1, x2,y2, cx,cy, r) — line-segment vs circle collision test
//     ballCheck(ball, other)         — returns true if other should be skipped (self, dead, or same team)
//
// ═══════════════════════════════════════════════════════════════════════

const W_FIGHTERS = {
  // ─────────────────────────────────────────────
  "Controllable": {
    color: "#ffffff",
    radius: 22,
    maxHP: 99,
    label: "Controllable",
    description: "A ball with a sword that points to your cursor. Click to dash.",

    onInit(ball) {
      ball.angle = 0;
      ball.damage = 1;
      ball.swordCooldowns = new Map();
      controllableBall = ball; // register globally
    },

    onUpdate(ball, dt, arena, balls) {
      ball.angle = Math.atan2(mouseY - ball.y, mouseX - ball.x);

      const swordLen = 44;
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + swordLen);
      const y2 = ball.y + sin * (ball.radius + swordLen);

      for (const other of balls) {
        if (ballCheck(ball, other)) continue;

        let cd = ball.swordCooldowns.get(other) ?? 0;
        if (cd > 0) {
          ball.swordCooldowns.set(other, cd - dt);
          continue;
        }

        if (segCircle(x1, y1, x2, y2, other.x, other.y, other.radius + 2)) {
          other.hp = Math.max(0, other.hp - ball.damage);
          stunBall(other);
          spawnText(other.x, other.y - 26, `-${Math.round(ball.damage)}`, "#ffffff");
          ball.damage += 1;
          ball.swordCooldowns.set(other, 0.34);
        }
      }
    },

    onDraw(ctx, ball) {
      const swordLen = 44;
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + swordLen);
      const y2 = ball.y + sin * (ball.radius + swordLen);
      const tipX = x2;
      const tipY = y2;

      ctx.save();

      // White stick
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#ffffff";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 6;
      ctx.stroke();

      ctx.restore();

      setHPExtra(ball, `🖱️ dmg: ${Math.round(ball.damage)}`);
    },
  },

  "H Sword": {
    color: "#ff3b3b",
    radius: 22,
    maxHP: 99,
    label: "H Sword",
    description: "A ball with a sword. Each hit increases its damage.",

    onInit(ball) {
      ball.angle = 0; // current rotation (radians)
      ball.damage = 1; // grows by 1 each time the sword connects
      ball.swordCooldowns = new Map(); // per-target cooldown
    },

    onUpdate(ball, dt, arena, balls) {
      // Rotate sword
      if (!ball.stunned) ball.angle += 4 * dt;

      // Build sword segment: from edge of ball to sword tip
      const SWORD_LEN = 44;
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + SWORD_LEN);
      const y2 = ball.y + sin * (ball.radius + SWORD_LEN);

      for (const other of balls) {
        if (ballCheck(ball, other)) continue;

        let cd = ball.swordCooldowns.get(other) ?? 0;
        if (cd > 0) {
          ball.swordCooldowns.set(other, cd - dt);
          continue;
        }

        if (segCircle(x1, y1, x2, y2, other.x, other.y, other.radius + 2)) {
          other.hp = Math.max(0, other.hp - ball.damage);
          stunBall(other);
          spawnText(other.x, other.y - 26, `-${Math.round(ball.damage)}`, "#ffdd00");
          ball.damage++;
          ball.swordCooldowns.set(other, 0.32); // 320 ms between hits
        }
      }
    },

    onDraw(ctx, ball) {
      const SWORD_LEN = 44;
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + SWORD_LEN);
      const y2 = ball.y + sin * (ball.radius + SWORD_LEN);
      // Guard crossbar
      const gx = ball.x + cos * (ball.radius + 9);
      const gy = ball.y + sin * (ball.radius + 9);
      const px = -sin * 9;
      const py = cos * 9;

      ctx.save();
      ctx.shadowColor = "#ffaa00";
      ctx.shadowBlur = 14;
      // Blade
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "#ffe880";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.stroke();
      // Guard
      ctx.beginPath();
      ctx.moveTo(gx - px, gy - py);
      ctx.lineTo(gx + px, gy + py);
      ctx.strokeStyle = "#cc8800";
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();

      setHPExtra(ball, `🗡️ dmg: ${Math.round(ball.damage)}`);
    },
  },

  "H Spear": {
    color: "#4af0ff",
    radius: 22,
    maxHP: 99,
    label: "H Spear",
    description: "A ball with a spear. Each hit increases its damage and length.",

    onInit(ball) {
      ball.angle = 0;
      ball.spearLength = 24;
      ball.damage = 1;
      ball.spearCooldowns = new Map(); // per-target cooldown
    },

    onUpdate(ball, dt, arena, balls) {
      if (!ball.stunned) ball.angle += 3.2 * dt;

      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + ball.spearLength);
      const y2 = ball.y + sin * (ball.radius + ball.spearLength);

      for (const other of balls) {
        if (ballCheck(ball, other)) continue;

        let cd = ball.spearCooldowns.get(other) ?? 0;
        if (cd > 0) {
          ball.spearCooldowns.set(other, cd - dt);
          continue;
        }

        if (segCircle(x1, y1, x2, y2, other.x, other.y, other.radius + 2)) {
          other.hp = Math.max(0, other.hp - ball.damage);
          stunBall(other);
          spawnText(other.x, other.y - 28, `-${Math.round(ball.damage)}`, "#4af0ff");
          ball.damage += 0.6;
          ball.spearLength += 14;
          ball.spearCooldowns.set(other, 0.38);
        }
      }
    },

    onDraw(ctx, ball) {
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + ball.spearLength);
      const y2 = ball.y + sin * (ball.radius + ball.spearLength);
      const tipSize = 7 + ball.damage * 0.8;
      const px = -sin * tipSize;
      const py = cos * tipSize;

      ctx.save();
      ctx.shadowColor = "#4af0ff";
      ctx.shadowBlur = 16;
      // Shaft
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2 - cos * tipSize, y2 - sin * tipSize);
      ctx.strokeStyle = "#aaeeff";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.stroke();
      // Spearhead triangle
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - cos * tipSize * 2 + px, y2 - sin * tipSize * 2 + py);
      ctx.lineTo(x2 - cos * tipSize * 2 - px, y2 - sin * tipSize * 2 - py);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();

      setHPExtra(ball, `🔱 dmg: ${Math.round(ball.damage)}  len: ${Math.round(ball.spearLength)}`);
    },
  },

  "H Dagger": {
    color: "#7fff7f",
    radius: 22,
    maxHP: 99,
    label: "H Dagger",
    description: "A ball with a dagger. Each hit increases its damage and attack speed.",

    onInit(ball) {
      ball.angle = 0;
      ball.daggerSpeed = 4.8; // spin rate in rad/s, grows on hit
      ball.damage = 1;
      ball.daggerCooldowns = new Map(); // per-target cooldown
      ball.baseCooldown = 0.08;
    },

    onUpdate(ball, dt, arena, balls) {
      if (!ball.stunned) ball.angle += ball.daggerSpeed * dt;

      const DAGGER_LEN = 34; // shorter than sword
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + DAGGER_LEN);
      const y2 = ball.y + sin * (ball.radius + DAGGER_LEN);

      for (const other of balls) {
        if (ballCheck(ball, other)) continue;

        let cd = ball.daggerCooldowns.get(other) ?? 0;
        if (cd > 0) {
          ball.daggerCooldowns.set(other, cd - dt);
          continue;
        }

        if (segCircle(x1, y1, x2, y2, other.x, other.y, other.radius + 2)) {
          other.hp = Math.max(0, other.hp - ball.damage);
          stunBall(other);
          spawnText(other.x, other.y - 26, `-${Math.round(ball.damage)}`, "#7fff7f");
          ball.daggerSpeed += 1.4; // spin faster each hit
          ball.baseCooldown -= 0.005;
          ball.baseCooldown = Math.max(0.01, ball.baseCooldown); 
          ball.daggerCooldowns.set(other, ball.baseCooldown); // per-target cooldown
          ball.damage += 0.2; // slight buff cuz this guy is weak asf lmao
        }
      }
    },

    onDraw(ctx, ball) {
      const DAGGER_LEN = 32;
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + DAGGER_LEN);
      const y2 = ball.y + sin * (ball.radius + DAGGER_LEN);
      // small crossguard
      const gx = ball.x + cos * (ball.radius + 6);
      const gy = ball.y + sin * (ball.radius + 6);
      const px = -sin * 5;
      const py = cos * 5;

      ctx.save();
      ctx.shadowColor = "#aaffaa";
      ctx.shadowBlur = 12;
      // Blade
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "#ccffcc";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.stroke();
      // Guard
      ctx.beginPath();
      ctx.moveTo(gx - px, gy - py);
      ctx.lineTo(gx + px, gy + py);
      ctx.strokeStyle = "#44aa44";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();

      setHPExtra(ball, `🔪 spd: ${ball.daggerSpeed.toFixed(1)} dmg: ${Math.round(ball.damage)}`);
    },
  },

  "H Bat": {
    color: "#e6e696", // Desaturated Yellow
    radius: 22,
    maxHP: 99,
    label: "H Bat",
    description: "A ball with a bat. Each hit increases its damage, swing interval, and swing rotation.",

    onInit(ball) {
      ball.angle = 0;
      ball.swingInterval = 2.0;
      ball.cycleTimer = 0;
      ball.isSwinging = false;
      ball.swingDamage = 1;
      ball.swingDegrees = 360; // Starts with a full circle
      ball.swingStartAngle = ball.angle;
      ball.hitCooldowns = new Map();
    },

    onUpdate(ball, dt, arena, balls) {
      ball.cycleTimer += dt;

      // --- 1. Animation Logic ---
      // 0s-2s: Idle | 2s-3s: Swinging (1s Duration)
      if (ball.cycleTimer < ball.swingInterval) {
        ball.isSwinging = false;
      } else if (ball.cycleTimer < ball.swingInterval + 1.0) {

        if (!ball.isSwinging) {
          ball.swingStartAngle = ball.angle;
        }

        ball.isSwinging = true;

        const progress = (ball.cycleTimer - ball.swingInterval) / 1.0;
        const totalRotation = (ball.swingDegrees * Math.PI) / 180;

        ball.angle = ball.swingStartAngle + progress * totalRotation;

      } else {
        ball.cycleTimer = 0; // restart the cycle
      }

      // --- 2. Collision Logic ---
      const BAT_LEN = 44;
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + BAT_LEN);
      const y2 = ball.y + sin * (ball.radius + BAT_LEN);

      for (const other of balls) {
        if (ballCheck(ball, other)) continue;

        let cd = ball.hitCooldowns.get(other) ?? 0;
        if (cd > 0) {
          ball.hitCooldowns.set(other, cd - dt);
          continue;
        }

        if (segCircle(x1, y1, x2, y2, other.x, other.y, other.radius + 2)) {
          const finalDmg = ball.isSwinging ? ball.swingDamage : 1;

          other.hp = Math.max(0, other.hp - finalDmg);
          ball.swingInterval = Math.max(0.1, ball.swingInterval - 0.05); // Swing faster with each hit, down to a minimum of 0.1s per swing
          stunBall(other);
          spawnText(other.x, other.y - 25, `-${Math.round(finalDmg)}`, "#ffffaa");

          // GROWTH MECHANIC:
          ball.swingDamage++; // Increase power
          ball.swingDegrees += 45; // Add 45 degrees to the swing per hit!

          ball.hitCooldowns.set(other, 0.16);
        }
      }
    },

    onDraw(ctx, ball) {
      const BAT_LEN = 44;
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + BAT_LEN);
      const y2 = ball.y + sin * (ball.radius + BAT_LEN);

      ctx.save();
      // Handle
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "#7a664d";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.stroke();

      // Barrel (The "Meat" of the bat)
      ctx.beginPath();
      const bX = x1 + cos * (BAT_LEN * 0.35);
      const bY = y1 + sin * (BAT_LEN * 0.35);
      ctx.moveTo(bX, bY);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "#e6e696";
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.restore();

      setHPExtra(ball, `🏏 dmg: ${Math.round(ball.swingDamage)} arc: ${Math.round(ball.swingDegrees)}°`);
    },
  },

  "H Scepter": {
    color: "#ff3bdd",
    radius: 22,
    maxHP: 99,
    label: "H Scepter",
    description: "A ball with a scepter. Each hit increases its damage and life steal.",

    onInit(ball) {
      ball.angle = 0; // current rotation (radians)
      ball.damage = 1; // grows by 0.5 each time the scepter connects
      ball.lifeSteal = 0; // grows by 0.25 each time the scepter hits
      ball.scepterCooldowns = new Map(); // per-target cooldown
    },

    onUpdate(ball, dt, arena, balls) {
      // Rotate scepter
      if (!ball.stunned) ball.angle += 4 * dt;

      // Build scepter blade segment: from edge of ball outward
      const SCEPTER_LEN = 44;
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + SCEPTER_LEN);
      const y2 = ball.y + sin * (ball.radius + SCEPTER_LEN);

      // Check hits with other balls
      for (const other of balls) {
        if (ballCheck(ball, other)) continue;

        let cd = ball.scepterCooldowns.get(other) ?? 0;
        if (cd > 0) {
          ball.scepterCooldowns.set(other, cd - dt);
          continue;
        }

        if (segCircle(x1, y1, x2, y2, other.x, other.y, other.radius + 2)) {
          other.hp = Math.max(0, other.hp - ball.damage);
          // Heal self when hitting - up to maxHP
          ball.hp = Math.min(ball.maxHP, ball.hp + ball.lifeSteal);
          spawnText(other.x, other.y - 26, `-${Math.round(ball.damage)}`, "#ff33ff");
          spawnText(ball.x, ball.y - ball.radius - 24, `+${Math.round(ball.lifeSteal)}`, "#33ff44");
          stunBall(other);
          ball.damage += 0.5; // Increase hit damage by .5 per hit
          ball.lifeSteal += 0.25;
          ball.scepterCooldowns.set(other, 0.16); // Per-target cooldown
        }
      }
    },

    onDraw(ctx, ball) {
      const SCEPTER_LEN = 44;
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + SCEPTER_LEN);
      const y2 = ball.y + sin * (ball.radius + SCEPTER_LEN);

      ctx.save();
      ctx.shadowColor = "#ff33ff";
      ctx.shadowBlur = 14;

      // Draw the scepter blade line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "#ff88ff";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.stroke();

      // Draw the little green ball at the tip
      ctx.beginPath();
      ctx.arc(x2, y2, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#33ff44"; // bright green color
      ctx.shadowColor = "#33ff44";
      ctx.shadowBlur = 12;
      ctx.fill();

      ctx.restore();

      setHPExtra(ball, `🪄 dmg: ${Math.round(ball.damage)} heal: ${Math.round(ball.lifeSteal)}`);
    },
  },

  "H Mace": {
    color: "#333333",      // dark gray body
    radius: 22,
    maxHP: 99,
    label: "H Mace",
    description: "A ball with a mace. Each hit increases its damage and mace head size.",

    onInit(ball) {
      ball.angle = 0;           // rotation for the mace
      ball.maceLen = 44;            // fixed length (does NOT grow)
      ball.maceHeadRadius = 10;     // size of the mace head (grows on hit)
      ball.maceHandleWidth = 6;     // handle thickness (grows on hit)
      ball.maceDamage = 1;          // starting damage
      ball.maceCooldowns = new Map();
    },

    onUpdate(ball, dt, arena, balls) {
      // rotate the mace slowly
      if (!ball.stunned) ball.angle += 2.8 * dt;

      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + ball.maceLen);
      const y2 = ball.y + sin * (ball.radius + ball.maceLen);

      for (const other of balls) {
        if (ballCheck(ball, other)) continue;

        let cd = ball.maceCooldowns.get(other) ?? 0;
        if (cd > 0) {
          ball.maceCooldowns.set(other, cd - dt);
          continue;
        }

        // NOTE: other.radius + 2 is the usual buffer.
        // Adding ball.maceHeadRadius makes the *effective* hitbox grow with the head.
        const effectiveRadius = other.radius + 2 + ball.maceHeadRadius;

        if (segCircle(x1, y1, x2, y2, other.x, other.y, effectiveRadius)) {
          // Hit: apply damage, stun, and growth
          other.hp = Math.max(0, other.hp - ball.maceDamage);
          stunBall(other);
          spawnText(other.x, other.y - 26, `-${Math.round(ball.maceDamage)}`, "#bbbbbb");

          // Grow the mace visually (not longer, just thicker/larger)
          ball.maceHeadRadius += 0.8;      // increase head size each hit
          ball.maceHandleWidth += 0.4;     // increase handle thickness each hit
          ball.maceDamage += 0.3;            // increase damage

          // per-target cooldown
          ball.maceCooldowns.set(other, 0.34);
        }
      }
    },

    onDraw(ctx, ball) {
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + ball.maceLen);
      const y2 = ball.y + sin * (ball.radius + ball.maceLen);

      ctx.save();
      // draw handle (thicker line as it grows)
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = Math.max(1, ball.maceHandleWidth);
      ctx.lineCap = "round";
      ctx.strokeStyle = "#5a5a5a";
      ctx.stroke();

      // draw mace head (grows in radius)
      ctx.beginPath();
      ctx.arc(x2, y2, Math.max(4, ball.maceHeadRadius), 0, Math.PI * 2);
      ctx.fillStyle = "#4e4e4e";
      ctx.shadowColor = "#777777";
      ctx.shadowBlur = 8;
      ctx.fill();

      ctx.restore();

      setHPExtra(ball, `⚫ dmg: ${Math.round(ball.maceDamage)}  size: ${Math.round(ball.maceHeadRadius)}`);
    },
  },

  "H Torch": {
    color: "#7B3F00",
    radius: 22,
    maxHP: 99,
    label: "H Torch",
    description: "A ball with a torch. Each hit increases its DPS dealt to the enemy.",

    onInit(ball) {
      ball.angle = 0;
      ball.torchLen = 42;
      ball.torchDamage = 0.3;        // base fire dps added per hit
      ball.torchCooldowns = new Map();
      ball.burnStacks = new Map();   // target -> { dps, timer }
    },

    onUpdate(ball, dt, arena, balls) {
      if (!ball.stunned) ball.angle += 2.4 * dt;
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + ball.torchLen);
      const y2 = ball.y + sin * (ball.radius + ball.torchLen);

      const flameRadius = 10;

      // Hit detection
      for (const other of balls) {
        if (ballCheck(ball, other)) continue;

        let cd = ball.torchCooldowns.get(other) ?? 0;
        if (cd > 0) {
          ball.torchCooldowns.set(other, cd - dt);
          continue;
        }

        if (segCircle(x1, y1, x2, y2, other.x, other.y, other.radius + flameRadius)) {
          // Add/refresh burn stack on target
          let burn = ball.burnStacks.get(other) ?? { dps: 0, timer: 0 };
          burn.dps += ball.torchDamage;
          burn.timer = 5.8;
          ball.burnStacks.set(other, burn);
          stunBall(other);
          spawnText(other.x, other.y - 26, `+${ball.torchDamage.toFixed(1)}`, "#FF6600");
          ball.torchDamage += 0.1; // each hit increases future fire dps
          ball.torchCooldowns.set(other, 0.45);
        }
      }

      // Tick burn damage on all burning targets
      for (const [target, burn] of ball.burnStacks) {
        if (target.dead) {
          ball.burnStacks.delete(target);
          continue;
        }
        if (burn.timer > 0) {
          burn.timer -= dt;
          target.hp = Math.max(0, target.hp - burn.dps * dt);
          if (burn.timer <= 0) {
            ball.burnStacks.delete(target);
          }
        }
      }
    },

    onDraw(ctx, ball) {
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + ball.torchLen);
      const y2 = ball.y + sin * (ball.radius + ball.torchLen);

      ctx.save();

      // Brown wooden handle
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#6B3A1F";
      ctx.stroke();

      // Flame at tip
      drawFlame(ctx, x2, y2, ball.angle);

      ctx.restore();

      setHPExtra(ball, `🔦 ${ball.torchDamage.toFixed(1)} dps`);
    },
  },
  
  "H Bow": {
    color: "#548B22", // Forest Green
    radius: 22,
    maxHP: 99,
    label: "H Bow",
    description: "A ball with a bow. Shoots arrow projectiles. Each hit decreases the interval.",

    onInit(ball) {
      ball.angle = 0;
      ball.shootTimer = 0;
      ball.shootInterval = 1.0; // Starts at 1 second
      ball.arrows = []; // To track active projectiles
      ball.damage = 4;
    },

    onUpdate(ball, dt, arena, balls) {
      // Rotate the bow over time
      if (!ball.stunned) ball.angle += 3 * dt;

      // Handle Shooting Logic
      ball.shootTimer += dt;
      if (ball.shootTimer >= ball.shootInterval) {
        ball.shootTimer = 0;
        // Spawn an arrow
        ball.arrows.push({
          x: ball.x + Math.cos(ball.angle) * ball.radius,
          y: ball.y + Math.sin(ball.angle) * ball.radius,
          vx: Math.cos(ball.angle) * 450, // Arrow speed
          vy: Math.sin(ball.angle) * 450,
          angle: ball.angle,
          active: true
        });
      }

      // Update Arrows
      for (let i = ball.arrows.length - 1; i >= 0; i--) {
        const arrow = ball.arrows[i];
        arrow.x += arrow.vx * dt;
        arrow.y += arrow.vy * dt;

        // Collision check with other balls
        for (const other of balls) {
          if (ballCheck(ball, other)) continue;
          
          const dx = arrow.x - other.x;
          const dy = arrow.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < other.radius + 14) {
            other.hp = Math.max(0, other.hp - ball.damage);
            stunBall(other);
            spawnText(other.x, other.y - 26, `-${ball.damage}`, "#ffffff");
            
            // Multiply interval by 0.82 (Increase fire rate)
            ball.shootInterval *= 0.82;
            
            arrow.active = false;
            ball.arrows.splice(i, 1);
            break; 
          }
        }

        // Remove arrows out of bounds
        if (arrow.active && (arrow.x < 0 || arrow.x > arena.w || arrow.y < 0 || arrow.y > arena.h)) {
          ball.arrows.splice(i, 1);
        }
      }
    },

    onDraw(ctx, ball) {
      const bowSize = 30;
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      
      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.rotate(ball.angle);

      // Draw the Bow String (White)
      ctx.beginPath();
      ctx.moveTo(ball.radius, -bowSize);
      ctx.lineTo(ball.radius - 10, 0); // String pulled back slightly
      ctx.lineTo(ball.radius, bowSize);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw the Wooden Bow (Arc)
      ctx.beginPath();
      ctx.arc(ball.radius - 15, 0, bowSize, -Math.PI / 2, Math.PI / 2);
      ctx.strokeStyle = "#8B4513"; // Wood Brown
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.restore();

      // Draw active arrows in the world
      ball.arrows.forEach(arrow => {
        ctx.save();
        ctx.translate(arrow.x, arrow.y);
        ctx.rotate(arrow.angle);
      
        // Increase these values to make the arrow bigger
        const arrowLength = 30;
        const headSize = 8;
        const thickness = 4;
      
        // Arrow Shaft
        ctx.beginPath();
        ctx.moveTo(-arrowLength / 2, 0);
        ctx.lineTo(arrowLength / 2, 0);
        ctx.strokeStyle = "#dddddd";
        ctx.lineWidth = thickness; //
        ctx.lineCap = "round";     //
        ctx.stroke();
      
        // Arrow Head
        ctx.beginPath();
        ctx.moveTo(arrowLength / 2, 0);
        ctx.lineTo(arrowLength / 2 - headSize, -headSize / 1.5);
        ctx.lineTo(arrowLength / 2 - headSize, headSize / 1.5);
        ctx.closePath();
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      
        ctx.restore();
      });

      setHPExtra(ball, `🏹 spd: ${(1/ball.shootInterval).toFixed(2)}/s`);
    }
  },

  "H Axe": {
    color: "#6d0b0b",
    radius: 22,
    maxHP: 99,
    label: "H Axe",
    description: "A ball with an axe. Each hit increases its crit chance and crit damage.",

    onInit(ball) {
      ball.angle = 0;              // axe angle for rotation
      ball.damage = 1;                // non-crit damage (always 1)
      ball.critDamage = 3;            // crit damage (starts at 3, grows by 2 per hit)
      ball.critChance = 3;            // crit chance percentage (starts at 3%, grows by 2% per hit)
      ball.axeCooldowns = new Map();  // cooldown
    },

    onUpdate(ball, dt, arena, balls) {
      if (!ball.stunned) ball.angle += 3.8 * dt;  // rotate

      // axe hitbox logic
      const AXE_LEN = 40;  // handle length
      const HEAD_RADIUS = 20;  // axe head radius
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const headX = ball.x + cos * (ball.radius + AXE_LEN);
      const headY = ball.y + sin * (ball.radius + AXE_LEN);
      // Tip of the axe head (end of the semicircle)
      const x2 = headX - HEAD_RADIUS * Math.sin(ball.angle);
      const y2 = headY + HEAD_RADIUS * Math.cos(ball.angle);

      // check other balls (ayo?)
      for (const other of balls) {
        if (ballCheck(ball, other)) continue;
        let cd = ball.axeCooldowns.get(other) ?? 0;
        if (cd > 0) {
          ball.axeCooldowns.set(other, cd - dt);
          continue;
        }
        
        // hit logic
        const effectiveRadius = other.radius + 2 + HEAD_RADIUS;  // Wider hitbox to cover head
        if (segCircle(x1, y1, x2, y2, other.x, other.y, effectiveRadius)) {
          const isCrit = Math.random() < ball.critChance / 100; // decide crit
          const finalDmg = isCrit ? ball.critDamage : ball.damage;
          other.hp = Math.max(0, other.hp - finalDmg);
          spawnText(other.x, other.y - 26, `-${Math.round(finalDmg)}${isCrit ? " (crit)" : ""}`, isCrit ? "#ff4444" : "#aa0000");
          if (isCrit) {
            stunBall(other, 0.64); // longer stun on crit
          } else {
            stunBall(other);
          }
          ball.critChance += 2.5;
          ball.critDamage += 2;  // Grow crit damage
          ball.axeCooldowns.set(other, 0.24);
        }
      }
    },

    onDraw(ctx, ball) {
      const AXE_LEN = 40;  // handle length
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + AXE_LEN);
      const y2 = ball.y + sin * (ball.radius + AXE_LEN);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = 6;
      ctx.shadowColor = "#862e2e";
      ctx.shadowBlur = 14;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#5a310f";
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(x2, y2);
      ctx.rotate(ball.angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.shadowColor = "#ce9d9d";
      ctx.shadowBlur = 14;
      ctx.arc(0, 0, 20, 0, Math.PI);
      ctx.fillStyle = "#ffe7e7";
      ctx.fill();
      ctx.restore();

      setHPExtra(ball, `🪓 crit dmg: ${Math.round(ball.critDamage)} chance: ${ball.critChance.toFixed(1)}%`);
    }
  },

  "H Hammer": {
    color: "#664848",
    radius: 22,
    maxHP: 99,
    label: "H Hammer",
    description: "A ball with a hammer. Each hit increases its damage and stun duration.",

    onInit(ball) {
      ball.angle = 0;
      ball.damage = 1;
      ball.stunDuration = 0.1;
      ball.cooldowns = new Map();
    },

    onUpdate(ball, dt, arena, balls) {
      // Rotate hammer
      if (!ball.stunned) ball.angle += 2.5 * dt;

      const HAMMER_LEN = 40;
      const HEAD_WIDTH = 20;
      const HEAD_HEIGHT = 40;  // Match onDraw
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + HAMMER_LEN);
      const y2 = ball.y + sin * (ball.radius + HAMMER_LEN);

      // Head hitbox: Check each edge of the rectangle
      // Calculate the 4 corners of the rotated rectangle
      const halfW = HEAD_WIDTH / 2;
      const halfH = HEAD_HEIGHT / 2;
      const corners = [
        { x: x2 + (-halfW * cos - -halfH * sin), y: y2 + (-halfW * sin + -halfH * cos) },  // top left
        { x: x2 + (halfW * cos - -halfH * sin), y: y2 + (halfW * sin + -halfH * cos) },   // top right
        { x: x2 + (halfW * cos - halfH * sin), y: y2 + (halfW * sin + halfH * cos) },     // bottom right
        { x: x2 + (-halfW * cos - halfH * sin), y: y2 + (-halfW * sin + halfH * cos) }    // bottom left
      ];

      // edges: top, right, bottom, left
      const edges = [
        [corners[0], corners[1]],  // top
        [corners[1], corners[2]],  // right
        [corners[2], corners[3]],  // bottom
        [corners[3], corners[0]]   // left
      ];

      for (const other of balls) {
        if (ballCheck(ball, other)) continue;
        let cd = ball.cooldowns.get(other) ?? 0;
        if (cd > 0) {
          ball.cooldowns.set(other, cd - dt);
          continue;
        }
        let hit = false;
        for (const [p1, p2] of edges) {
          if (segCircle(p1.x, p1.y, p2.x, p2.y, other.x, other.y, other.radius + 2)) {
            hit = true;
            break;
          }
        }
        if (hit) {
          // apply damage, etc. (same as handle)
          other.hp = Math.max(0, other.hp - ball.damage);
          stunBall(other, ball.stunDuration);
          spawnText(other.x, other.y - 26, `-${Math.round(ball.damage)}`, "#6d0b0b");
          ball.damage += 0.2;
          ball.stunDuration += 0.05;
          ball.cooldowns.set(other, 0.24);
        }
      }
    },

    onDraw(ctx, ball) {
      const HAMMER_LEN = 40;
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + HAMMER_LEN);
      const y2 = ball.y + sin * (ball.radius + HAMMER_LEN);

      const headWidth = 20;
      const headHeight = 40;

      // draw handle
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = 6;
      ctx.shadowColor = "#86512e";
      ctx.shadowBlur = 14;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#5a310f";
      ctx.stroke();
      ctx.restore();

      // draw head
      ctx.save();
      ctx.translate(x2, y2);
      ctx.rotate(ball.angle);
      ctx.beginPath();
      ctx.rect(-headWidth / 2, -headHeight / 2, headWidth, headHeight);  // centered at (0,0)
      ctx.fillStyle = "#8d8d8d";
      ctx.fill();
      ctx.restore();

      setHPExtra(ball, `🔨 dmg: ${Math.round(ball.damage)} stun: ${ball.stunDuration.toFixed(2)}`);
    }
  },

  "H Shuriken": {
    color: "#6B8E23",  // olive green
    radius: 22,
    maxHP: 99,
    label: "H Shuriken",
    description: "A ball that throws shurikens. Each hit increases the number of bounces the shurikens can do.",

    onInit(ball) {
      ball.angle = 0;
      ball.throwTimer = 0;
      ball.throwInterval = 0.5;  // every half second
      ball.maxBounces = 0;  // starts at 0
      ball.hitCount = 0;  // count to track when to increase bounces
      ball.thrownShurikens = [];  // array of active projectile shurikens
      ball.damage = 1;
    },

    onUpdate(ball, dt, arena, balls) {
      // rotate the shuriken angle
      if (!ball.stunned) ball.angle += 4 * dt;

      // throwing logic
      ball.throwTimer += dt;
      if (ball.throwTimer >= ball.throwInterval) {
        ball.throwTimer = 0;
        // spawn a new thrown shuriken
        const speed = 400;  // pixels per second
        ball.thrownShurikens.push({
          x: ball.x + Math.cos(ball.angle) * ball.radius,
          y: ball.y + Math.sin(ball.angle) * ball.radius,
          vx: Math.cos(ball.angle) * speed,
          vy: Math.sin(ball.angle) * speed,
          angle: ball.angle,
          bounces: 0,
          active: true
        });
      }

      // update thrown shurikens
      for (let i = ball.thrownShurikens.length - 1; i >= 0; i--) {
        const shuriken = ball.thrownShurikens[i];
        shuriken.x += shuriken.vx * dt;
        shuriken.y += shuriken.vy * dt;
        shuriken.angle += 8 * dt;  // spin as it travels

        // check wall bounces
        if (shuriken.x < 0 || shuriken.x > arena.w) {
          shuriken.vx *= -1;
          shuriken.bounces++;
          shuriken.x = Math.max(0, Math.min(arena.w, shuriken.x));
        }
        if (shuriken.y < 0 || shuriken.y > arena.h) {
          shuriken.vy *= -1;
          shuriken.bounces++;
          shuriken.y = Math.max(0, Math.min(arena.h, shuriken.y));
        }

        // remove if exceeded max bounces
        if (shuriken.bounces > ball.maxBounces) {
          ball.thrownShurikens.splice(i, 1);
          continue;
        }

        // check collision with other balls
        for (const other of balls) {
          if (ballCheck(ball, other)) continue;
          const dx = shuriken.x - other.x;
          const dy = shuriken.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < other.radius + 14) {  // 14 is approximate shuriken size
            other.hp = Math.max(0, other.hp - ball.damage);
            spawnText(other.x, other.y - 26, `-${Math.round(ball.damage)}`, "#6B8E23");
            // increment hit count and check if we should increase max bounces
            ball.hitCount++;
            if (ball.hitCount % 4 === 0) {
              ball.maxBounces++;
            }
            // remove the shuriken after hit
            ball.thrownShurikens.splice(i, 1);
            break;
          }
        }
      }
    },

    onDraw(ctx, ball) {
      const shurikenSize = 14;
      
      // draw thrown shurikens
      for (const shuriken of ball.thrownShurikens) {
        ctx.save();
        ctx.translate(shuriken.x, shuriken.y);
        ctx.rotate(shuriken.angle);
        ctx.strokeStyle = "#6B8E23";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#6B8E23";
        ctx.shadowBlur = 8;
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * shurikenSize, Math.sin(angle) * shurikenSize);
          ctx.stroke();
        }
        ctx.restore();
      }

      setHPExtra(ball, `⭐ bounces: ${ball.maxBounces}  shurikens: ${ball.thrownShurikens.length}`);
    }
  },

  "H Pistol": {
    color: "#1e1e1e",
    radius: 22,
    maxHP: 99,
    label: "H Pistol",
    description: "A ball with a gun. Shoots bullets that increase in size and damage upon a hit.",

    onInit(ball) {
      ball.angle = 0;
      ball.shootTimer = 0;
      ball.shootInterval = 0.6;
      ball.bullets = [];
      ball.damage = 1;
      ball.bulletSize = 6;
    },

    onUpdate(ball, dt, arena, balls) {
      if (!ball.stunned) ball.angle += 2.5 * dt;

      // shooting logic
      ball.shootTimer += dt;
      if (ball.shootTimer >= ball.shootInterval) {
        ball.shootTimer = 0;
        ball.bullets.push({
          x: ball.x + Math.cos(ball.angle) * ball.radius,
          y: ball.y + Math.sin(ball.angle) * ball.radius,
          vx: Math.cos(ball.angle) * 400,
          vy: Math.sin(ball.angle) * 400,
          damage: ball.damage,
          size: ball.bulletSize,
          active: true
        });
      }

      // update bullets
      for (let i = ball.bullets.length - 1; i >= 0; i--) {
        const bullet = ball.bullets[i];
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;

        // collision with other balls
        for (const other of balls) {
          if (ballCheck(ball, other)) continue;
          const dx = bullet.x - other.x;
          const dy = bullet.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < other.radius + bullet.size) {
            other.hp = Math.max(0, other.hp - bullet.damage);
            stunBall(other);
            spawnText(other.x, other.y - 26, `-${Math.round(bullet.damage)}`, "#aaaaaa");

            // grow for next bullet
            ball.damage += 1;
            ball.bulletSize += 2.1;

            ball.bullets.splice(i, 1);
            break;
          }
        }

        // remove out of bounds
        if (
          bullet.active &&
          (bullet.x < 0 || bullet.x > arena.w || bullet.y < 0 || bullet.y > arena.h)
        ) {
          ball.bullets.splice(i, 1);
        }
      }
    },

    onDraw(ctx, ball) {
      // draw pistol barrel
      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.rotate(ball.angle);

      // barrel (goes forward along angle)
      ctx.beginPath();
      ctx.rect(ball.radius, -4, 28, 8);
      ctx.fillStyle = "#555555";
      ctx.fill();

      // barrel tip
      ctx.beginPath();
      ctx.rect(ball.radius + 24, -3, 8, 6);
      ctx.fillStyle = "#777777";
      ctx.fill();

      // handle (perpendicular — drops downward from barrel base)
      ctx.beginPath();
      ctx.rect(ball.radius + 2, 4, 10, 18);
      ctx.fillStyle = "#333333";
      ctx.fill();

      ctx.restore();

      // draw bullets
      for (const bullet of ball.bullets) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fillStyle = "#cccccc";
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
      }

      setHPExtra(ball, `🔫 dmg: ${Math.round(ball.damage)} size: ${ball.bulletSize.toFixed(1)}`);
    }
  },

  "H Katana": {
    color: "#00DCAA",
    radius: 22,
    maxHP: 99,
    label: "H Katana",
    description: "A ball that charges damage over time with a katana. Each hit resets the charge but increases max damage.",

    onInit(ball) {
      ball.damage = 1;
      ball.maxDamage = 1;
      ball.angle = 0;
      ball.katanaCooldowns = new Map();
    },

    onUpdate(ball, dt, arena, balls) {
      if (!ball.stunned) ball.angle += 3.2 * dt;

      // Charge damage over time, capped at maxDamage
      ball.damage = Math.min(ball.maxDamage, ball.damage + dt);

      const BLADE_LEN = 52;
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + BLADE_LEN);
      const y2 = ball.y + sin * (ball.radius + BLADE_LEN);

      for (const other of balls) {
        if (ballCheck(ball, other)) continue;
        let cd = ball.katanaCooldowns.get(other) ?? 0;
        if (cd > 0) {
          ball.katanaCooldowns.set(other, cd - dt);
          continue;
        }

        if (segCircle(x1, y1, x2, y2, other.x, other.y, other.radius + 3)) {
          const finalDmg = Math.floor(ball.damage);
          other.hp = Math.max(0, other.hp - finalDmg);
          stunBall(other, finalDmg / 20);
          spawnText(other.x, other.y - 26, `-${Math.round(finalDmg)}`, "#00DCAA");

          ball.maxDamage += 1.5;
          ball.damage = 1; // reset charge
          ball.katanaCooldowns.set(other, 0.28);
        }
      }
    },

    onDraw(ctx, ball) {
      const BLADE_LEN = 52;
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + BLADE_LEN);
      const y2 = ball.y + sin * (ball.radius + BLADE_LEN);

      ctx.save();

      // Handle
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(
        ball.x + Math.cos(ball.angle) * (ball.radius + 14),
        ball.y + Math.sin(ball.angle) * (ball.radius + 14)
      );
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#4a3728";
      ctx.lineCap = "round";
      ctx.stroke();

      // Guard (crossguard)
      const guardX = ball.x + Math.cos(ball.angle) * (ball.radius + 14);
      const guardY = ball.y + Math.sin(ball.angle) * (ball.radius + 14);
      ctx.beginPath();
      ctx.moveTo(guardX - Math.sin(ball.angle) * 8, guardY + Math.cos(ball.angle) * 4);
      ctx.lineTo(guardX + Math.sin(ball.angle) * 8, guardY - Math.cos(ball.angle) * 4);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#aaaaaa";
      ctx.stroke();

      // Blade (glows brighter the more charged)
      const chargeRatio = ball.damage / Math.max(1, ball.maxDamage);
      ctx.beginPath();
      ctx.moveTo(ball.x + cos * (ball.radius + 14), ball.y + sin * (ball.radius + 14));
      ctx.lineTo(x2, y2);
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#00DCAA";
      ctx.shadowBlur = 6 + chargeRatio * 18;
      ctx.strokeStyle = `rgba(180, 255, 235, ${0.5 + chargeRatio * 0.5})`;
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.restore();

      setHPExtra(ball, `⚔️ dmg: ${ball.damage.toFixed(1)}/${ball.maxDamage.toFixed(1)}`);
    },
  },
};
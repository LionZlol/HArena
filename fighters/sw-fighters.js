const SW_FIGHTERS = {
  // ─────────────────────────────────────────────
  "SH Sword": {
    color: "#ff3b3b",
    radius: 28,
    maxHP: 199,
    label: "SH Sword",
    description: W_FIGHTERS["H Sword"].description + " (Super version of H Sword.)",

    onInit(ball) {
      ball.angle = 0; // current rotation (radians)
      ball.damage = 1; // grows by 2 each time the sword connects
      ball.swordCooldowns = new Map(); // per-target cooldown
    },

    onUpdate(ball, dt, arena, balls) {
      // Rotate sword
      if (!ball.stunned) ball.angle += 5 * dt;

      // Build sword segment: from edge of ball to sword tip
      const SWORD_LEN = 104;
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
          spawnText(other.x, other.y - 26, `-${Math.round(ball.damage)}`, "#ffdd00");
          stunBall(other);
          ball.damage += 2;
          ball.swordCooldowns.set(other, 0.32); // 320 ms between hits
        }
      }
    },

    onDraw(ctx, ball) {
      const SWORD_LEN = 104;
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
      ctx.lineWidth = 4.5;
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

      setHPExtra(ball, `🗡️🗡️🗡️ dmg: ${ball.damage}`);
    },
  },

  "SH Spear": {
    color: "#4af0ff",
    radius: 28,
    maxHP: 199,
    label: "SH Spear",
    description: W_FIGHTERS["H Spear"].description + " (Super version of H Spear.)",

    onInit(ball) {
      ball.angle = 0;
      ball.spearLength = 34;
      ball.damage = 2;
      ball.spearCooldowns = new Map(); // per-target cooldown
    },

    onUpdate(ball, dt, arena, balls) {
      if (!ball.stunned) ball.angle += 3.8 * dt;

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
          ball.damage += 2;
          ball.spearLength += 16;
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

      setHPExtra(ball, `🔱🔱🔱 dmg: ${Math.round(ball.damage)}  len: ${Math.round(ball.spearLength)}`);
    },
  },

  "SH Dagger": {
    color: "#7fff7f",
    radius: 28,
    maxHP: 199,
    label: "SH Dagger",
    description: W_FIGHTERS["H Dagger"].description + " (Super version of H Dagger.)",

    onInit(ball) {
      ball.angle = 0;
      ball.daggerSpeed = 5.4; // spin rate in rad/s, grows on hit
      ball.damage = 1;
    },

    onUpdate(ball, dt, arena, balls) {
      if (!ball.stunned) ball.angle += ball.daggerSpeed * dt;

      const DAGGER_LEN = 64;
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + DAGGER_LEN);
      const y2 = ball.y + sin * (ball.radius + DAGGER_LEN);

      for (const other of balls) {
        if (ballCheck(ball, other)) continue;

        if (segCircle(x1, y1, x2, y2, other.x, other.y, other.radius + 2)) {
          other.hp = Math.max(0, other.hp - ball.damage);
          stunBall(other);
          spawnText(other.x, other.y - 26, `-${Math.round(ball.damage)}`, "#7fff7f");
          ball.daggerSpeed += 1.4; // spin faster each hit
          ball.damage += 0.2;
        }
      }
    },

    onDraw(ctx, ball) {
      const DAGGER_LEN = 64;
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
      const x1 = ball.x + cos * ball.radius;
      const y1 = ball.y + sin * ball.radius;
      const x2 = ball.x + cos * (ball.radius + DAGGER_LEN);
      const y2 = ball.y + sin * (ball.radius + DAGGER_LEN);
      // small crossguard
      const gx = ball.x + cos * (ball.radius + 14);
      const gy = ball.y + sin * (ball.radius + 14);
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

      setHPExtra(ball, `🔪🔪🔪 spd: ${ball.daggerSpeed.toFixed(1)} dmg: ${Math.round(ball.damage)}`);
    },
  },

  "SH Bat": {
    color: "#e6e696", // Desaturated Yellow
    radius: 28,
    maxHP: 199,
    label: "SH Bat",
    description: W_FIGHTERS["H Bat"].description + " (Super version of H Bat.)",

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
      const BAT_LEN = 64;
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
          ball.swingDamage += 1.25; // Increase power
          ball.swingDegrees += 90; // Add degrees to the swing per hit!

          ball.hitCooldowns.set(other, 0.16);
        }
      }
    },

    onDraw(ctx, ball) {
      const BAT_LEN = 64;
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

      setHPExtra(ball, `🏏🏏🏏 dmg: ${Math.round(ball.swingDamage)} arc: ${Math.round(ball.swingDegrees)}°`);
    },
  },
};
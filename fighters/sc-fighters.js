const SC_FIGHTERS = {
  // ─────────────────────────────────────────────
  "SH Masochist": {
    color: "#dddddd",
    radius: 28,
    maxHP: 199,
    label: "SH Masochist",
    description: C_FIGHTERS["H Masochist"].description + " (Super version of H Masochist.)",

    onInit(ball) {
      ball.damage = 1;
      ball.bodyCooldowns = new Map();
    },

    onUpdate(ball, dt, arena, balls) {
      // Only handle cooldown decrement
      for (const [other, cd] of ball.bodyCooldowns) {
        if (cd > 0) {
          ball.bodyCooldowns.set(other, cd - dt);
        }
      }
    },

    onBallCollide(ball, other) {
      if (ballCheck(ball, other)) return;
      const cd = ball.bodyCooldowns.get(other) ?? 0;
      if (cd <= 0) {
        other.hp = Math.max(0, other.hp - ball.damage);
        spawnText(other.x, other.y - 26, `-${Math.round(ball.damage)}`, "#dddddd");
        ball.bodyCooldowns.set(other, 0.14);
      }
    },

    onWallBounce(ball, wall) {
      spawnText(ball.x, ball.y - 20, `dmg +.25`, "#af8585");
      ball.damage += 0.25;
    },

    onDraw(ctx, ball) {
      ctx.save();
      ctx.font = "bold 10px 'Lexend', sans-serif";
      ctx.fillStyle = "#ff8888";
      ctx.textAlign = "center";
      ctx.shadowColor = "#ff3333";
      ctx.shadowBlur = 5;
      setHPExtra(ball, `🤕🤕🤕 atk: ${Math.round(ball.damage)}`);
      ctx.restore();
    },
  },

  "SH Tank": {
    color: "#444",
    radius: 64,
    maxHP: 499,
    label: "SH Tank",
    description: C_FIGHTERS["H Tank"].description + " (Super version of H Tank.)",

    onInit(ball) {
      ball.damage = 1;
      ball.bodyCooldowns = new Map();
    },

    onUpdate(ball, dt, arena, balls) {
      // Only handle cooldown decrement
      for (const [other, cd] of ball.bodyCooldowns) {
        if (cd > 0) {
          ball.bodyCooldowns.set(other, cd - dt);
        }
      }
    },

    onBallCollide(ball, other) {
      if (ballCheck(ball, other)) return;
      const cd = ball.bodyCooldowns.get(other) ?? 0;
      if (cd <= 0) {
        other.hp = Math.max(0, other.hp - ball.damage);
        spawnText(other.x, other.y - 26, `-${Math.round(ball.damage)}`, "#444");
        ball.damage += 0.2;
        ball.bodyCooldowns.set(other, 0.14);
      }
    },

    onDraw(ctx, ball) {
      ctx.save();
      ctx.font = "bold 10px 'Lexend', sans-serif";
      ctx.fillStyle = "#bd9494";
      ctx.textAlign = "center";
      ctx.shadowColor = "#534343";
      ctx.shadowBlur = 5;
      setHPExtra(ball, `💪💪💪 dmg: ${Math.round(ball.damage)}`);
      ctx.restore();
    },
  },
};
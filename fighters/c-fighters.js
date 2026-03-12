const C_FIGHTERS = {
  // ─────────────────────────────────────────────
  "H Masochist": {
    color: "#dddddd",
    radius: 22,
    maxHP: 99,
    label: "H Masochist",
    description: "A ball that loses HP on wall bounces but gains damage upon doing so.",

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
      ball.hp = Math.max(0, ball.hp - 1);
      spawnText(ball.x, ball.y - 20, `-1 (wall)`, "#ff4444");
      ball.damage += 0.2;
    },

    onDraw(ctx, ball) {
      ctx.save();
      ctx.font = "bold 10px 'Lexend', sans-serif";
      ctx.fillStyle = "#ff8888";
      ctx.textAlign = "center";
      ctx.shadowColor = "#ff3333";
      ctx.shadowBlur = 5;
      setHPExtra(ball, `🤕 atk: ${Math.round(ball.damage)}`);
      ctx.restore();
    },
  },

  "H Tank": {
    color: "#444",
    radius: 40,
    maxHP: 199,
    label: "H Tank",
    description: "A ball that has lots of HP. Has slow scaling.",

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
        ball.damage += 0.1;
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
      setHPExtra(ball, `💪🏽 dmg: ${Math.round(ball.damage)}`);
      ctx.restore();
    },
  },

  "H Rogue": {
    color: "#b451a4",
    radius: 14,
    maxHP: 49,
    label: "H Rogue",
    description: "A ball with low HP. Has fast scaling.",

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
        spawnText(other.x, other.y - 26, `-${Math.round(ball.damage)}`, "#a156b8");
        ball.damage += 0.3;
        ball.bodyCooldowns.set(other, 0.14);
      }
    },

    onDraw(ctx, ball) {
      ctx.save();
      ctx.font = "bold 10px 'Lexend', sans-serif";
      ctx.fillStyle = "#b451a4";
      ctx.textAlign = "center";
      ctx.shadowColor = "#721c55";
      ctx.shadowBlur = 5;
      setHPExtra(ball, `😈 dmg: ${Math.round(ball.damage)}`);
      ctx.restore();
    },
  },

  "H Assassin": {
    color: "#00ff88",
    radius: 22,
    maxHP: 99,
    label: "H Assassin",
    description: "A ball that can insta-kill enemies. The chance to do so increases with wall bounces and hits",

    onInit(ball) {
      ball.instaKillChance = 0; // Starting chance (percentage, e.g. 0.5 means 0.5%)
      ball.hitCooldowns = new Map(); // per-target cooldown
    },

    onWallBounce(ball, wall) {
      ball.instaKillChance = Math.min(100, ball.instaKillChance + 0.025);
      spawnText(ball.x, ball.y - 20, `chance +0.025%`, "#00ffbb");
    },

    onUpdate(ball, dt, arena, balls) {
      // Only handle cooldown decrement
      for (const [other, cd] of ball.hitCooldowns) {
        if (cd > 0) {
          ball.hitCooldowns.set(other, cd - dt);
        }
      }
    },

    onBallCollide(ball, other) {
      if (ballCheck(ball, other)) return;
      const cd = ball.hitCooldowns.get(other) ?? 0;
      if (cd <= 0) {
        const chance = ball.instaKillChance / 100;
        if (Math.random() < chance) {
          other.hp = 0; // insta-kill
          spawnText(other.x, other.y - 26, "insta-kill!", "#00ffbb");
        } else {
          spawnText(other.x, other.y - 26, "miss", "#555555");
          ball.instaKillChance = Math.min(100, ball.instaKillChance + 0.1);
          spawnText(ball.x, ball.y - 20, `chance +0.1%`, "#00ffbb");
        }
        ball.hitCooldowns.set(other, 0.24);
      }
    },

    onDraw(ctx, ball) {
      // Draw simple green glow and label of current chance%
      ctx.save();
      ctx.font = "bold 10px 'Lexend', sans-serif";
      ctx.fillStyle = "#00ffbb";
      ctx.textAlign = "center";
      ctx.shadowColor = "#00ffbb";
      ctx.shadowBlur = 6;
      setHPExtra(ball, `🥷🏽 chance: ${ball.instaKillChance.toFixed(1)}%`);
      ctx.restore();
    },
  },

  "H Scout": {
    color: "#ffddee",
    radius: 20,
    maxHP: 39,
    label: "H Scout",
    description: "A ball with incredibly low HP. Its damage starts very low but scales exponentially.",

    onInit(ball) {
      ball.damage = 0.1;
      ball.hitCooldowns = new Map(); // per-target cooldown
    },

    onUpdate(ball, dt, arena, balls) {
      // Only handle cooldown decrement
      for (const [other, cd] of ball.hitCooldowns) {
        if (cd > 0) {
          ball.hitCooldowns.set(other, cd - dt);
        }
      }
    },

    onBallCollide(ball, other) {
      if (ballCheck(ball, other)) return;
      const cd = ball.hitCooldowns.get(other) ?? 0;
      if (cd <= 0) {
        spawnText(ball.x, ball.y - 20, `-${ball.damage.toFixed(1)}`, "#865f77");
        other.hp -= ball.damage;
        ball.damage *= 1.5;
        ball.hitCooldowns.set(other, 0.24);
      }
    },

    onDraw(ctx, ball) {
      // Draw simple green glow and label of current chance%
      ctx.save();
      ctx.font = "bold 10px 'Lexend', sans-serif";
      ctx.fillStyle = "#ab65d4";
      ctx.textAlign = "center";
      ctx.shadowColor = "#793b76";
      ctx.shadowBlur = 6;
      setHPExtra(ball, `👁️ dmg: ${ball.damage.toFixed(1)}`);
      ctx.restore();
    },
  },

  "H Gambler": {
    color: "#eeaa11",
    radius: 22,
    maxHP: 99,
    label: "H Gambler",
    description: "A ball that does random damage. The max damage it can do increases with every hit.",
    onInit(ball) {
      ball.damageRange = 1;
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
      if (other.dead || (!isFreeForAll && other.team === ball.team)) return;
      const cd = ball.bodyCooldowns.get(other) ?? 0;
      if (cd <= 0) {
        let finalAttack = Math.floor(Math.random() * ball.damageRange) + ball.damage;
        other.hp = Math.max(0, other.hp - finalAttack);
        spawnText(other.x, other.y - 26, `-${finalAttack}`, "#eeaa11");
        ball.damageRange += 0.4;
        ball.bodyCooldowns.set(other, 0.14);
      }
    },

    onDraw(ctx, ball) {
      setHPExtra(ball, `🎲 range: ${Math.round(ball.damage)}-${Math.round(ball.damage + ball.damageRange)}`);
    },
  },
};
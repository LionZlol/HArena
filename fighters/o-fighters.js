const O_FIGHTERS = {
  // ─────────────────────────────────────────────
  "H Lazer": {
    color: "#3388ff",
    radius: 22,
    maxHP: 99,
    label: "H Lazer",
    description: "Lasers multiply every 10 hits. Slow, but they fill the whole arena.",

    onInit(ball) {
      ball.angle = 0;
      ball.lazerCount = 1;
      ball.lazerHits = 0;
      ball.lazerCooldowns = [new Map()]; // one cooldown Map per laser beam
      ball.damage = 1;
    },

    onUpdate(ball, dt, arena, balls) {
      if (!ball.stunned) ball.angle += 0.3 * dt; // slow rotation

      for (let i = 0; i < ball.lazerCount; i++) {
        const angle = ball.angle + (i * (Math.PI * 2 / ball.lazerCount));
        const end = rayToArenaEdge(ball.x, ball.y, angle);

        // Make sure this laser has a cooldown map
        if (!ball.lazerCooldowns[i]) ball.lazerCooldowns[i] = new Map();

        for (const other of balls) {
          if (ballCheck(ball, other)) continue;

          const cd = ball.lazerCooldowns[i].get(other) ?? 0;
          if (cd > 0) {
            ball.lazerCooldowns[i].set(other, cd - dt);
            continue;
          }

          if (segCircle(ball.x, ball.y, end.x, end.y, other.x, other.y, other.radius)) {
            other.hp = Math.max(0, other.hp - 1);
            spawnText(other.x, other.y - 26, `-1`, "#ff4444");
            ball.lazerCooldowns[i].set(other, 0.28);
            ball.lazerHits++;

            // Every 10 hits total, add a new laser
            if (ball.lazerHits % 10 === 0) {
              ball.lazerCount++;
              ball.lazerCooldowns.push(new Map());
            }
          }
        }
      }
    },

    onDraw(ctx, ball) {
      for (let i = 0; i < ball.lazerCount; i++) {
        const angle = ball.angle + (i * (Math.PI * 2 / ball.lazerCount));
        const end = rayToArenaEdge(ball.x, ball.y, angle);

        ctx.save();
        // Outer glow
        ctx.shadowColor = "#ff2222";
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = "rgba(255, 60, 60, 0.4)";
        ctx.lineWidth = 7;
        ctx.lineCap = "round";
        ctx.stroke();
        // Inner bright core
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = "#ff8888";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      setHPExtra(ball, `☀️ beams: ${ball.lazerCount}  hits: ${ball.lazerHits}`);
    },
  },

  "H Bucket": {
    color: "#664ed0",
    radius: 22,
    maxHP: 99,
    label: "H Bucket",
    description: "Rotates a bucket and leaves blue puddles that grow with every hit.",
  
    onInit(ball) {
      ball.angle = 0;
      ball.puddleTimer = 0;
      ball.puddleSize = 12;
      ball.puddleMaxHits = 1;
      ball.puddles = []; // active puddles in arena
    },
  
    onUpdate(ball, dt, arena, balls) {
      if (!ball.stunned) ball.angle += 3 * dt;
  
      // Spawn puddle every 2 seconds
      ball.puddleTimer += dt;
      if (ball.puddleTimer >= 2) {
        ball.puddleTimer = 0;
        ball.puddles.push({
          x: ball.x + Math.cos(ball.angle) * (ball.radius + ball.puddleSize),
          y: ball.y + Math.sin(ball.angle) * (ball.radius + ball.puddleSize),
          radius: ball.puddleSize,
          hitsLeft: ball.puddleMaxHits,
          color: "#4af0ff",
          hitCooldowns: new Map()
        });
      }
  
      // Update puddles, check collisions
      for (let i = ball.puddles.length - 1; i >= 0; i--) {
        const puddle = ball.puddles[i];
  
        // Decrease all cooldowns for this puddle
        for (const [other, cd] of puddle.hitCooldowns) {
          if (cd > 0) {
            puddle.hitCooldowns.set(other, cd - dt);
          }
        }
  
        for (const other of balls) {
          if (other.dead) continue;
          if (!ballCheck(ball, other)) {
            const cd = puddle.hitCooldowns.get(other) ?? 0;
            if (cd > 0) continue;
  
            const dx = puddle.x - other.x;
            const dy = puddle.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < puddle.radius + other.radius) {
              other.hp = Math.max(0, other.hp - 0.5);
              spawnText(other.x, other.y - 26, `-0.5`, puddle.color);
  
              puddle.hitsLeft--;
              puddle.hitCooldowns.set(other, 0.64); // 640 ms cooldown per target per puddle
  
              if (puddle.hitsLeft <= 0) {
                ball.puddles.splice(i, 1);
                // Increase future puddle size and hits on damage
                ball.puddleSize += 1;
                ball.puddleMaxHits += 0.25;
              }
              break; // only hit one opponent per update cycle per puddle
            }
          }
        }
      }
    },
  
    onDraw(ctx, ball) {
      const cos = Math.cos(ball.angle);
      const sin = Math.sin(ball.angle);
    
      const bucketWidth = 34;
      const bucketHeight = 44;
    
      // Center of bucket at ball position + radius offset in facing direction
      const cx = ball.x + cos * (ball.radius + bucketHeight / 2);
      const cy = ball.y + sin * (ball.radius + bucketHeight / 2);
    
      // Perpendicular vector for width
      const perpX = -sin;
      const perpY = cos;
    
      // Rectangle corners of bucket body
      const ulX = cx + perpX * (bucketWidth / 2) - cos * (bucketHeight / 2);
      const ulY = cy + perpY * (bucketWidth / 2) - sin * (bucketHeight / 2);
    
      const urX = cx - perpX * (bucketWidth / 2) - cos * (bucketHeight / 2);
      const urY = cy - perpY * (bucketWidth / 2) - sin * (bucketHeight / 2);
    
      const blX = cx + perpX * (bucketWidth / 2) + cos * (bucketHeight / 2);
      const blY = cy + perpY * (bucketWidth / 2) + sin * (bucketHeight / 2);
    
      const brX = cx - perpX * (bucketWidth / 2) + cos * (bucketHeight / 2);
      const brY = cy - perpY * (bucketWidth / 2) + sin * (bucketHeight / 2);
    
      ctx.save();
    
      ctx.fillStyle = "#664ed0";
      ctx.shadowColor = "#8b87f9";
      ctx.shadowBlur = 18;
    
      // Draw bucket body rectangle
      ctx.beginPath();
      ctx.moveTo(ulX, ulY);
      ctx.lineTo(urX, urY);
      ctx.lineTo(brX, brY);
      ctx.lineTo(blX, blY);
      ctx.closePath();
      ctx.fill();
    
      // Draw semicircle handle on top side (between ul and ur)
      const handleCenterX = (ulX + urX) / 2;
      const handleCenterY = (ulY + urY) / 2;
      const handleRadius = bucketWidth / 2;
    
      ctx.beginPath();
      // Semicircle arc facing forward along ball angle
      ctx.arc(handleCenterX, handleCenterY, handleRadius, ball.angle - Math.PI / 2, ball.angle + Math.PI / 2, false);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#a299f2";
      ctx.shadowColor = "#a299f2";
      ctx.shadowBlur = 10;
      ctx.stroke();
    
      ctx.restore();
    
      setHPExtra(ball, `🪣 puddle size: ${ball.puddleSize} hits: ${Math.round(ball.puddleMaxHits)}`);
    }
  },

 "H Frisbee": {
    color:       "#add8e6",
    radius:      22,
    maxHP:       99,
    label:       "H Frisbee",
    description: "Throws a bouncing frisbee. Speed and damage scale up on each hit, but it can come back to you if you collide with it.",

    onInit(ball) {
      ball.frisbeeActive = false;
      ball.fX = 0; ball.fY = 0;
      ball.fVX = 0; ball.fVY = 0;
      ball.fRadius = 16;
      ball.damage = 1;      // Starts weak
      ball.fBaseSpeed = 550; // Current power level
      ball.throwTimer = 0;
      ball.hitCooldowns = new Map();
    },

    onUpdate(ball, dt, arena, balls) {
      if (!ball.frisbeeActive) {
        // --- 1. Throw Logic (Only runs when holding the frisbee) ---
        ball.throwTimer += dt;
        if (ball.throwTimer >= 1.0) {
          ball.frisbeeActive = true;
          ball.throwTimer = 0;
          ball.fX = ball.x;
          ball.fY = ball.y;
          
          const angle = Math.random() * Math.PI * 2;
          // Use the permanently scaling fBaseSpeed
          ball.fVX = Math.cos(angle) * ball.fBaseSpeed;
          ball.fVY = Math.sin(angle) * ball.fBaseSpeed;
        }
      } else {
        // --- 2. Frisbee Physics (Only runs when frisbee is in flight) ---
        ball.fX += ball.fVX * dt;
        ball.fY += ball.fVY * dt;

        // Wall Bouncing
        if (ball.fX - ball.fRadius < arena.x) { ball.fX = arena.x + ball.fRadius; ball.fVX *= -1; }
        if (ball.fX + ball.fRadius > arena.x + arena.w) { ball.fX = arena.x + arena.w - ball.fRadius; ball.fVX *= -1; }
        if (ball.fY - ball.fRadius < arena.y) { ball.fY = arena.y + ball.fRadius; ball.fVY *= -1; }
        if (ball.fY + ball.fRadius > arena.y + arena.h) { ball.fY = arena.y + arena.h - ball.fRadius; ball.fVY *= -1; }

        // --- 3. Collision with Opponents ---
        for (const other of balls) {
          if (other === ball || other.dead) continue;
          
          const dx = other.x - ball.fX;
          const dy = other.y - ball.fY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let cd = ball.hitCooldowns.get(other) ?? 0;
          if (cd > 0) {
            ball.hitCooldowns.set(other, cd - dt);
          } else if (dist < ball.fRadius + other.radius) {
            other.hp = Math.max(0, other.hp - ball.damage);
            stunBall(other);
            spawnText(other.x, other.y - 25, `-${Math.round(ball.damage)}`, "#add8e6");

            ball.damage += 0.25;
            ball.fBaseSpeed += 60; 
            
            // Instantly apply the speed boost to the flying frisbee too
            const currentSpeed = Math.sqrt(ball.fVX**2 + ball.fVY**2);
            const newSpeed = currentSpeed * 1.1; 
            const ratio = newSpeed / currentSpeed;
            ball.fVX *= ratio;
            ball.fVY *= ratio;
            
            ball.hitCooldowns.set(other, 0.2);
          }
        }

        // --- 4. Return Logic ---
        const rDX = ball.x - ball.fX;
        const rDY = ball.y - ball.fY;
        const rDist = Math.sqrt(rDX * rDX + rDY * rDY);
        
        // Use a 0.2s grace period so you don't instantly catch it when throwing
        ball.throwTimer += dt; 
        if (ball.throwTimer > 0.2 && rDist < ball.radius + ball.fRadius) {
          ball.frisbeeActive = false;
          ball.throwTimer = 0; 
        }
      }
    },

    onDraw(ctx, ball) {
      if (ball.frisbeeActive) {
        ctx.save();
        ctx.shadowColor = "#add8e6";
        ctx.shadowBlur = 15;
        
        // Outer Rim
        ctx.beginPath();
        ctx.arc(ball.fX, ball.fY, ball.fRadius, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Inner Disc
        ctx.beginPath();
        ctx.arc(ball.fX, ball.fY, ball.fRadius - 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(173, 216, 230, 0.8)";
        ctx.fill();
        ctx.restore();
      }
      setHPExtra(ball, `🥏 speed: ${ball.fBaseSpeed.toFixed(1)} dmg: ${ball.damage.toFixed(1)}`);
    }
  },

  "Filler Fighter": {
    color: "#888",
    radius: 22,
    maxHP: 99,
    label: "Filler Fighter",
    description: "A fighter with no abilities. All it does is get hit. Good for testing or just pure curiosity."
  }
};
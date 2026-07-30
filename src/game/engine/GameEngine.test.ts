import { describe, expect, it, vi } from "vitest";
import { GameEngine } from "@/game/engine/GameEngine";

describe("GameEngine acceleration", () => {
  it("announces level two after 15 seconds of active play", () => {
    const onAcceleration = vi.fn();
    const engine = new GameEngine({
      random: () => 0,
      onAcceleration,
    });

    engine.start();
    for (let frame = 0; frame < 301; frame += 1) {
      engine.update(0.05);
    }

    expect(onAcceleration).toHaveBeenCalledOnce();
    expect(onAcceleration).toHaveBeenCalledWith(2);
    expect(engine.getSnapshot().speedLevel).toBe(2);
  });

  it("clears transient visuals and stops the animation loop on Game Over", () => {
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame);
    const engine = new GameEngine({ random: () => 0 });
    const internals = engine as unknown as {
      status: string;
      animationFrame: number;
      lane: number;
      displayLane: number;
      flash: number;
      shake: number;
      brokenTimer: number;
      particles: unknown[];
      finishRun: () => void;
    };

    internals.status = "playing";
    internals.animationFrame = 17;
    internals.lane = 2;
    internals.displayLane = 1.35;
    internals.flash = 1;
    internals.shake = 1;
    internals.brokenTimer = 0.85;
    internals.particles = [{}];

    internals.finishRun();

    expect(engine.getSnapshot().status).toBe("gameover");
    expect(internals.animationFrame).toBe(0);
    expect(internals.displayLane).toBe(internals.lane);
    expect(internals.flash).toBe(0);
    expect(internals.shake).toBe(0);
    expect(internals.brokenTimer).toBe(0);
    expect(internals.particles).toHaveLength(0);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(17);
  });
});

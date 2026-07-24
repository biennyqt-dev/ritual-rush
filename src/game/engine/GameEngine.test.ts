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
});

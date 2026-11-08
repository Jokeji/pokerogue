import { SpeciesId } from "#enums/species-id";
import { GameManager } from "#test/framework/game-manager";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * Determinism is the foundation of co-op: two clients with the same seed and the same inputs
 * must draw the same battle rolls, or lockstep sync cannot work.
 *
 * The test harness normally forces the highest possible roll on every battle RNG call
 * (see `GameManager`), so these tests opt back into the real, seeded rolls first.
 *
 * The harness is built for one `GameManager` per test, so the three tests below run in order and
 * share the first run as a baseline. Vitest runs tests in a file in declaration order.
 */
describe("Co-op battle RNG determinism", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;
  let baseline: number[];

  beforeAll(() => {
    phaserGame = new Phaser.Game({
      type: Phaser.HEADLESS,
    });
  });

  beforeEach(() => {
    game = new GameManager(phaserGame);
  });

  /**
   * Starts a fresh battle for the given run seed and samples the battle RNG directly.
   *
   * `newBattle` seeds the global RNG from the run seed before constructing the battle, so the
   * battle seed — and therefore every subsequent roll — should be a pure function of the run seed.
   */
  async function sampleRolls(seed: string): Promise<number[]> {
    game.override.seed(seed);
    game.useRealBattleRng();

    await game.classicMode.startBattle(SpeciesId.BULBASAUR);

    return Array.from({ length: 8 }, () => game.scene.randBattleSeedInt(1_000_000_000));
  }

  it("records a baseline seeded run", async () => {
    baseline = await sampleRolls("determinism-check");
    expect(baseline.length).toBe(8);
  }, 120000);

  it("same seed draws the same rolls", async () => {
    expect(await sampleRolls("determinism-check")).toEqual(baseline);
  }, 120000);

  it("different seed draws different rolls (the real RNG is in play)", async () => {
    // Guard against the test being vacuous: if the harness were still forcing max rolls,
    // two runs would be identical regardless of seed.
    expect(await sampleRolls("different-seed")).not.toEqual(baseline);
  }, 120000);
});

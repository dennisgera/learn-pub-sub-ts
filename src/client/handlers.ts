import { type ArmyMove } from "../internal/gamelogic/gamedata.js";
import {
  GameState,
  type PlayingState,
} from "../internal/gamelogic/gamestate.js";
import { handleMove, MoveOutcome } from "../internal/gamelogic/move.js";
import { handlePause } from "../internal/gamelogic/pause.js";
import { AckType } from "../internal/pubsub/consume.js";

export function handlerPause(gs: GameState): (ps: PlayingState) => AckType {
  return (ps: PlayingState): AckType => {
    // Use the provided PlayingState message to update the local GameState
    handlePause(gs, ps);
    // print the prompt marker so the user can enter a new command
    process.stdout.write("> ");
    // Pause handler should always Ack
    return AckType.Ack;
  };
}

export function handlerMove(gs: GameState): (move: ArmyMove) => AckType {
  return (move: ArmyMove): AckType => {
    const outcome = handleMove(gs, move);
    console.log(`Moved ${move.units.length} units to ${move.toLocation}`);
    // print the prompt marker so the user can enter a new command
    process.stdout.write("> ");

    // Ack only for Safe or MakeWar outcomes
    if (outcome === MoveOutcome.Safe || outcome === MoveOutcome.MakeWar) {
      return AckType.Ack;
    }

    // NackDiscard for SamePlayer or any other outcome
    return AckType.NackDiscard;
  };
}

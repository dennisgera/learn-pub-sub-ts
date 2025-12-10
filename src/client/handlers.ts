import { type ArmyMove } from "../internal/gamelogic/gamedata.js";
import {
  GameState,
  type PlayingState,
} from "../internal/gamelogic/gamestate.js";
import { handleMove } from "../internal/gamelogic/move.js";
import { handlePause } from "../internal/gamelogic/pause.js";

export function handlerPause(gs: GameState): (ps: PlayingState) => void {
  return (ps) => {
    // Use the provided PlayingState message to update the local GameState
    handlePause(gs, ps);
    // print the prompt marker so the user can enter a new command
    process.stdout.write("> ");
  };
}

export function handlerMove(gs: GameState): (move: ArmyMove) => void {
  return (move: ArmyMove): void => {
    handleMove(gs, move);
    console.log(`Moved ${move.units.length} units to ${move.toLocation}`);
    // print the prompt marker so the user can enter a new command
    process.stdout.write("> ");
  };
}

import { handleMove, MoveOutcome } from "../internal/gamelogic/move.js";
import { handlePause } from "../internal/gamelogic/pause.js";
export function handlerPause(gs) {
    return (ps) => {
        // Use the provided PlayingState message to update the local GameState
        handlePause(gs, ps);
        // print the prompt marker so the user can enter a new command
        process.stdout.write("> ");
        // Pause handler should always Ack
        return "Ack";
    };
}
export function handlerMove(gs) {
    return (move) => {
        const outcome = handleMove(gs, move);
        console.log(`Moved ${move.units.length} units to ${move.toLocation}`);
        // print the prompt marker so the user can enter a new command
        process.stdout.write("> ");
        // Ack only for Safe or MakeWar outcomes
        if (outcome === MoveOutcome.Safe || outcome === MoveOutcome.MakeWar) {
            return "Ack";
        }
        // NackDiscard for SamePlayer or any other outcome
        return "NackDiscard";
    };
}

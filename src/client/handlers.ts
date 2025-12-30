import amqp from "amqplib";
import {
  type ArmyMove,
  type RecognitionOfWar,
} from "../internal/gamelogic/gamedata.js";
import {
  GameState,
  type PlayingState,
} from "../internal/gamelogic/gamestate.js";
import { handleMove, MoveOutcome } from "../internal/gamelogic/move.js";
import { handlePause } from "../internal/gamelogic/pause.js";
import { handleWar, WarOutcome } from "../internal/gamelogic/war.js";
import { AckType } from "../internal/pubsub/consume.js";
import { publishJSON } from "../internal/pubsub/publish.js";
import {
  ExchangePerilTopic,
  WarRecognitionsPrefix,
} from "../internal/routing/routing.js";

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

export function handlerMove(
  gs: GameState,
  publishCh: amqp.ConfirmChannel
): (move: ArmyMove) => AckType {
  return (move: ArmyMove): AckType => {
    const outcome = handleMove(gs, move);
    console.log(`Moved ${move.units.length} units to ${move.toLocation}`);
    // print the prompt marker so the user can enter a new command
    process.stdout.write("> ");

    // Ack only for Safe or MakeWar outcomes
    if (outcome === MoveOutcome.Safe) {
      return AckType.Ack;
    }

    if (outcome === MoveOutcome.MakeWar) {
      publishJSON(
        publishCh,
        ExchangePerilTopic,
        `${WarRecognitionsPrefix}.${move.player.username}`,
        {
          attacker: move.player.username,
          defender: move.player.username,
          location: move.toLocation,
        }
      );
      return AckType.NackRequeue;
    }

    // NackDiscard for SamePlayer or any other outcome
    return AckType.NackDiscard;
  };
}

export function handlerWar(
  gs: GameState
): (rw: RecognitionOfWar) => Promise<AckType> {
  return async (rw: RecognitionOfWar): Promise<AckType> => {
    const outcome = handleWar(gs, rw);
    console.log("> ");

    if (outcome.result === WarOutcome.NotInvolved) {
      return AckType.NackRequeue;
    }

    if (outcome.result === WarOutcome.NoUnits) {
      return AckType.NackDiscard;
    }

    if (outcome.result === WarOutcome.OpponentWon) {
      return AckType.Ack;
    }

    if (outcome.result === WarOutcome.YouWon) {
      return AckType.Ack;
    }

    if (outcome.result === WarOutcome.Draw) {
      return AckType.Ack;
    }

    console.error("Unexpected war outcome:", outcome);
    return AckType.NackDiscard;
  };
}

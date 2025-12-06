import amqp from "amqplib";
import {
  clientWelcome,
  getInput,
  commandStatus,
  printQuit,
  printClientHelp,
} from "../internal/gamelogic/gamelogic.js";
import { declareAndBind, SimpleQueueType } from "../internal/pubsub/consume.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { commandMove } from "../internal/gamelogic/move.js";

async function main() {
  console.log("Starting Peril client...");
  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqp.connect(rabbitConnString);
  console.log("Peril game client connected to RabbitMQ");

  const username = await clientWelcome();
  console.log(`Welcome, ${username}!`);
  const [channel, queue] = await declareAndBind(
    conn,
    ExchangePerilDirect,
    `${PauseKey}.${username}`,
    PauseKey,
    SimpleQueueType.Transient,
  );

  const gs = new GameState(username);

  // interactive repl loop for server commands
  // commands: spawn, move, status, help, quit
  for (;;) {
    const words: string[] = await getInput("> ");
    if (words.length === 0) {
      continue;
    }

    const cmd: string = words[0]!.toLowerCase();
    if (cmd === "spawn") {
      try {
        commandSpawn(gs, words);
      } catch (err) {
        console.error("Error executing spawn command:", err);
      }
    } else if (cmd === "move") {
      try {
        commandMove(gs, words);
      } catch (err) {
        console.error("Error executing move command:", err);
      }
    } else if (cmd === "status") {
      try {
        commandStatus(gs);
      } catch (err) {
        console.error("Error executing status command:", err);
      }
    } else if (cmd === "quit") {
      printQuit();
      break;
    } else if (cmd === "help") {
      printClientHelp();
    } else {
      console.log(`I don't understand the command ${cmd}`);
      console.log("Type 'help' to see possible commands.");
    }
  }

  // clean up and exit
  try {
    await conn.close();
    console.log("Connection closed.");
  } catch (err) {
    console.error("Error closing connection:", err);
  } finally {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

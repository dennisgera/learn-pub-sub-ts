import amqp from "amqplib";
import { publishJSON } from "../internal/pubsub/publish.js";
import { getInput, printServerHelp } from "../internal/gamelogic/gamelogic.js";
import { declareAndBind, SimpleQueueType } from "../internal/pubsub/consume.js";
import { ExchangePerilDirect, ExchangePerilTopic, GameLogSlug, PauseKey, } from "../internal/routing/routing.js";
async function main() {
    console.log("Starting Peril server...");
    printServerHelp();
    const rabbitConnString = "amqp://guest:guest@localhost:5672/";
    const conn = await amqp.connect(rabbitConnString);
    console.log("Peril game server connected to RabbitMQ");
    const [channel, queue] = await declareAndBind(conn, ExchangePerilTopic, GameLogSlug, `${GameLogSlug}.*`, SimpleQueueType.Durable, {
        "x-dead-letter-exchange": "peril_dlx",
    });
    ["SIGINT", "SIGTERM"].forEach((signal) => {
        process.on(signal, async () => {
            try {
                await conn.close();
                console.log("Connection closed");
            }
            catch (err) {
                console.error("Error closing connection:", err);
            }
            finally {
                process.exit(0);
            }
        });
    });
    // guarantee game starts unpaused
    const confirmChannel = await conn.createConfirmChannel();
    try {
        publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, {
            isPaused: false,
        });
    }
    catch (err) {
        console.error("Error publishing message:", err);
    }
    // interactive repl loop for server commands
    // commands: pause, resume, quit, help
    for (;;) {
        const words = await getInput("> ");
        if (words.length === 0) {
            continue;
        }
        const cmd = words[0].toLowerCase();
        if (cmd === "pause") {
            console.log("Sending pausing message...");
            try {
                await publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, {
                    isPaused: true,
                });
                console.log("Pause message published.");
            }
            catch (err) {
                console.error("Error publishing message:", err);
            }
        }
        else if (cmd === "resume") {
            console.log("Sending resuming message...");
            try {
                await publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, {
                    isPaused: false,
                });
                console.log("Resume message published.");
            }
            catch (err) {
                console.error("Error publishing message:", err);
            }
        }
        else if (cmd === "quit") {
            console.log("Exiting...");
            break;
        }
        else if (cmd === "help") {
            printServerHelp();
        }
        else {
            console.log(`I don't understand the command ${cmd}`);
            console.log("Type 'help' to see possible commands.");
        }
    }
    // clean up and exit
    try {
        await conn.close();
        console.log("Connection closed.");
    }
    catch (err) {
        console.error("Error closing connection:", err);
    }
    finally {
        process.exit(0);
    }
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});

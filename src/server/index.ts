import amqp from "amqplib";
import { publishJSON } from "../internal/pubsub/publish.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";

async function main() {
  console.log("Starting Peril server...");
  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqp.connect(rabbitConnString);
  console.log("Peril game server connected to RabbitMQ");

  ["SIGINT", "SIGTERM"].forEach((signal) => {
    process.on(signal, async () => {
      try {
        await conn.close();
        console.log("Connection closed");
      } catch (err) {
        console.error("Error closing connection:", err);
      } finally {
        process.exit(0);
      }
    });
  });

  const confirmChannel: amqp.ConfirmChannel = await conn.createConfirmChannel();
  try {
    publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, {
      isPaused: false,
    });
  } catch (err) {
    console.error("Error publishing message:", err);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

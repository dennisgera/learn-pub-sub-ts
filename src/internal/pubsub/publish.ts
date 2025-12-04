import type { ConfirmChannel, ChannelModel, Replies, Channel } from "amqplib";

export function publishJSON<T>(
  ch: ConfirmChannel,
  exchange: string,
  routingKey: string,
  value: T
): Promise<void> {
  const content = Buffer.from(JSON.stringify(value));

  return new Promise((resolve, reject) => {
    ch.publish(
      exchange,
      routingKey,
      content,
      {
        contentType: "application/json",
      },
      (err) => {
        if (err) {
          reject(new Error(`Failed to publish message: ${err}`));
        } else {
          resolve();
        }
      }
    );
  });
}

type SimpleQueueType = "transient" | "durable";

export async function declareAndBind(
  conn: ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType
): Promise<[Channel, Replies.AssertQueue]> {
  const channel = await conn.createChannel();
  const queue = await channel.assertQueue(queueName, {
    durable: queueType === "durable",
    autoDelete: queueType === "transient",
    exclusive: queueType === "transient",
  });
  await channel.bindQueue(queue.queue, exchange, key);
  return [channel, queue];
}

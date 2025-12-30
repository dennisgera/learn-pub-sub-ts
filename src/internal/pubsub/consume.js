export var AckType;
(function (AckType) {
    AckType[AckType["Ack"] = 0] = "Ack";
    AckType[AckType["NackDiscard"] = 1] = "NackDiscard";
    AckType[AckType["NackRequeue"] = 2] = "NackRequeue";
})(AckType = AckType || (AckType = {}));
export var SimpleQueueType;
(function (SimpleQueueType) {
    SimpleQueueType[SimpleQueueType["Durable"] = 0] = "Durable";
    SimpleQueueType[SimpleQueueType["Transient"] = 1] = "Transient";
})(SimpleQueueType = SimpleQueueType || (SimpleQueueType = {}));
export async function declareAndBind(conn, exchange, queueName, key, queueType, args) {
    const ch = await conn.createChannel();
    const queue = await ch.assertQueue(queueName, {
        durable: queueType === SimpleQueueType.Durable,
        exclusive: queueType !== SimpleQueueType.Durable,
        autoDelete: queueType !== SimpleQueueType.Durable,
        arguments: args,
    });
    await ch.bindQueue(queue.queue, exchange, key);
    return [ch, queue];
}
/**
 * Subscribe to a queue and handle JSON messages.
 *
 * The `handler` must return an `AckType` (or a Promise resolving to one).
 * Based on the returned ack type, this function will call the appropriate
 * channel acknowledgement function and log the action for debugging.
 */
export async function subscribeJSON(conn, exchange, queueName, key, queueType, handler, args) {
    const [ch, queue] = await declareAndBind(conn, exchange, queueName, key, queueType, args);
    await ch.consume(queue.queue, async (msg) => {
        if (!msg)
            return;
        let data = null;
        try {
            data = JSON.parse(msg.content.toString());
        }
        catch (error) {
            console.error("Error parsing message:", error);
            // Preserve previous behavior: acknowledge malformed messages so they don't loop.
            ch.ack(msg);
            console.log("Ack: malformed JSON - message acknowledged and removed from queue");
            return;
        }
        try {
            const ackType = await handler(data);
            switch (ackType) {
                case AckType.Ack:
                    ch.ack(msg);
                    console.log("Ack: message acknowledged");
                    break;
                case AckType.NackRequeue:
                    ch.nack(msg, false, true);
                    console.log("NackRequeue: message negatively acknowledged and requeued");
                    break;
                case AckType.NackDiscard:
                    ch.nack(msg, false, false);
                    console.log("NackDiscard: message negatively acknowledged and discarded");
                    break;
                default:
                    const unreachable = ackType;
                    console.error("Unexpected ack type:", unreachable);
                    return;
            }
        }
        catch (err) {
            console.error("Handler threw an exception:", err);
            ch.nack(msg, false, false);
            console.log("NackDiscard: message negatively acknowledged and discarded due to handler error");
        }
    });
}

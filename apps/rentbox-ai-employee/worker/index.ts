import { dbQuery } from "../lib/db";
import { processEvent, runScheduledRules } from "../lib/rules/engine";

async function processPendingEvents(batchSize = 50) {
  const pending = await dbQuery<{ id: string }>(
    `
    select id
    from events
    where processed_at is null
       or processing_error is not null
    order by created_at asc
    limit $1
    `,
    [batchSize]
  );
  for (const e of pending.rows) {
    await processEvent(e.id);
  }
}

async function tick() {
  await processPendingEvents();
  await runScheduledRules();
}

// eslint-disable-next-line no-console
console.log("Rentbox AI Employee worker starting…");

// Run immediately and then every 5 minutes.
tick().catch((e) => console.error(e));
setInterval(() => {
  tick().catch((e) => console.error(e));
}, 5 * 60 * 1000);


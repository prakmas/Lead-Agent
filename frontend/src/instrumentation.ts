// Runs once when the Next.js server starts. We use it to launch the recurring
// follow-up scheduler (the "send scheduled match updates" loop). This only works
// on a persistent server (e.g. Railway), not on serverless — see DEPLOY.md.

export async function register() {
  // Only run in the Node.js server runtime (not edge, not build).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Guard against double-start on dev hot reload.
  const g = global as unknown as { _schedulerStarted?: boolean };
  if (g._schedulerStarted) return;
  g._schedulerStarted = true;

  const connectDB = (await import("./server/config/db.js")).default;
  const { runFollowUpScheduler } = await import("./server/services/followUp.service.js");

  const INTERVAL_MS = 5 * 60 * 1000;

  try {
    await connectDB();
    // Run once on boot, then on interval.
    runFollowUpScheduler().catch((e: Error) =>
      console.error("[followup] initial run error:", e.message),
    );
    setInterval(() => {
      runFollowUpScheduler().catch((e: Error) =>
        console.error("[followup] scheduler error:", e.message),
      );
    }, INTERVAL_MS);
    console.log(`Follow-up scheduler running every ${INTERVAL_MS / 1000}s`);
  } catch (error) {
    console.error("[instrumentation] failed to start scheduler:", (error as Error).message);
  }
}

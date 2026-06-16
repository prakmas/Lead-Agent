import dotenv from "dotenv";
import app from "./app.js";
import env from "./config/env.js";
import connectDB from "./config/db.js";
import { runFollowUpScheduler } from "./services/followUp.service.js";

dotenv.config();

const PORT = env.port;

// How often to check for due follow-ups (every 5 minutes).
const SCHEDULER_INTERVAL_MS = 5 * 60 * 1000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });

  // Run once immediately on boot then on interval so newly seeded/demo leads
  // pick up follow-ups right away without waiting the full interval.
  runFollowUpScheduler().catch((err) =>
    console.error("[followup] initial run error:", err.message),
  );

  setInterval(() => {
    runFollowUpScheduler().catch((err) =>
      console.error("[followup] scheduler error:", err.message),
    );
  }, SCHEDULER_INTERVAL_MS);

  console.log(`Follow-up scheduler running every ${SCHEDULER_INTERVAL_MS / 1000}s`);
};

startServer().catch((error) => {
  console.error("Failed to start backend:", error.message);
  process.exit(1);
});

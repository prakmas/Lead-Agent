// Side-effect import used FIRST in standalone scripts (seed/init) so environment
// variables are loaded before any module that reads process.env at import time.
// In the Next.js runtime this file is unused — Next loads .env.local itself.
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

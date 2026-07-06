import { app } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { seedCategories } from './utils/seedCategories.js';

// Last-resort safety net: log and keep running rather than let one
// unexpected rejection/exception silently kill the whole process (which
// would otherwise take down every in-flight request, not just the one that
// triggered it). Anything routed through Express's own request cycle is
// already handled by asyncHandler + the centralized error handler — this
// only catches things outside that path (e.g. a fire-and-forget background
// job like transcoding).
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

async function main() {
  await connectDB();
  await seedCategories();
  app.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

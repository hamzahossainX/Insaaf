// Vercel serverless entry point.
// Vercel detects the default export of an Express app and wraps it as a
// serverless function automatically — no app.listen() needed here.
import "dotenv/config";
import app from "../src/app";

export default app;

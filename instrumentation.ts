// Node-only startup (migrations, seed, daily backup) lives in its own file so the Edge bundle never sees it.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./instrumentation-node");
}

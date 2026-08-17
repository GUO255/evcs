console.log("[site-selection-v2-service] worker placeholder running (no HTTP endpoint)");

setInterval(() => {
  // Keep the placeholder worker alive. The real worker polls job queues in production.
}, 60_000);

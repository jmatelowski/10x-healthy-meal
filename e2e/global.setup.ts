import { test as setup } from "@playwright/test";

setup("global setup", async () => {
  console.info("E2E global setup complete!");
});

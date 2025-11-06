import path from "path";
import fs from "fs";

export const createAuthStorageFile = async () => {
  const filePath = path.resolve(process.cwd(), "e2e", "fixtures", "auth-storage.json");

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({}), { flag: "wx" });
    console.info("[E2E_SETUP] Created auth-storage.json");
  }
};

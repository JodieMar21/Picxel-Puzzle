import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "electron-desktop-env");
const file = path.join(dir, "desktop.env");
if (!fs.existsSync(file)) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    file,
    "# Local desktop build: set DATABASE_URL (see electron-desktop-env/desktop.env.example). CI overwrites before packaging.\n",
  );
}

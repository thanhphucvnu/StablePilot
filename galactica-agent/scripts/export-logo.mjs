import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Resvg } from "@resvg/resvg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "public", "logo.svg");
const outDir = path.join(root, "..", "submission", "exports");

const svg = fs.readFileSync(svgPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const sizes = [
  { w: 192, name: "stablepilot-logo-192.png" },
  { w: 512, name: "stablepilot-logo-512.png" },
  { w: 1024, name: "stablepilot-logo-1024.png" }
];

for (const { w, name } of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: w }
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(path.join(outDir, name), png);
  console.log("Wrote", path.join("submission", "exports", name), png.length, "bytes");
}

fs.copyFileSync(svgPath, path.join(outDir, "stablepilot-logo.svg"));
console.log("Wrote submission/exports/stablepilot-logo.svg (copy)");

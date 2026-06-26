#!/usr/bin/env node

import fs from "fs";
import path from "path";
import process from "process";
import { chromium } from "playwright";

async function exportSvg(inputPath: string) {
  const json = fs.readFileSync(inputPath, { encoding: "utf-8" });
  const virgil = fs.readFileSync(new URL("./Virgil.woff2", import.meta.url), {
    encoding: "base64",
  });
  const cascadia = fs.readFileSync(new URL("./Cascadia.woff2", import.meta.url), {
    encoding: "base64",
  });
  const outputPathSvg = inputPath.replace(/\.excalidraw$/, "") + ".svg";

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <script>
          window.renderSvg = async (data) => {
            const diagram = JSON.parse(data);
            if (!window.__excalidrawExportToSvg) {
              throw new Error("Excalidraw exportToSvg not available");
            }
            const svg = await window.__excalidrawExportToSvg({
              elements: diagram.elements || [],
              appState: diagram.appState || {},
              files: diagram.files || {},
            });
            return { svg: svg.outerHTML };
          };
        </script>
      </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: "load" });
  await page.addStyleTag({ content: "body{margin:0;}" });
  await page.addScriptTag({
    type: "module",
    content: "import { exportToSvg } from 'https://esm.sh/@excalidraw/excalidraw@0.18.0'; window.__excalidrawExportToSvg = exportToSvg;",
  });
    await page.waitForFunction(() => (window as any).__excalidrawExportToSvg);
  const result = await page.evaluate(async (data) => {
      return await (window as any).renderSvg(data);
  }, json);

  fs.writeFileSync(outputPathSvg, result.svg, { encoding: "utf-8" });

  await browser.close();
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: node export-browser.mjs <file0.excalidraw> <file1.excalidraw> ...");
    process.exit(1);
  }

  for (const arg of args) {
    const inputPath = path.resolve(arg);
    await exportSvg(inputPath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

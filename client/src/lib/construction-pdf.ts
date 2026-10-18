import type { PixelationResult } from "@shared/schema";
import { generateVisualColorKey } from "@/lib/pixelation";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Opens a print-ready multi-page construction pack (Save as PDF from the print dialog).
 * Pages: overview + color key, then one visual guide page per board.
 */
export function openConstructionPdfPack(
  result: PixelationResult,
  options?: { projectName?: string; boardTileSize?: number },
): void {
  const projectName = options?.projectName ?? "Fractix Mosaic";
  const boardTileSize =
    options?.boardTileSize ??
    result.boardTileSize ??
    result.boards[0]?.pixels?.length ??
    32;

  const sorted = [...result.colorMap].sort((a, b) => b.count - a.count);
  const guides = generateVisualColorKey(result);

  const colorRows = sorted
    .map(
      (c) => `
      <tr>
        <td><span class="swatch" style="background:${esc(c.hex)}"></span></td>
        <td>${esc(c.name)}</td>
        <td>${esc(c.hex)}</td>
        <td class="num">${c.count}</td>
      </tr>`,
    )
    .join("");

  const boardPages = guides
    .map(
      (src, i) => `
    <section class="page">
      <header>
        <p class="brand">Fractix Studio</p>
        <h1>Board ${esc(result.boards[i]?.id ?? String(i + 1))}</h1>
        <p class="sub">${boardTileSize}×${boardTileSize} baseplate · ${esc(projectName)}</p>
      </header>
      <img class="guide" src="${src}" alt="Board guide" />
    </section>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(projectName)} — Construction Pack</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #111; margin: 0; }
    .page { page-break-after: always; padding: 8px 0; }
    .page:last-child { page-break-after: auto; }
    .brand { text-transform: uppercase; letter-spacing: 0.2em; font-size: 11px; color: #2563eb; font-weight: 700; margin: 0 0 4px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .sub { color: #555; margin: 0 0 16px; font-size: 13px; }
    .overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
    .mosaic { width: 100%; border: 1px solid #ddd; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid #e5e5e5; padding: 6px 4px; text-align: left; }
    th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #666; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .swatch { display: inline-block; width: 14px; height: 14px; border: 1px solid #999; border-radius: 3px; vertical-align: middle; }
    .stats { display: flex; gap: 16px; flex-wrap: wrap; margin: 12px 0 20px; font-size: 13px; }
    .stat { background: #f4f6f8; padding: 8px 12px; border-radius: 8px; }
    .guide { width: 100%; max-height: 240mm; object-fit: contain; border: 1px solid #ddd; }
    .hint { margin-top: 20px; font-size: 12px; color: #666; }
    @media print {
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="padding:12px 16px;background:#eff6ff;border-bottom:1px solid #bfdbfe;font-size:14px;">
    Use <strong>Print → Save as PDF</strong> (or your system PDF printer) to export this pack.
    <button onclick="window.print()" style="margin-left:12px;padding:6px 12px;border-radius:8px;border:1px solid #2563eb;background:#2563eb;color:#fff;cursor:pointer;">Print / Save PDF</button>
  </div>

  <section class="page">
    <header>
      <p class="brand">Fractix Studio</p>
      <h1>${esc(projectName)}</h1>
      <p class="sub">Construction pack · overview &amp; shopping colour key</p>
    </header>
    <div class="stats">
      <div class="stat"><strong>${result.boards.length}</strong> boards</div>
      <div class="stat"><strong>${boardTileSize}×${boardTileSize}</strong> per board</div>
      <div class="stat"><strong>${result.totalTiles.toLocaleString()}</strong> tiles</div>
      <div class="stat"><strong>${sorted.length}</strong> colours</div>
    </div>
    <div class="overview-grid">
      <div>
        <img class="mosaic" src="${result.pixelatedImageData}" alt="Mosaic overview" />
      </div>
      <div>
        <table>
          <thead><tr><th></th><th>Colour</th><th>Hex</th><th>Count</th></tr></thead>
          <tbody>${colorRows}</tbody>
        </table>
      </div>
    </div>
    <p class="hint">Following pages: one printable guide per board (${result.boards.length}).</p>
  </section>

  ${boardPages}
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    throw new Error("Pop-up blocked — allow pop-ups to export the PDF pack.");
  }
  win.document.write(html);
  win.document.close();
}

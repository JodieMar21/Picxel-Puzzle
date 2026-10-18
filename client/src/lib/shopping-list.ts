import type { ColorUsage, PixelationResult } from "@shared/schema";

function sortedColors(colorMap: ColorUsage[]): ColorUsage[] {
  return [...colorMap].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** CSV shopping list — opens cleanly in Excel / Sheets. */
export function downloadShoppingListCsv(
  result: PixelationResult,
  projectName = "fractix-mosaic",
): void {
  const rows = sortedColors(result.colorMap);
  const lines = [
    "Color Name,Hex,Brick Count (1x1),Notes",
    ...rows.map(
      (c) =>
        `"${c.name.replace(/"/g, '""')}",${c.hex},${c.count},"1x1 plate/tile"`,
    ),
    "",
    `Total unique colors,${rows.length}`,
    `Total bricks,${rows.reduce((sum, c) => sum + c.count, 0)}`,
    `Total boards,${result.boards.length}`,
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const safe = projectName.replace(/[^\w\-]+/g, "-").toLowerCase() || "fractix";
  downloadBlob(blob, `${safe}-shopping-list.csv`);
}

/** Excel-compatible SpreadsheetML (.xls) — no extra client deps. */
export function downloadShoppingListExcel(
  result: PixelationResult,
  projectName = "fractix-mosaic",
): void {
  const rows = sortedColors(result.colorMap);
  const total = rows.reduce((sum, c) => sum + c.count, 0);
  const cell = (v: string | number) =>
    `<Cell><Data ss:Type="${typeof v === "number" ? "Number" : "String"}">${String(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</Data></Cell>`;

  const bodyRows = rows
    .map(
      (c) =>
        `<Row>${cell(c.name)}${cell(c.hex)}${cell(c.count)}${cell("1x1 plate/tile")}</Row>`,
    )
    .join("");

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Shopping List">
  <Table>
   <Row>${cell("Color Name")}${cell("Hex")}${cell("Brick Count (1x1)")}${cell("Notes")}</Row>
   ${bodyRows}
   <Row></Row>
   <Row>${cell("Total unique colors")}${cell("")}${cell(rows.length)}</Row>
   <Row>${cell("Total bricks")}${cell("")}${cell(total)}</Row>
   <Row>${cell("Total boards")}${cell("")}${cell(result.boards.length)}</Row>
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const safe = projectName.replace(/[^\w\-]+/g, "-").toLowerCase() || "fractix";
  downloadBlob(blob, `${safe}-shopping-list.xls`);
}

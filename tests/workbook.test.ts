import { strict as assert } from "node:assert";
import { test } from "node:test";
import { strFromU8, unzipSync } from "fflate";
import { createWorkbook } from "../src/lib/workbook";

test("creates a readable spreadsheet archive with typed numeric cells", () => {
  const archive = createWorkbook(["WASA", "Demand (Rs.)"], [
    { WASA: "River & City", "Demand (Rs.)": 1250.5 },
  ]);
  const files = unzipSync(archive);
  const workbook = strFromU8(files["xl/workbook.xml"]);
  const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);

  assert.match(workbook, /Monthly WASA reports/);
  assert.match(sheet, /A2" t="inlineStr"/);
  assert.match(sheet, /River &amp; City/);
  assert.match(sheet, /B2"><v>1250\.5<\/v>/);
  assert.match(sheet, /autoFilter ref="A1:B2"/);
});

test("escapes untrusted cell values as text rather than formulas", () => {
  const archive = createWorkbook(["Name"], [{ Name: '=1+<2 & "x"' }]);
  const sheet = strFromU8(unzipSync(archive)["xl/worksheets/sheet1.xml"]);

  assert.match(sheet, /t="inlineStr"/);
  assert.match(sheet, /&#x3D;|=1\+&lt;2 &amp; &quot;x&quot;/);
  assert.doesNotMatch(sheet, /<f>/);
});

test("rejects an invalid workbook without columns", () => {
  assert.throws(() => createWorkbook([], []), /At least one spreadsheet column/);
});

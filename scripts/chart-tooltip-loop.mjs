import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import lodash from "lodash";

const { find, map } = lodash;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const chartSrc = readFileSync(join(root, "src/components/glucose-chart.tsx"), "utf8");
const xKeyMatch = chartSrc.match(/<XAxis[\s\S]*?dataKey="([^"]+)"/);
assert.ok(xKeyMatch, "GlucoseChart XAxis is missing dataKey");
const xKey = xKeyMatch[1];

const thursday = (hour, minute) =>
  new Date(2026, 8, 17, hour, minute).getTime();

const readings = [
  { takenAt: thursday(9, 4), valueMgDl: 85 },
  { takenAt: thursday(14, 0), valueMgDl: 135 },
];

const points = map(readings, (reading) => ({
  at: reading.takenAt,
  label: format(reading.takenAt, "EEE d", { locale: fr }),
  mgDl: reading.valueMgDl,
}));

const hoveredIndex = 1;
const activeLabel = points[hoveredIndex][xKey];
const tooltipPoint = find(points, (point) => point[xKey] === activeLabel);

const expectedMgDl = points[hoveredIndex].mgDl;
const actualMgDl = tooltipPoint?.mgDl;

assert.equal(
  actualMgDl,
  expectedMgDl,
  `tooltip for Thursday spike used XAxis dataKey="${xKey}" and showed ${actualMgDl} mg/dL; expected ${expectedMgDl} mg/dL`,
);

console.log(
  `GREEN: hovering the later Thursday reading shows ${actualMgDl} mg/dL (XAxis dataKey="${xKey}")`,
);

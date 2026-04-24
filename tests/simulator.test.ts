import test from "node:test";
import assert from "node:assert/strict";

import { runBalanceSimulation } from "../src/server/simulator.js";

test("runBalanceSimulation returns aggregate balance data", () => {
  const report = runBalanceSimulation({ runs: 10 });

  assert.equal(report.runs, 10);
  assert.equal(report.successes + report.failures, 10);
  assert.ok(report.winRate >= 0 && report.winRate <= 1);
  assert.ok(report.averageFinalMetrics.power >= 0);
  assert.ok(report.roleContribution.length >= 4);
  assert.ok(report.taskOutcomes.resolved + report.taskOutcomes.failed > 0);
  assert.ok(report.recommendations.length > 0);
});

import process from "node:process";

import { runBalanceSimulation } from "../server/simulator.js";

function parseRuns(argv: string[]): number {
  const index = argv.indexOf("--runs");
  if (index === -1) {
    return 50;
  }
  return Number(argv[index + 1] ?? 50);
}

const report = runBalanceSimulation({ runs: parseRuns(process.argv.slice(2)) });
console.log(JSON.stringify(report, null, 2));

import test from "node:test";
import assert from "node:assert/strict";

import {
  validateAgentAction,
  validateChatText,
  validateRegisterAgentRequest,
  validateSecret,
} from "../src/server/validation.js";

test("validateRegisterAgentRequest accepts a complete agent profile", () => {
  const request = validateRegisterAgentRequest({
    name: "林医生",
    role: "doctor",
    persona: {
      codename: "Triage",
      archetype: "冷静分诊者",
      style: "短句、优先级清晰",
      risk: "low",
      catchphrase: "先稳住呼吸。",
    },
  });

  assert.equal(request.role, "doctor");
  assert.equal(request.persona.risk, "low");
});

test("validateRegisterAgentRequest rejects unknown roles", () => {
  assert.throws(
    () =>
      validateRegisterAgentRequest({
        name: "Bad Actor",
        role: "admin",
        persona: {
          codename: "Root",
          archetype: "越权者",
          style: "noise",
          risk: "high",
          catchphrase: "oops",
        },
      }),
    /role/,
  );
});

test("validateAgentAction rejects unsupported action types", () => {
  assert.throws(() => validateAgentAction({ type: "delete_room", taskId: "task_1" }), /action type/);
});

test("validateAgentAction requires taskId for task actions", () => {
  assert.throws(() => validateAgentAction({ type: "claim_task" }), /taskId/);
});

test("validateSecret rejects blank secrets", () => {
  assert.throws(() => validateSecret(""), /secret/);
});

test("validateChatText trims and limits chat text", () => {
  const text = validateChatText(`  ${"守住北门".repeat(60)}  `);
  assert.equal(text.length, 180);
  assert.match(text, /^守住北门/);
});

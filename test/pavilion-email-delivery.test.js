import test from "node:test";
import assert from "node:assert/strict";
import { requireEmailDelivery } from "../services/emailDelivery.js";

test("accepts a Resend delivery with an email id", () => {
  assert.deepEqual(
    requireEmailDelivery({ data: { id: "email_123" }, error: null }, "Pavilion application notification"),
    { id: "email_123" },
  );
});

test("throws when Resend returns a delivery error instead of rejecting", () => {
  assert.throws(
    () => requireEmailDelivery({ data: null, error: { message: "Sender domain is not verified" } }, "Pavilion application notification"),
    /Pavilion application notification email was not accepted by Resend: Sender domain is not verified/,
  );
});

test("throws when Resend returns neither an id nor an error", () => {
  assert.throws(
    () => requireEmailDelivery({ data: null, error: null }, "Pavilion application notification"),
    /Pavilion application notification email was not accepted by Resend/,
  );
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { isPublicSuffixHostname } from "../src/public-suffix.mjs";

test("rejects ICANN and private public suffixes", () => {
  for (const hostname of ["com", "co.uk", "github.io", "s3.amazonaws.com"]) {
    assert.equal(isPublicSuffixHostname(hostname), true, hostname);
  }
});

test("accepts registrable hostnames beneath ICANN and private suffixes", () => {
  for (const hostname of [
    "example.com",
    "example.co.uk",
    "customer.github.io",
    "bucket.s3.amazonaws.com",
    "xn--bcher-kva.de",
  ]) {
    assert.equal(isPublicSuffixHostname(hostname), false, hostname);
  }
});

test("fails closed for missing hostnames and list-only suffixes", () => {
  for (const hostname of ["", "com", "co.uk", "github.io"]) {
    assert.equal(isPublicSuffixHostname(hostname), true, hostname || "empty hostname");
  }
});

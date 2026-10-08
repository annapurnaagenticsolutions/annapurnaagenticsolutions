import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import {
  probePinnedTlsHost,
  TLS_PROBE_HOSTNAME,
} from "../egress-prototype/src/pinned-tls.mjs";

const ANSWER = "93.184.216.34";

class FakeTlsSocket extends EventEmitter {
  constructor({ remoteAddress = ANSWER, servername = TLS_PROBE_HOSTNAME, authorized = true } = {}) {
    super();
    this.remoteAddress = remoteAddress;
    this.servername = servername;
    this.authorized = authorized;
    this.ended = false;
    this.destroyed = false;
  }

  end() { this.ended = true; }
  destroy() { this.destroyed = true; }
}

function dependencies({
  addresses = [ANSWER],
  socketOptions,
  event = "secureConnect",
  resolveError,
  connectError,
  socketEventError,
} = {}) {
  const calls = { resolved: [], connected: [] };
  return {
    calls,
    resolve4: async (hostname) => {
      calls.resolved.push(hostname);
      if (resolveError) throw resolveError;
      return addresses;
    },
    connectTls: (options) => {
      calls.connected.push(options);
      if (connectError) throw connectError;
      const socket = new FakeTlsSocket(socketOptions);
      if (event) queueMicrotask(() => socket.emit(event, socketEventError ?? new Error("synthetic socket event")));
      calls.socket = socket;
      return socket;
    },
  };
}

test("pinned TLS probe resolves the fixed host and connects only to its selected IPv4 address", async () => {
  const deps = dependencies({ addresses: [ANSWER, "93.184.216.35", ANSWER] });
  const evidence = await probePinnedTlsHost(TLS_PROBE_HOSTNAME, deps);

  assert.deepEqual(deps.calls.resolved, [TLS_PROBE_HOSTNAME]);
  const options = deps.calls.connected[0];
  assert.deepEqual({
    host: options.host,
    port: options.port,
    lookup: typeof options.lookup,
    servername: options.servername,
    checkServerIdentity: typeof options.checkServerIdentity,
    rejectUnauthorized: options.rejectUnauthorized,
    ALPNProtocols: options.ALPNProtocols,
  }, {
    host: TLS_PROBE_HOSTNAME,
    port: 443,
    lookup: "function",
    servername: TLS_PROBE_HOSTNAME,
    checkServerIdentity: "function",
    rejectUnauthorized: true,
    ALPNProtocols: ["http/1.1"],
  });
  const lookupResult = await new Promise((resolve, reject) => {
    options.lookup(TLS_PROBE_HOSTNAME, {}, (error, address, family) => {
      if (error) reject(error);
      else resolve({ address, family });
    });
  });
  assert.deepEqual(lookupResult, { address: ANSWER, family: 4 });
  const allLookupResult = await new Promise((resolve, reject) => {
    options.lookup(TLS_PROBE_HOSTNAME, { all: true }, (error, addresses) => {
      if (error) reject(error);
      else resolve(addresses);
    });
  });
  assert.deepEqual(allLookupResult, [{ address: ANSWER, family: 4 }]);
  await assert.rejects(new Promise((resolve, reject) => {
    options.lookup("attacker.example", {}, (error, address, family) => {
      if (error) reject(error);
      else resolve({ address, family });
    });
  }), /pinned_tls_lookup_hostname_mismatch/);
  const identityCheck = options.checkServerIdentity;
  assert.equal(typeof identityCheck, "function");
  assert.equal(identityCheck(TLS_PROBE_HOSTNAME, { subjectaltname: `DNS:${TLS_PROBE_HOSTNAME}` }), undefined);
  assert.ok(identityCheck(TLS_PROBE_HOSTNAME, { subjectaltname: "DNS:attacker.example" }) instanceof Error);
  assert.ok(identityCheck("attacker.example", { subjectaltname: `DNS:${TLS_PROBE_HOSTNAME}` }) instanceof Error);
  assert.deepEqual(evidence, {
    hostname: TLS_PROBE_HOSTNAME,
    selectedAddress: ANSWER,
    remoteAddress: ANSWER,
    servername: TLS_PROBE_HOSTNAME,
    authorized: true,
    addressFamily: 4,
    resolvedAddressCount: 2,
  });
  assert.equal(deps.calls.socket.ended, true);
});

test("pinned TLS probe rejects every hostname except its fixed test hostname before resolving", async () => {
  const deps = dependencies();
  await assert.rejects(probePinnedTlsHost("attacker.example", deps), /hostname_not_allowed/);
  assert.deepEqual(deps.calls, { resolved: [], connected: [] });
});

test("pinned TLS probe rejects empty, excessive, and malformed DNS answer sets without connecting", async (t) => {
  const cases = [
    { name: "empty", addresses: [] },
    { name: "too many", addresses: Array.from({ length: 17 }, (_, index) => `93.184.216.${index + 1}`) },
    { name: "non-canonical", addresses: ["093.184.216.34"] },
    { name: "out-of-range", addresses: ["93.184.216.999"] },
  ];

  for (const item of cases) {
    await t.test(item.name, async () => {
      const deps = dependencies({ addresses: item.addresses });
      await assert.rejects(probePinnedTlsHost(TLS_PROBE_HOSTNAME, deps), /pinned_tls_dns_answer/);
      assert.equal(deps.calls.connected.length, 0);
    });
  }
});

test("pinned TLS probe rejects private, metadata, reserved, and special-purpose DNS answers before connecting", async () => {
  const addresses = [
    "0.0.0.1",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.0.0.9",
    "192.0.2.1",
    "192.31.196.1",
    "192.52.193.1",
    "192.88.99.1",
    "192.168.1.1",
    "192.175.48.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "240.0.0.1",
  ];

  for (const address of addresses) {
    const deps = dependencies({ addresses: [address] });
    await assert.rejects(
      probePinnedTlsHost(TLS_PROBE_HOSTNAME, deps),
      /pinned_tls_dns_answer_not_public/,
      `${address} must be rejected before opening a socket`,
    );
    assert.equal(deps.calls.connected.length, 0, `${address} must not reach tls.connect`);
  }

  const mixed = dependencies({ addresses: [ANSWER, "169.254.169.254"] });
  await assert.rejects(probePinnedTlsHost(TLS_PROBE_HOSTNAME, mixed), /pinned_tls_dns_answer_not_public/);
  assert.equal(mixed.calls.connected.length, 0, "mixed DNS answer sets must fail closed");
});

test("pinned TLS probe fails closed when the connected peer differs from the selected address", async () => {
  const deps = dependencies({ socketOptions: { remoteAddress: "93.184.216.35" } });
  await assert.rejects(probePinnedTlsHost(TLS_PROBE_HOSTNAME, deps), /peer_validation_failed/);
  assert.equal(deps.calls.socket.destroyed, true);
});

test("pinned TLS probe fails closed for an unauthorized or wrong-name certificate", async (t) => {
  for (const [name, socketOptions] of [
    ["unauthorized", { authorized: false }],
    ["wrong SNI", { servername: "other.example" }],
  ]) {
    await t.test(name, async () => {
      const deps = dependencies({ socketOptions });
      await assert.rejects(probePinnedTlsHost(TLS_PROBE_HOSTNAME, deps), /peer_validation_failed/);
      assert.equal(deps.calls.socket.destroyed, true);
    });
  }
});

test("pinned TLS probe fails closed on DNS errors, socket errors, early close, and timeout", async (t) => {
  await t.test("DNS error", async () => {
    const deps = dependencies({ resolveError: new Error("synthetic DNS error") });
    await assert.rejects(probePinnedTlsHost(TLS_PROBE_HOSTNAME, deps), /synthetic DNS error/);
    assert.equal(deps.calls.connected.length, 0);
  });

  await t.test("socket error", async () => {
    const deps = dependencies({
      event: "error",
      socketEventError: Object.assign(new Error("sensitive socket message"), { code: "ECONNRESET" }),
    });
    await assert.rejects(probePinnedTlsHost(TLS_PROBE_HOSTNAME, deps), (error) => {
      assert.match(error.message, /connection_failed/);
      assert.equal(error.code, "ECONNRESET");
      assert.doesNotMatch(error.message, /sensitive socket message/);
      return true;
    });
    assert.equal(deps.calls.socket.destroyed, true);
  });

  await t.test("early close", async () => {
    const deps = dependencies({ event: "close" });
    await assert.rejects(probePinnedTlsHost(TLS_PROBE_HOSTNAME, deps), /closed_early/);
    assert.equal(deps.calls.socket.destroyed, true);
  });

  await t.test("handshake timeout", async () => {
    const deps = dependencies({ event: null });
    await assert.rejects(
      probePinnedTlsHost(TLS_PROBE_HOSTNAME, { ...deps, timeoutMs: 5 }),
      /handshake_timeout/,
    );
    assert.equal(deps.calls.socket.destroyed, true);
  });
});

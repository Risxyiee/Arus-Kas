// Test verifikasi signature webhook Midtrans (S4) — jalankan dengan: bun test worker/test/
// Rumus resmi Midtrans: SHA512(order_id + status_code + gross_amount + ServerKey)
// Sumber: https://docs.midtrans.com/docs/https-notification-webhooks
import { describe, it, expect } from "bun:test";
import { sha512, verifyMidtransSignature } from "../index";

const SERVER_KEY = "SB-Mid-server-test-key-12345";
const orderId = "ARUS-1700000000-uid123";
const statusCode = "200";
const grossAmount = "29000.00"; // format Midtrans: string 2 desimal
const validSig = await sha512(orderId + statusCode + grossAmount + SERVER_KEY);

function body(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    order_id: orderId,
    status_code: statusCode,
    gross_amount: grossAmount,
    transaction_status: "settlement",
    payment_type: "gopay",
    signature_key: validSig,
    metadata: { user_id: "user-abc", plan: "monthly" },
    ...over,
  };
}

describe("verifyMidtransSignature (S4)", () => {
  it("signature valid sesuai rumus Midtrans diterima", async () => {
    const r = await verifyMidtransSignature(body(), SERVER_KEY);
    expect(r.ok).toBe(true);
    expect(r.status).toBe(200);
  });

  it("webhook TANPA signature_key ditolak 403 (dulu: dilewati)", async () => {
    const b = body(); delete b.signature_key;
    const r = await verifyMidtransSignature(b, SERVER_KEY);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(403);
  });

  it("signature salah (fake webhook) ditolak 403", async () => {
    const r = await verifyMidtransSignature(body({ signature_key: "deadbeef" }), SERVER_KEY);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(403);
    expect(r.error).toContain("Invalid signature");
  });

  it("gross_amount dimanipulasi setelah signature dibuat ditolak 403", async () => {
    const r = await verifyMidtransSignature(body({ gross_amount: "1.00" }), SERVER_KEY);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(403);
  });

  it("status_code hilang ditolak 403 (bagian dari rumus)", async () => {
    const b = body(); delete b.status_code;
    const r = await verifyMidtransSignature(b, SERVER_KEY);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(403);
  });

  it("order_id hilang ditolak 403", async () => {
    const b = body(); delete b.order_id;
    const r = await verifyMidtransSignature(b, SERVER_KEY);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(403);
  });

  it("server key tidak diset = fail-closed 500, webhook tidak diproses", async () => {
    const r = await verifyMidtransSignature(body(), undefined);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(500);
  });

  it("rumus memakai status_code (200), BUKAN transaction_status — fix regresi", async () => {
    // signature yang dibuat dari transaction_status (rumus lama yang salah) HARUS gagal
    const oldFormulaSig = await sha512(orderId + "settlement" + grossAmount + SERVER_KEY);
    const r = await verifyMidtransSignature(body({ signature_key: oldFormulaSig }), SERVER_KEY);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(403);
  });

  it("signature berbeda per order/amount (tidak bisa dipakai ulang)", async () => {
    const otherSig = await sha512("ARUS-LAIN-999" + statusCode + grossAmount + SERVER_KEY);
    const r = await verifyMidtransSignature(body({ signature_key: otherSig }), SERVER_KEY);
    expect(r.ok).toBe(false);
  });

  it("sha512 menghasilkan 128 karakter hex lowercase", async () => {
    const h = await sha512("abc");
    expect(h).toMatch(/^[0-9a-f]{128}$/);
  });
});

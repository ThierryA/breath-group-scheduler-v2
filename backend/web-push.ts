/**
 * Minimal Web Push implementation for Cloudflare Workers
 * Uses only Web Crypto API (no Node.js crypto dependency)
 * Implements RFC 8291 (aes128gcm content encoding) + RFC 8292 (VAPID)
 */

const encoder = new TextEncoder();

/* ---- Base64URL helpers ---- */

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s + pad);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function concat(...arrs: Uint8Array[]): Uint8Array {
  const len = arrs.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

/* ---- VAPID JWT ---- */

async function importVapidKeys(privateKeyB64: string, publicKeyB64: string) {
  const rawPrivate = b64urlDecode(privateKeyB64);
  const rawPublic = b64urlDecode(publicKeyB64);

  // Extract x and y from the uncompressed public key (65 bytes: 0x04 || x || y)
  const x = b64url(rawPublic.slice(1, 33));
  const y = b64url(rawPublic.slice(33, 65));
  const d = b64url(rawPrivate);

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  return { privateKey: key, publicKeyRaw: rawPublic };
}

async function createVapidHeaders(
  endpoint: string,
  vapidSubject: string,
  vapidPrivateKeyB64: string,
  vapidPublicKeyB64: string
): Promise<{ authorization: string; cryptoKeyHeader: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const headerB64 = b64url(
    encoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" }))
  );
  const payloadB64 = b64url(
    encoder.encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: vapidSubject,
      })
    )
  );

  const { privateKey, publicKeyRaw } = await importVapidKeys(
    vapidPrivateKeyB64,
    vapidPublicKeyB64
  );

  const sigInput = encoder.encode(`${headerB64}.${payloadB64}`);
  const sigRaw = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    sigInput
  );

  // Convert DER-like WebCrypto signature to raw r||s (64 bytes)
  const sigBytes = new Uint8Array(sigRaw);
  const jwt = `${headerB64}.${payloadB64}.${b64url(sigBytes)}`;

  return {
    authorization: `vapid t=${jwt}, k=${b64url(publicKeyRaw)}`,
    cryptoKeyHeader: `p256ecdsa=${b64url(publicKeyRaw)}`,
  };
}

/* ---- HKDF helper (RFC 5869) ---- */

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    salt.length ? salt : new Uint8Array(32),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prk = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, ikm)
  );

  const prkKey = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const infoWithCounter = concat(info, new Uint8Array([1]));
  const okm = new Uint8Array(
    await crypto.subtle.sign("HMAC", prkKey, infoWithCounter)
  );
  return okm.slice(0, length);
}

/* ---- Web Push Encryption (aes128gcm / RFC 8291) ---- */

async function encryptPayload(
  payload: string,
  subscriptionP256dhB64: string,
  subscriptionAuthB64: string
): Promise<{ ciphertext: Uint8Array; localPublicKey: Uint8Array; salt: Uint8Array }> {
  const subscriberPublicKey = b64urlDecode(subscriptionP256dhB64);
  const subscriberAuth = b64urlDecode(subscriptionAuthB64);

  // Generate ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Export the local public key in uncompressed form
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Import subscriber's public key for ECDH
  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    subscriberPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberKey },
      localKeyPair.privateKey,
      256
    )
  );

  // Generate random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // RFC 8291: IKM = HKDF-Extract + HKDF-Expand with auth_secret as salt
  // info for IKM: "WebPush: info\0" || ua_public || as_public
  const ikmInfo = concat(
    encoder.encode("WebPush: info\0"),
    subscriberPublicKey,
    localPublicKeyRaw
  );
  const ikm = await hkdf(subscriberAuth, sharedSecret, ikmInfo, 32);

  // Derive content encryption key (CEK) and nonce
  const cekInfo = encoder.encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = encoder.encode("Content-Encoding: nonce\0");

  const cek = await hkdf(salt, ikm, cekInfo, 16);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad the plaintext: payload || 0x02 (delimiter for aes128gcm)
  const plaintextBytes = encoder.encode(payload);
  const padded = concat(plaintextBytes, new Uint8Array([2]));

  // AES-128-GCM encrypt
  const aesKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      padded
    )
  );

  // aes128gcm header: salt(16) || rs(4) || idlen(1) || keyid(65) || encrypted_record
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const idLen = new Uint8Array([65]); // length of uncompressed P-256 key

  const ciphertext = concat(salt, rs, idLen, localPublicKeyRaw, encrypted);

  return { ciphertext, localPublicKey: localPublicKeyRaw, salt };
}

/* ---- Public API ---- */

export interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface VapidConfig {
  subject: string;
  publicKey: string;
  privateKey: string;
}

export interface PushResult {
  endpoint: string;
  success: boolean;
  status?: number;
  error?: string;
}

/**
 * Send a Web Push notification to a single subscription.
 * Returns the HTTP status code or an error.
 */
export async function sendWebPush(
  subscription: PushSubscription,
  payload: string,
  vapid: VapidConfig
): Promise<PushResult> {
  try {
    const { authorization } = await createVapidHeaders(
      subscription.endpoint,
      vapid.subject,
      vapid.privateKey,
      vapid.publicKey
    );

    const { ciphertext } = await encryptPayload(
      payload,
      subscription.p256dh,
      subscription.auth
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        TTL: "86400",
        Urgency: "normal",
      },
      body: ciphertext,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return {
      endpoint: subscription.endpoint,
      success: response.status >= 200 && response.status < 300,
      status: response.status,
    };
  } catch (err: any) {
    return {
      endpoint: subscription.endpoint,
      success: false,
      error: err?.message ?? "push send failed",
    };
  }
}

/**
 * End-to-end encryption for calls.
 *
 * LiveKit's DTLS-SRTP protects each hop, but its media server decrypts in
 * between. On top of that, every call gets its own key that only the two
 * people in it hold: each browser makes a throwaway ECDH P-256 key pair, the
 * public halves are swapped through LiveKit participant attributes (public
 * keys are safe to relay), and both sides derive the same 256-bit key with
 * HKDF, salted with the call id. LiveKit's E2EE worker encrypts every audio
 * and video frame with it, so the server only ever relays ciphertext. The
 * private keys can't be exported and die with the page's call state — there
 * is no key anywhere to recover a past call with.
 */

const CURVE = { name: "ECDH", namedCurve: "P-256" } as const;
const INFO = new TextEncoder().encode("grouv-call-e2ee-v1");

/** The participant attribute carrying a side's public key. */
export const E2EE_ATTRIBUTE = "e2ee_pub";

export interface CallKeyPair {
  privateKey: CryptoKey;
  /** Base64 raw public key, for the participant attribute. */
  publicKey: string;
}

export async function createCallKeyPair(): Promise<CallKeyPair> {
  const pair = await crypto.subtle.generateKey(CURVE, false, ["deriveBits"]);
  const raw = await crypto.subtle.exportKey("raw", pair.publicKey);
  return { privateKey: pair.privateKey, publicKey: toBase64(raw) };
}

/** The shared frame key for this call: identical on both sides. */
export async function deriveCallKey(mine: CallKeyPair, theirPublicKey: string, callId: string): Promise<ArrayBuffer> {
  const theirs = await crypto.subtle.importKey("raw", fromBase64(theirPublicKey), CURVE, false, []);
  const secret = await crypto.subtle.deriveBits({ name: "ECDH", public: theirs }, mine.privateKey, 256);
  const material = await crypto.subtle.importKey("raw", secret, "HKDF", false, ["deriveBits"]);
  return crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode(callId), info: INFO },
    material,
    256,
  );
}

function toBase64(buffer: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

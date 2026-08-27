const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
});

const keysDir = path.join(__dirname, "..", "keys");
fs.mkdirSync(keysDir, { recursive: true });
fs.writeFileSync(path.join(keysDir, "private.pem"), privateKey);
fs.writeFileSync(path.join(keysDir, "public.pem"), publicKey);

console.log("\n=== ES256 JWT Keys ===\n");
console.log(`JWT_PRIVATE_KEY="${privateKey.replace(/\n/g, "\\n")}"`);
console.log();
console.log(`JWT_PUBLIC_KEY="${publicKey.replace(/\n/g, "\\n")}"`);

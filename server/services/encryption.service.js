// services/encryption.service.js
// ALE (Application Level Encryption) using AWS KMS + AES-256-GCM
// KMS is used to encrypt/decrypt the data key
// AES-256-GCM is used to encrypt the actual data

const { KMSClient, GenerateDataKeyCommand, DecryptCommand } = require("@aws-sdk/client-kms");
const crypto = require("crypto");

const kmsClient = new KMSClient({ region: process.env.AWS_REGION });
const KMS_KEY_ID = process.env.KMS_KEY_ID;

// Encrypt plaintext using AWS KMS data key + AES-256-GCM
const encrypt = async (plaintext) => {
    // Ask KMS to generate a data key
    // KMS returns both plaintext key (for encrypting) and encrypted key (for storing)
    const { Plaintext, CiphertextBlob } = await kmsClient.send(
        new GenerateDataKeyCommand({
            KeyId: KMS_KEY_ID,
            KeySpec: "AES_256",
        })
    );

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", Plaintext, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    // Store: encryptedKey:iv:authTag:encryptedData
    // The encryptedKey is safe to store — only KMS can decrypt it
    const encryptedKey = Buffer.from(CiphertextBlob).toString("base64");
    return `${encryptedKey}:${iv.toString("hex")}:${authTag}:${encrypted}`;
};

// Decrypt using AWS KMS to recover the data key, then AES-256-GCM to decrypt data
const decrypt = async (encryptedString) => {
    try {
        const [encryptedKey, ivHex, authTagHex, encryptedData] = encryptedString.split(":");

        // Ask KMS to decrypt the data key
        const { Plaintext } = await kmsClient.send(
            new DecryptCommand({
                CiphertextBlob: Buffer.from(encryptedKey, "base64"),
                KeyId: KMS_KEY_ID,
            })
        );

        const iv = Buffer.from(ivHex, "hex");
        const authTag = Buffer.from(authTagHex, "hex");

        const decipher = crypto.createDecipheriv("aes-256-gcm", Plaintext, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedData, "hex", "utf8");
        decrypted += decipher.final("utf8");

        return decrypted;
    } catch (error) {
        console.error("Decryption failed:", error.message);
        return null;
    }
};

module.exports = { encrypt, decrypt };
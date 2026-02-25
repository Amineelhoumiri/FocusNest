// Encryption service for sensitive data

const crypto = require("crypto"); 
const ALGORITHM = "aes-256-gcm"; // Encryption algorithm
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex"); // Encryption key from environment variable

// Encrypt data
const encrypt = (plaintext) => {
    const iv = crypto.randomBytes(16); // Generate a random initialization vector
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);  // Create a cipher instance with the algorithm, key, and IV

    let encrypted = cipher.update(plaintext, "utf8", "hex"); // Encrypt the plaintext
    encrypted += cipher.final("hex"); // Finalise encryption
    
    const authTag = cipher.getAuthTag().toString("hex"); // Get the authentication tag for integrity verification
    return `${iv.toString("hex")}:${authTag}:${encrypted}`; // Return the IV, encrypted data, and auth tag as a single string
};

// decrypt data

const decrypt = (encryptedString) => {
    try {
        // Split the encrypted string into its components
        const [ivHex, authTagHex, encryptedData] = encryptedString.split(':'); 

        const iv = Buffer.from(ivHex, "hex"); // Convert IV from hex to buffer
        const authTag = Buffer.from(authTagHex, "hex"); // Convert auth tag from hex to buffer

        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);  // Create a decipher instance with the algorithm, key, and IV
        decipher.setAuthTag(authTag); // Set the authentication tag for integrity verification 
        
        let decrypted = decipher.update(encryptedData, "hex", "utf8"); // Decrypt the data
        decrypted += decipher.final("utf8"); // Finalise decryption

        return decrypted; // Return the decrypted plaintext
    } catch (error) {
        console.error("Decryption failed:", error);
        return null; // Return null if decryption fails
    }

};

module.exports = {
    encrypt,
    decrypt,
};
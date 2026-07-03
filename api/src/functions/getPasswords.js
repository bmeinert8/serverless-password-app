const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const crypto = require('crypto');

const connectionString = process.env.VaultStorageConnection;
const encryptionKey = process.env.DATA_ENCRYPTION_KEY;

// Helper to decrypt secrets pulled from Azure Table Storage
function decryptSecret(packedData, masterKeyHex) {
    const parts = packedData.split(':');
    if (parts.length !== 3) throw new Error("Invalid encrypted data format");

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    
    const key = Buffer.from(masterKeyHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

app.http('getPasswords', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            if (!connectionString) {
                throw new Error("Storage Connection String is missing");
            }
            if (!encryptionKey) {
                throw new Error('Data Encryption Key is missing');
            }

            const client = TableClient.fromConnectionString(connectionString, "pwstoragetable");
            
            // Query all entities in the partition "User1"
            const entities = client.listEntities({
                queryOptions: { filter: "PartitionKey eq 'User1'" }
            });

            const passwords = [];

            // Iterate through the results and decrypt on the fly
            for await (const entity of entities) {
                try {
                    const decryptedPassword = decryptSecret(entity.password, encryptionKey);
                    passwords.push({
                        name: entity.originalWebsiteName || entity.rowKey,
                        username: entity.username,
                        password: decryptedPassword // Send the clean password back to the frontend
                    });
                } catch (decryptionError) {
                    context.error(`Failed to decrypt password for ${entity.rowKey}`, decryptionError);
                }
            }

            return { 
                status: 200, 
                body: JSON.stringify(passwords) 
            };

        } catch (error) {
            context.error("Get Passwords Error:", error);
            return { 
                status: 500, 
                body: JSON.stringify({ error: "Failed to fetch passwords" }) 
            };
        }
    }
});
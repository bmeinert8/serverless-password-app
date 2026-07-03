const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const crypto = require('crypto');

const connectionString = process.env.VaultStorageConnection;
const encryptionKey = process.env.DATA_ENCRYPTION_KEY; // We'll add this next

// Helper to encrypt secrets before sending to Azure Table Storage
function encryptSecret(text, masterKeyHex) {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(masterKeyHex, 'hex');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().hexSlice();

  // Return IV + AuthTag + Ciphertext packed together
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

app.http('savePassword', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const body = await request.json();
      const { website, username, password } = body;

      if (!website || !password) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'Website and Password are required' }),
        };
      }

      if (!connectionString) {
        throw new Error('Storage Connection String is missing');
      }

      if (!encryptionKey) {
        throw new Error('Data Encryption Key is missing');
      }

      const client = TableClient.fromConnectionString(
        connectionString,
        'pwstoragetable'
      );

      // Encrypt the plaintext password using AES-256
      const encryptedPassword = encryptSecret(password, encryptionKey);

      const newEntity = {
        partitionKey: 'User1',
        rowKey: website.toLowerCase().replace(/[^a-z0-9]/g, ''),
        originalWebsiteName: website,
        username: username || '',
        password: encryptedPassword, // Store the scrambled string, NOT the plain password
      };

      await client.upsertEntity(newEntity);

      return {
        status: 200,
        body: JSON.stringify({ message: `Saved password for ${website}` }),
      };
    } catch (error) {
      context.error('Save Password Error:', error);
      return {
        status: 500,
        body: JSON.stringify({
          error: 'Failed to save password',
          details: error.message,
        }),
      };
    }
  },
});
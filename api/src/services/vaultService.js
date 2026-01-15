const { SecretClient } = require('@azure/keyvault-secrets');

// 1. Define a simple "Token Credential" that Key Vault can use
// This tricks the Key Vault client into accepting our manually fetched token
class ManualTokenCredential {
  async getToken(scopes) {
    const endpoint = process.env.IDENTITY_ENDPOINT;
    const header = process.env.IDENTITY_HEADER;

    if (!endpoint || !header) {
      throw new Error(
        'SWA Identity Endpoint not found. Are we running in Azure?'
      );
    }

    console.log('--- MANUAL IDENTITY FETCH ---');
    // We manually ask the Azure SWA environment for a token
    // This bypasses the buggy library logic
    const response = await fetch(
      `${endpoint}?api-version=2019-08-01&resource=https://vault.azure.net`,
      {
        method: 'GET',
        headers: { 'X-IDENTITY-HEADER': header },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Identity Fetch Failed: ${response.status} - ${text}`);
    }

    const data = await response.json();
    console.log('Token received successfully via manual fetch.');

    // Return the token in the format Key Vault expects
    return {
      token: data.access_token,
      expiresOnTimestamp: Date.parse(data.expires_on),
    };
  }
}

// 2. Main Service Logic
async function getSecret(secretName) {
  const vaultUrl = process.env.KEY_VAULT_URL;

  try {
    if (!vaultUrl) {
      throw new Error('KEY_VAULT_URL environment variable is missing.');
    }

    console.log(`Connecting to Vault: ${vaultUrl}`);

    // Use our manual credential instead of the library one
    const credential = new ManualTokenCredential();
    const client = new SecretClient(vaultUrl, credential);

    console.log(`Fetching secret: ${secretName}...`);
    const secret = await client.getSecret(secretName);

    return secret.value;
  } catch (error) {
    console.error(`Vault Error (${secretName}):`, error.message);
    // If it crashes, we print the stack to help debug
    if (error.stack) console.error(error.stack);
    throw error;
  }
}

module.exports = { getSecret };

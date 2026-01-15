const { ManagedIdentityCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const vaultUrl = process.env.KEY_VAULT_URL;

// DEBUG: Print the Vault URL to the logs so we know the variable is working
console.log('--- VAULT SERVICE INIT ---');
console.log('Target Vault:', vaultUrl);

// ELI5: We use ManagedIdentityCredential directly because we know we are in Azure.
// This skips checking for VS Code, CLI, etc., which speeds up the login.
const credential = new ManagedIdentityCredential();

const client = new SecretClient(vaultUrl, credential);

async function getSecret(secretName) {
  try {
    if (!vaultUrl) {
      throw new Error('KEY_VAULT_URL environment variable is missing.');
    }
    console.log(`Fetching secret: ${secretName}...`);
    const secret = await client.getSecret(secretName);
    console.log('Secret fetched successfully.');
    return secret.value;
  } catch (error) {
    console.error(`Failed to fetch secret ${secretName}:`, error.message);
    throw error;
  }
}

module.exports = { getSecret };

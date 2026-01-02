const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const vaultUrl = process.env.KEY_VAULT_URL;
const credential = new DefaultAzureCredential();
const client = new SecretClient(vaultUrl, credential);

// Tool 1: Get any secret by name (Good for the Master PIN Hash)
async function getSecret(secretName) {
  try {
    const secret = await client.getSecret(secretName);
    return secret.value;
  } catch (error) {
    console.error(`Failed to fetch secret ${secretName}:`, error);
    throw error;
  }
}

// Tool 2: Get the connection string (Smart logic for Local vs Cloud)
async function getTableConnectionString() {
  // ELI5: If we are on your computer, use the "Local Note" (local.settings.json)
  if (process.env.VaultStorageConnection) {
    return process.env.VaultStorageConnection;
  }

  // ELI5: If we are in the Cloud, knock on the Vault's door
  return await getSecret('TableStorageConnectionString');
}

// Export both so the "Login Guard" can use them
module.exports = {
  getSecret,
  getTableConnectionString,
};

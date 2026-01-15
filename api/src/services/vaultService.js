// We don't need Azure SDKs anymore because Azure injects the secret for us!

async function getSecret(secretName) {
  // ELI5: Azure has already fetched the secret from the Vault
  // and placed it in this variable for us.
  const secretValue = process.env[secretName];

  console.log(`Checking for secret: ${secretName}`);

  if (!secretValue) {
    throw new Error(
      `Secret '${secretName}' not found in Environment Variables. Check your SWA settings.`
    );
  }

  return secretValue;
}

module.exports = { getSecret };

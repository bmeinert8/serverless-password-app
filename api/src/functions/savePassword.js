const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

// UPDATED: Using your custom environment variable name
const connectionString = process.env.VaultStorageConnection;

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

      // UPDATED: Using your custom table name "pwstoragetable"
      const client = TableClient.fromConnectionString(
        connectionString,
        'pwstoragetable'
      );

      const newEntity = {
        partitionKey: 'User1',
        rowKey: website.toLowerCase().replace(/[^a-z0-9]/g, ''),
        originalWebsiteName: website,
        username: username || '',
        password: password,
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

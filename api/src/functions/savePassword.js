const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

// Get the connection string from the environment variables
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

app.http('savePassword', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      // 1. Parse the incoming data
      const body = await request.json();
      const { website, username, password } = body;

      // Basic Validation
      if (!website || !password) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'Website and Password are required' }),
        };
      }

      // 2. Connect to the Table
      if (!connectionString) {
        throw new Error('Storage Connection String is missing');
      }

      const client = TableClient.fromConnectionString(
        connectionString,
        'passwords'
      );

      // 3. Create the Record (Entity)
      // PartitionKey: Groups data (we'll use 'User1' for now since it's a single-user app)
      // RowKey: The Unique ID for this specific item (the Website Name)
      const newEntity = {
        partitionKey: 'User1',
        rowKey: website.toLowerCase().replace(/[^a-z0-9]/g, ''), // Sanitize to make a valid ID
        originalWebsiteName: website,
        username: username || '',
        password: password,
      };

      // 4. Save to Azure
      // upsertEntity: Updates if it exists, inserts if it doesn't
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

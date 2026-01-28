const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

const connectionString = process.env.VaultStorageConnection;

app.http('deletePassword', {
  methods: ['POST', 'DELETE'], // Support both for flexibility
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const body = await request.json();
      const { website } = body;

      if (!website) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'Website Name is required' }),
        };
      }

      if (!connectionString) {
        throw new Error('Storage Connection String is missing');
      }

      const client = TableClient.fromConnectionString(
        connectionString,
        'pwstoragetable'
      );

      // CRITICAL: We must recreate the RowKey exactly how we saved it
      // (Lowercased and stripped of special characters)
      const rowKey = website.toLowerCase().replace(/[^a-z0-9]/g, '');

      console.log(`Deleting entity: User1 / ${rowKey}`);

      // The delete command requires PartitionKey and RowKey
      await client.deleteEntity('User1', rowKey);

      return {
        status: 200,
        body: JSON.stringify({ message: `Deleted ${website}` }),
      };
    } catch (error) {
      context.error('Delete Error:', error);
      return {
        status: 500,
        body: JSON.stringify({
          error: 'Failed to delete password',
          details: error.message,
        }),
      };
    }
  },
});

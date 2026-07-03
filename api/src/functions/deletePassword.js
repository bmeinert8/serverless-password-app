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

      // Try to delete the entity
      try {
          await client.deleteEntity('User1', rowKey);
      } catch (deleteErr) {
          // If the entity is already missing (404), treat it as a success!
          if (deleteErr.statusCode === 404) {
              return {
                  status: 200,
                  body: JSON.stringify({ message: `Password for ${website} was already deleted or not found.` }),
              };
          }
          // If it's a different error (e.g., network failure), throw it to the main catch block
          throw deleteErr;
      }

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
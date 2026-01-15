const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

const connectionString = process.env.VaultStorageConnection;

app.http('getPasswords', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            if (!connectionString) {
                throw new Error("Storage Connection String is missing");
            }

            const client = TableClient.fromConnectionString(connectionString, "pwstoragetable");
            
            // Query all entities in the partition "User1"
            const entities = client.listEntities({
                queryOptions: { filter: "PartitionKey eq 'User1'" }
            });

            const passwords = [];

            // Iterate through the results
            for await (const entity of entities) {
                passwords.push({
                    name: entity.originalWebsiteName || entity.rowKey,
                    username: entity.username,
                    password: entity.password
                });
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
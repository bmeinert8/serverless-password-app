const { app } = require('@azure/functions');
const bcrypt = require('bcryptjs');
const { getSecret } = require('../services/vaultService');

app.http('login', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const userPassword = body.password;

            if (!userPassword) {
                return { 
                    status: 400, 
                    body: JSON.stringify({ error: "Master Password is required" }) 
                };
            }

            // UPDATED: Now points to the exact name you used in the Azure CLI!
            const officialHash = await getSecret('MasterVaultSecret');

            if (!officialHash) {
                context.error("Key Vault failed to return the Master Hash.");
                return { 
                        status: 500, 
                        body: JSON.stringify({ error: "VAULT_CONFIGURATION_ERROR" }) 
                };
            }

            const isAuthenticated = await bcrypt.compare(userPassword, officialHash);

            if (isAuthenticated) {
                return { 
                    status: 200, 
                    body: JSON.stringify({ authenticated: true }) 
                };
            } else {
                return { 
                    status: 401, 
                    body: JSON.stringify({ 
                        authenticated: false, 
                        message: "Invalid Master Password"
                    }) 
                };
            }

        } catch (error) {
            context.error("Login endpoint crash:", error);
            return { 
                status: 500, 
                body: JSON.stringify({ 
                    error: "BACKEND_CRASH", 
                    message: error.message 
                }) 
            };
        }
    }
});
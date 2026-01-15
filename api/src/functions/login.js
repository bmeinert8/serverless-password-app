const { app } = require('@azure/functions');
const crypto = require('crypto');
const { getSecret } = require('../services/vaultService');

app.http('login', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const userPin = body.pin;

            if (!userPin) {
                return { status: 400, body: JSON.stringify({ error: "PIN is required" }) };
            }

            const userHash = crypto.createHash('sha256').update(userPin).digest('hex');
            const officialHash = await getSecret('MasterPINHash');

            if (userHash === officialHash) {
                return { 
                    status: 200, 
                    body: JSON.stringify({ authenticated: true }) 
                };
            } else {
                // DEBUGGING BLOCK: This tells us what the server is actually seeing
                return { 
                    status: 401, 
                    body: JSON.stringify({ 
                        authenticated: false, 
                        message: "Invalid PIN",
                        debug_info: {
                            user_sent_hash: userHash,
                            server_stored_length: officialHash ? officialHash.length : 0,
                            // Show first 10 chars to see if it's a Hash or the "@Microsoft" string
                            server_stored_preview: officialHash ? officialHash.substring(0, 10) : "UNDEFINED"
                        }
                    }) 
                };
            }

        } catch (error) {
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
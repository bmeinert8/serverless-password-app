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
        return {
          status: 400,
          body: JSON.stringify({ error: 'PIN is required' }),
        };
      }

      const userHash = crypto
        .createHash('sha256')
        .update(userPin)
        .digest('hex');

      // This line is the likely 500 error culprit
      const officialHash = await getSecret('MasterPINHash');

      if (userHash === officialHash) {
        return {
          status: 200,
          body: JSON.stringify({ authenticated: true }),
        };
      } else {
        return {
          status: 401,
          body: JSON.stringify({
            authenticated: false,
            message: 'Invalid PIN',
          }),
        };
      }
    } catch (error) {
      // This sends the SPECIFIC error (like "Access Denied") back to your browser
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'BACKEND_CRASH',
          message: error.message,
          stack: error.stack,
        }),
      };
    }
  },
});

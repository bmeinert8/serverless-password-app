const { app } = require('@azure/functions');
const crypto = require('crypto');
const { getSecret } = require('../services/vaultService');

app.http('login', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      // 1. Get the PIN from the user's request
      const body = await request.json();
      const userPin = body.pin;

      if (!userPin) {
        return { status: 400, body: 'PIN is required.' };
      }

      // 2. Turn the user's PIN into a hash (The meat grinder)
      const userHash = crypto
        .createHash('sha256')
        .update(userPin)
        .digest('hex');

      // 3. Get the "Official Hash" from the Vault
      const officialHash = await getSecret('MasterPINHash');

      // 4. Compare them
      if (userHash === officialHash) {
        context.log('Login successful!');
        return {
          status: 200,
          body: JSON.stringify({ message: 'Success!', authenticated: true }),
        };
      } else {
        context.log('Login failed: Incorrect PIN.');
        return {
          status: 401,
          body: JSON.stringify({
            message: 'Invalid PIN',
            authenticated: false,
          }),
        };
      }
    } catch (error) {
      context.error('Error during login:', error);
      return { status: 500, body: 'An internal error occurred.' };
    }
  },
});

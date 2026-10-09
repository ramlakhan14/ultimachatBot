export const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    authority: 'https://login.microsoftonline.com/common',
    redirectUri:
      process.env.MICROSOFT_REDIRECT_URI ||
      'http://localhost:3000/microsoft/callback',
  },
};

// import { EMAIL_HOST_TYPE } from '../enum/enum';

// const user = process.env.IMAP_USER || '';
// const accessToken = process.env.IMAP_ACCESS_TOKEN || '';
// const _build_XOAuth2_token = (user = '', access_token = '') =>
//   Buffer.from(
//     `user=${user}\x01auth=Bearer ${access_token}\x01\x01`,
//     'utf-8',
//   ).toString('base64');

// export const imapConfig = {
//   user: user,
//   xoauth2: _build_XOAuth2_token(user, accessToken),
//   host: EMAIL_HOST_TYPE.GOOGLE,
//   port: 993,
//   tls: true,
//   authType: 'XOAUTH2',
//   tlsOptions: {
//     rejectUnauthorized: false,
//   },
//   debug: (msg) => console.log('IMAP Debug:', msg),
// };

// export const imapPasswordConfig = {
//   user: process.env.SMTP_USER || '',
//   password: process.env.SMTP_PASSWORD || '',
//   host: process.env.SMTP_HOST || '',
//   port: 993,
//   tls: true,
//   authTimeout: 10000,
//   tlsOptions: {
//     rejectUnauthorized: false,
//   },
//   debug: (msg) => console.log('IMAP Password Auth Debug:', msg),
// };

import * as CryptoJS from 'crypto-js';
export class CryptoService {
  static encryptPasskey(passkey: string): string {
    const encryptedData = CryptoJS.AES.encrypt(
      passkey,
      process.env.ENCRYPTION_DECRYPTION_KEY,
    ).toString();
    return encryptedData;
  }

  static decryptPasskey(encryptedPasskey: string): string {
    const bytes = CryptoJS.AES.decrypt(
      encryptedPasskey,
      process.env.ENCRYPTION_DECRYPTION_KEY,
    );
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedData;
  }

  // static hashPasskey(passkey: string): string {
  //   return CryptoJS.SHA256(passkey).toString();
  // }
}

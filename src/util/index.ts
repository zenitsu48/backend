import crypto from 'crypto';
import { Types } from 'mongoose';
import { ENCRYPTION } from '../config';

export const numberFix = (number: number, decimal = 10): number => {
  return Number(Number(number).toFixed(decimal));
};

export const objectId = (id: string): Types.ObjectId => {
  return new Types.ObjectId(id);
};

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(ENCRYPTION.ivLength);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION.key),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + '::' + encrypted.toString('hex');
};

export const decrypt = (text: string): string => {
  try {
    const textParts = text.split('::');
    const iv = Buffer.from(textParts.shift() || '', 'hex');
    const encryptedText = Buffer.from(textParts.join('::'), 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION.key),
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return '';
  }
};

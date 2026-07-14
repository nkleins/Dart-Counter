import { customAlphabet } from 'nanoid';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
const makeSlug = customAlphabet(alphabet, 10);
const makeId = customAlphabet(alphabet, 16);

export const slug = (): string => makeSlug();
export const playerId = (): string => makeId();

/** BCrypt accepts at most 72 UTF-8 bytes, including multibyte characters. */
export const passwordByteLimitMessage = 'Password must be at most 72 UTF-8 bytes.';
export const fitsPasswordByteLimit = (value: string) => new TextEncoder().encode(value).length <= 72;

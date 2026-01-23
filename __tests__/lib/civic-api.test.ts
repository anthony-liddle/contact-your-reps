import { isValidZipCode } from '@/lib/civic-api';

describe('isValidZipCode', () => {
  describe('valid ZIP codes', () => {
    it('accepts 5-digit ZIP codes', () => {
      expect(isValidZipCode('12345')).toBe(true);
      expect(isValidZipCode('00000')).toBe(true);
      expect(isValidZipCode('99999')).toBe(true);
    });

    it('accepts ZIP+4 format', () => {
      expect(isValidZipCode('12345-6789')).toBe(true);
      expect(isValidZipCode('00000-0000')).toBe(true);
    });

    it('trims whitespace', () => {
      expect(isValidZipCode(' 12345 ')).toBe(true);
      expect(isValidZipCode('  12345-6789  ')).toBe(true);
    });
  });

  describe('invalid ZIP codes', () => {
    it('rejects ZIP codes with fewer than 5 digits', () => {
      expect(isValidZipCode('1234')).toBe(false);
      expect(isValidZipCode('123')).toBe(false);
      expect(isValidZipCode('1')).toBe(false);
    });

    it('rejects ZIP codes with more than 5 digits (without +4)', () => {
      expect(isValidZipCode('123456')).toBe(false);
      expect(isValidZipCode('1234567')).toBe(false);
    });

    it('rejects non-numeric characters', () => {
      expect(isValidZipCode('1234a')).toBe(false);
      expect(isValidZipCode('abcde')).toBe(false);
      expect(isValidZipCode('12-345')).toBe(false);
    });

    it('rejects empty strings', () => {
      expect(isValidZipCode('')).toBe(false);
      expect(isValidZipCode('   ')).toBe(false);
    });

    it('rejects invalid ZIP+4 formats', () => {
      expect(isValidZipCode('12345-678')).toBe(false);
      expect(isValidZipCode('12345-67890')).toBe(false);
      expect(isValidZipCode('1234-56789')).toBe(false);
    });
  });
});

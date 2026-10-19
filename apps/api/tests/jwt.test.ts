import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from '../src/utils/jwt';

describe('JWT utils (FR-03, FR-05)', () => {
  const payload = { userId: 1, identifier: '2026001', role: 'siswa' as const, name: 'Andi' };

  test('access token dapat ditandatangani & diverifikasi', () => {
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(1);
    expect(decoded.role).toBe('siswa');
    expect(decoded.identifier).toBe('2026001');
  });

  test('refresh token berbeda secret dari access token', () => {
    const refresh = signRefreshToken(payload);
    const decoded = verifyRefreshToken(refresh);
    expect(decoded.userId).toBe(1);
    // access secret tidak bisa membuka refresh token
    expect(() => verifyAccessToken(refresh)).toThrow();
  });

  test('token salah ditolak', () => {
    expect(() => verifyAccessToken('token-palsu')).toThrow();
  });
});

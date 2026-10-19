import { User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { comparePassword } from '../../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { logActivity } from '../../utils/audit';

export function toPublicUser(user: User) {
  return {
    id: user.id,
    identifier: user.identifier,
    name: user.name,
    email: user.email,
    role: user.role,
    classOrPosition: user.classOrPosition,
    isActive: user.isActive,
  };
}

export async function login(identifier: string, password: string) {
  const user = await prisma.user.findUnique({ where: { identifier } });
  if (!user || !comparePassword(password, user.passwordHash)) {
    throw new ApiError(401, 'NIS/NIP atau password salah');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'Akun Anda tidak aktif. Hubungi pustakawan.');
  }
  const payload = { userId: user.id, identifier: user.identifier, role: user.role, name: user.name };
  await logActivity(user.id, 'LOGIN', 'user', user.id);
  return {
    user: toPublicUser(user),
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function refresh(token: string) {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, 'Refresh token tidak valid atau kedaluwarsa');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) throw new ApiError(401, 'Akun tidak valid');
  const newPayload = { userId: user.id, identifier: user.identifier, role: user.role, name: user.name };
  return {
    user: toPublicUser(user),
    accessToken: signAccessToken(newPayload),
    refreshToken: signRefreshToken(newPayload),
  };
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'User tidak ditemukan');
  if (!comparePassword(currentPassword, user.passwordHash)) {
    throw new ApiError(400, 'Password saat ini salah');
  }
  const { hashPassword } = await import('../../utils/password');
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hashPassword(newPassword) } });
  await logActivity(userId, 'CHANGE_PASSWORD', 'user', userId);
}

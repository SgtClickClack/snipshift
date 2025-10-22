import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export interface UserJWTPayload {
  id: string;
  email: string;
  roles: string[];
  currentRole?: string;
  [key: string]: any; // Index signature for jose compatibility
}

export async function generateToken(payload: UserJWTPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return token;
}

export async function generateRefreshToken(payload: { id: string }): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);

  return token;
}

export async function verifyToken(token: string): Promise<UserJWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as UserJWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export async function verifyRefreshToken(token: string): Promise<{ id: string }> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { id: payload.id as string };
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

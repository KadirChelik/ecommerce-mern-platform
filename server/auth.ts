import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import type { AuthUser, UserRole } from '../shared/types.js';

const DEMO_USERS: Record<UserRole, AuthUser> = {
  customer: {
    id: 'usr-customer-demo',
    name: 'Selin Demir',
    email: 'selin.demir@example.com',
    role: 'customer',
  },
  admin: {
    id: 'usr-admin-demo',
    name: 'Kadir Çelik (Studio Admin)',
    email: 'admin@hannstudio.com',
    role: 'admin',
  },
};

let cachedEphemeralSecret: string | null = null;

function hasConfiguredMongoUri(): boolean {
  return Boolean(
    process.env.MONGODB_URI?.trim() ||
      process.env.DATABASE_URL?.trim() ||
      process.env.MONGO_URI?.trim(),
  );
}

export function isDemoAuthEnabled(): boolean {
  const explicit = process.env.ALLOW_DEMO_AUTH?.trim().toLowerCase();
  if (explicit === 'false') return false;
  return true;
}

function getJwtSecret(): string {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured) return configured;

  if (process.env.NODE_ENV === 'production' && hasConfiguredMongoUri()) {
    throw new Error('JWT_SECRET environment variable is required in production with MongoDB');
  }

  if (!cachedEphemeralSecret) {
    // Deterministic per demo deployment when Vercel splits cold starts, random fallback otherwise
    const deploymentSeed = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL;
    cachedEphemeralSecret = deploymentSeed
      ? crypto.createHash('sha256').update(`hann-demo:${deploymentSeed}`).digest('hex')
      : crypto.randomBytes(32).toString('hex');
  }
  return cachedEphemeralSecret;
}

export function getDemoUser(role: UserRole): AuthUser {
  return DEMO_USERS[role];
}

export function signAuthToken(user: AuthUser): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: '7d' },
  );
}

export function verifyAuthToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload;
    if (!decoded || typeof decoded.sub !== 'string' || (decoded.role !== 'customer' && decoded.role !== 'admin')) {
      return null;
    }
    return {
      id: decoded.sub,
      name: typeof decoded.name === 'string' ? decoded.name : 'HANN User',
      email: typeof decoded.email === 'string' ? decoded.email : 'guest@hannstudio.com',
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
}

export function attachOptionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const user = verifyAuthToken(header.slice(7).trim());
    if (user) {
      req.authUser = user;
    }
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const user = verifyAuthToken(header.slice(7).trim());
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  req.authUser = user;
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.authUser?.role !== 'admin') {
      res.status(403).json({ error: 'Admin role required' });
      return;
    }
    next();
  });
}

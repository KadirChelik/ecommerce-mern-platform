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

function getJwtSecret(): string {
  return process.env.JWT_SECRET?.trim() || 'hann-studio-dev-ephemeral-secret';
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

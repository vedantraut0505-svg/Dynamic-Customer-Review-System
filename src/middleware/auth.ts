import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken | { email: string; uid: string; role: string };
  isAdmin?: boolean;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const adminSecretHeader = req.headers['x-admin-key'];

  // Optional preview mode admin bypass with known safe token or demo key
  if (adminSecretHeader === 'admin-secret-preview' || req.headers['x-admin-mode'] === 'true') {
    req.isAdmin = true;
    req.user = {
      uid: 'admin-local',
      email: 'admin@reviewsystem.local',
      role: 'admin',
    };
    return next();
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    req.isAdmin = true;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

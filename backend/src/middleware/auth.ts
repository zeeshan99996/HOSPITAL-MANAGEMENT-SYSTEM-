import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';

const FALLBACK_JWT_SECRET = 'lifeflow_jwt_secret_token_key_for_hms_application_2026';

if (!process.env.JWT_SECRET) {
  console.warn(
    '[SECURITY WARNING] JWT_SECRET environment variable is not set. ' +
    'Using an insecure hardcoded fallback secret. ' +
    'Set JWT_SECRET in your .env file before deploying to production.'
  );
}

const JWT_SECRET = process.env.JWT_SECRET || FALLBACK_JWT_SECRET;

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'admin' | 'doctor' | 'receptionist' | 'nurse' | 'lab_technician' | 'pharmacist' | 'accountant' | 'patient';
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      role: 'admin' | 'doctor' | 'receptionist' | 'nurse' | 'lab_technician' | 'pharmacist' | 'accountant' | 'patient';
    };

    const user = await User.findByPk(decoded.id);
    if (!user || user.status === 'inactive') {
      return res.status(403).json({ message: 'User is inactive or deleted.' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

export const requireRoles = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Requires one of the following roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

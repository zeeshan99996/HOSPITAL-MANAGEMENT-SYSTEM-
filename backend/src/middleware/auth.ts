import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, SystemUser } from '../models';

const FALLBACK_JWT_SECRET = 'gDLDNJmOYTXFfmXWGCxR2CvkHbLzK0bBr/JzogRSgu57TSc6/iu8Y6pux0gTtRz8gmCSq/jx7j9oDevhUcHIZA==';
const JWT_SECRET = process.env.JWT_SECRET || FALLBACK_JWT_SECRET;

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'admin' | 'doctor' | 'receptionist' | 'nurse' | 'lab_technician' | 'pharmacist' | 'accountant' | 'patient';
  };
}

export const PERMISSION_MATRIX: Record<string, string[]> = {
  admin: ['*'],
  doctor: [
    'patients:read', 'patients:write',
    'prescriptions:create', 'prescriptions:read',
    'lab:request', 'vitals:read'
  ],
  nurse: [
    'patients:read', 'vitals:write',
    'admissions:read', 'admissions:update'
  ],
  receptionist: [
    'patients:read', 'patients:create',
    'appointments:manage', 'tokens:manage'
  ],
  accountant: [
    'billing:read', 'billing:create',
    'expenses:manage', 'payroll:read'
  ],
  pharmacist: [
    'medicines:read', 'medicines:update_stock',
    'sales:record'
  ],
  lab_technician: [
    'lab:read', 'lab:update'
  ],
  patient: [
    'profile:read'
  ]
};

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  // Support both HttpOnly cookie and Bearer header
  const token = req.cookies?.hms_token || (authHeader && authHeader.split(' ')[1]);

  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing.' });
  }

  try {
    let decoded: any = null;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(403).json({ message: 'Invalid or expired authentication token.' });
    }

    const userIdNum = decoded.id ? Number(decoded.id) : null;
    const userEmail = decoded.email ? String(decoded.email).trim().toLowerCase() : null;

    let user: any = null;
    if (userEmail) {
      user = await SystemUser.findOne({ where: { email: userEmail } });
      if (!user) user = await User.findOne({ where: { email: userEmail } });
    }
    if (!user && userIdNum) {
      user = await SystemUser.findByPk(userIdNum);
      if (!user) user = await User.findByPk(userIdNum);
    }

    if (!user || user.status === 'inactive') {
      return res.status(403).json({ message: 'User account is inactive, suspended, or not registered in database.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as any,
    };
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired authentication token.' });
  }
};

export const requireRoles = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const allowedRoles = roles.map(r => r.toLowerCase());

    if (allowedRoles.includes('all') || allowedRoles.includes(userRole) || userRole === 'admin') {
      return next();
    }

    return res.status(403).json({
      message: `Access denied. Requires one of the following roles: ${roles.join(', ')}`,
    });
  };
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const permissions = PERMISSION_MATRIX[userRole] || [];

    if (permissions.includes('*') || permissions.includes(permission) || userRole === 'admin') {
      return next();
    }

    return res.status(403).json({
      message: `Access denied. Action requires '${permission}' permission.`,
    });
  };
};

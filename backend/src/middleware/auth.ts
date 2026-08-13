import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, SystemUser } from '../models';
import { supabaseAdmin } from '../config/supabase';

const FALLBACK_JWT_SECRET = 'gDLDNJmOYTXFfmXWGCxR2CvkHbLzK0bBr/JzogRSgu57TSc6/iu8Y6pux0gTtRz8gmCSq/jx7j9oDevhUcHIZA==';
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || FALLBACK_JWT_SECRET;

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    supabase_user_id?: string | null;
    email: string;
    role: 'admin' | 'doctor' | 'receptionist' | 'nurse' | 'lab_technician' | 'pharmacist' | 'accountant' | 'patient';
  };
  supabaseUser?: any;
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
    let supabaseUserId: string | null = null;
    let userEmail: string | null = null;
    let userIdNum: number | null = null;

    // 1. Check Supabase Auth API
    try {
      const { data: { user: sbUser } } = await supabaseAdmin.auth.getUser(token);
      if (sbUser) {
        supabaseUserId = sbUser.id;
        userEmail = sbUser.email || null;
        req.supabaseUser = sbUser;
      }
    } catch (sbErr) {}

    // 2. Verify JWT payload
    if (!supabaseUserId) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userIdNum = decoded.id ? Number(decoded.id) : null;
        supabaseUserId = decoded.sub || null;
        userEmail = decoded.email || null;
      } catch (jwtErr) {
        return res.status(403).json({ message: 'Invalid or expired authentication token.' });
      }
    }

    // 3. Match user in Hostinger MySQL / SystemUsers database
    let user: any = null;
    if (supabaseUserId) {
      user = await SystemUser.findOne({ where: { supabase_user_id: supabaseUserId } });
      if (!user) user = await User.findOne({ where: { supabase_user_id: supabaseUserId } });
    }
    if (!user && userIdNum) {
      user = await SystemUser.findByPk(userIdNum);
      if (!user) user = await User.findByPk(userIdNum);
    }
    if (!user && userEmail) {
      const normEmail = userEmail.toLowerCase().trim();
      user = await SystemUser.findOne({ where: { email: normEmail } });
      if (!user) user = await User.findOne({ where: { email: normEmail } });
      if (user && supabaseUserId && !user.supabase_user_id) {
        try { await user.update({ supabase_user_id: supabaseUserId }); } catch (e) {}
      }
    }

    if (!user || user.status === 'inactive') {
      return res.status(403).json({ message: 'User account is inactive, suspended, or not registered in MySQL database.' });
    }

    req.user = {
      id: user.id,
      supabase_user_id: user.supabase_user_id,
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

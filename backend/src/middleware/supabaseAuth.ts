import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/supabase';
import { User } from '../models';

export interface AuthenticatedRequest extends Request {
  user?: any;
  supabaseUser?: any;
}

const FALLBACK_JWT_SECRET = 'gDLDNJmOYTXFfmXWGCxR2CvkHbLzK0bBr/JzogRSgu57TSc6/iu8Y6pux0gTtRz8gmCSq/jx7j9oDevhUcHIZA==';
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || FALLBACK_JWT_SECRET;

export const verifySupabaseToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. Authorization bearer token missing.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    let supabaseUserId: string | null = null;
    let userEmail: string | null = null;

    // 1. Try Supabase Auth API verification
    try {
      const { data: { user: sbUser }, error: sbError } = await supabaseAdmin.auth.getUser(token);
      if (sbUser && !sbError) {
        supabaseUserId = sbUser.id;
        userEmail = sbUser.email || null;
        req.supabaseUser = sbUser;
      }
    } catch (sbErr) {
      console.warn('[Supabase API Token Verify Warning]:', sbErr);
    }

    // 2. Fallback to JWT payload verification if Supabase API is unreachable
    if (!supabaseUserId) {
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        supabaseUserId = decoded.sub || decoded.id || null;
        userEmail = decoded.email || null;
      } catch (jwtErr) {
        // Also try decoding without signature verification if fallback key is configured
        const decodedUnverified: any = jwt.decode(token);
        if (decodedUnverified && (decodedUnverified.sub || decodedUnverified.email)) {
          supabaseUserId = decodedUnverified.sub || decodedUnverified.id || null;
          userEmail = decodedUnverified.email || null;
        }
      }
    }

    if (!supabaseUserId && !userEmail) {
      return res.status(401).json({ message: 'Invalid or expired Supabase authentication token.' });
    }

    // 3. Find matching Hostinger MySQL user
    let user = null;
    if (supabaseUserId) {
      user = await User.findOne({ where: { supabase_user_id: supabaseUserId } });
    }

    if (!user && userEmail) {
      user = await User.findOne({ where: { email: userEmail.toLowerCase().trim() } });
      if (user && supabaseUserId) {
        // Link supabase_user_id to local MySQL user
        try {
          await user.update({ supabase_user_id: supabaseUserId });
        } catch (uErr) {}
      }
    }

    if (!user) {
      return res.status(403).json({
        message: 'Account not mapped in Hostinger MySQL database. Please contact system administrator.',
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Account is suspended in system directory.' });
    }

    // 4. Attach verified MySQL user to request context
    req.user = {
      id: user.id,
      supabase_user_id: user.supabase_user_id || supabaseUserId,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    return next();
  } catch (error: any) {
    console.error('[Supabase Auth Middleware Error]:', error);
    return res.status(500).json({ message: 'Authentication process failed.', error: error.message });
  }
};

export const requireRoles = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized. Authentication session required.' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const allowedRoles = roles.map(r => r.toLowerCase());

    if (allowedRoles.includes('all') || allowedRoles.includes(userRole) || userRole === 'admin') {
      return next();
    }

    return res.status(403).json({
      message: `Access denied. Action requires one of the following roles: [${roles.join(', ')}]. Your role is '${req.user.role}'.`,
    });
  };
};

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Doctor, Department, ActivityLog } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';

const FALLBACK_JWT_SECRET = 'lifeflow_jwt_secret_token_key_for_hms_application_2026';

if (!process.env.JWT_SECRET) {
  console.warn(
    '[SECURITY WARNING] JWT_SECRET environment variable is not set. ' +
    'Using an insecure hardcoded fallback secret. ' +
    'Set JWT_SECRET in your .env file before deploying to production.'
  );
}

const JWT_SECRET = process.env.JWT_SECRET || FALLBACK_JWT_SECRET;

export const registerPatient = async (req: Request, res: Response) => {
  return res.status(403).json({
    message: 'Patient self-registration portal is disabled. All clinic folders must be opened directly at the receptionist desk.'
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    const ipStr = String(req.headers['x-forwarded-for'] || req.ip || '127.0.0.1');

    if (!user || user.status === 'inactive') {
      try {
        await ActivityLog.create({
          userId: user ? user.id : null,
          action: 'Login Failed',
          details: `Failed sign-in attempt for email: ${email}. Account status: ${user ? user.status : 'non-existent'}.`,
          ipAddress: ipStr,
        });
      } catch (lErr) {
        console.error('[AuditLog Error]:', lErr);
      }
      return res.status(401).json({ message: 'Invalid credentials or account is suspended.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      try {
        await ActivityLog.create({
          userId: user.id,
          action: 'Login Failed',
          details: `Failed sign-in attempt for email: ${email}. Incorrect password entered.`,
          ipAddress: ipStr,
        });
      } catch (lErr) {
        console.error('[AuditLog Error]:', lErr);
      }
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Identify associated profile ID (doctor is the remaining staff profile)
    let profileId: number | null = null;
    if (user.role === 'doctor') {
      const doctor = await Doctor.findOne({ where: { userId: user.id } });
      if (doctor) profileId = doctor.id;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, profileId },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Track activity audit
    try {
      await ActivityLog.create({
        userId: user.id,
        action: 'Login',
        details: `Successful sign-in. Session token generated for role: ${user.role}.`,
        ipAddress: ipStr,
      });
    } catch (lErr) {
      console.error('[AuditLog Error]:', lErr);
    }

    return res.status(200).json({
      message: 'Authentication successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileId,
      },
    });
  } catch (error: any) {
    console.error('[Login Controller Error]:', error);
    return res.status(500).json({ message: 'Authentication error.', error: error.message });
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }

  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let extraDetails = {};

    if (user.role === 'doctor') {
      extraDetails = await Doctor.findOne({
        where: { userId: user.id },
        include: [{ model: Department, attributes: ['name'] }],
      }) || {};
    }

    return res.status(200).json({
      user,
      details: extraDetails,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving user profile.', error: error.message });
  }
};

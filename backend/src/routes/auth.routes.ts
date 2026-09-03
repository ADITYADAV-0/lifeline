import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { buildDefaultProfile } from '../utils/defaultProfile';
import { signToken } from '../utils/token';
import { serializeUser } from '../utils/serialize';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();
const VALID_ROLES: UserRole[] = ['citizen', 'ambulance', 'BloodBank', 'government'];
const SALT_ROUNDS = 10;

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, role, name } = req.body ?? {};

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'email, password, name, and role are required.' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await UserModel.create({
      email: normalizedEmail,
      passwordHash,
      name: String(name).trim(),
      role,
      profile: buildDefaultProfile(),
    });

    const token = signToken({ userId: user._id.toString() });
    return res.status(201).json({ token, user: serializeUser(user) });
  } catch (error) {
    console.error('[auth/signup] error', error);
    return res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
});

// POST /api/auth/signin
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await UserModel.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'No account found with this email.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const token = signToken({ userId: user._id.toString() });
    return res.json({ token, user: serializeUser(user) });
  } catch (error) {
    console.error('[auth/signin] error', error);
    return res.status(500).json({ error: 'Something went wrong signing you in.' });
  }
});

// GET /api/auth/session — validates the bearer token and returns the current user.
// This is what the frontend's getActiveSession() should call on app launch.
router.get('/session', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(401).json({ error: 'Session user no longer exists.' });
    }
    return res.json({ user: serializeUser(user) });
  } catch (error) {
    console.error('[auth/session] error', error);
    return res.status(500).json({ error: 'Could not verify session.' });
  }
});

// POST /api/auth/signout — JWTs are stateless, so this is a no-op on the server;
// it exists for API symmetry. The client just deletes the stored token.
router.post('/signout', requireAuth, async (_req, res) => {
  return res.status(204).send();
});

export default router;

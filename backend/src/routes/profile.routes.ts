import { Router } from 'express';
import { UserModel } from '../models/User';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { serializeUser } from '../utils/serialize';

const router = Router();

// GET /api/profile — the signed-in user's own medical profile.
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const user = await UserModel.findById(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  return res.json({ user: serializeUser(user) });
});

// PATCH /api/profile — partial update of the medical profile
// (vitals, conditions, meds, emergency contacts, etc.).
router.patch('/', requireAuth, async (req: AuthedRequest, res) => {
  const updates = req.body?.profile;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Request body must include a "profile" object.' });
  }

  const user = await UserModel.findById(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  user.profile = { ...user.profile, ...updates };
  await user.save();

  return res.json({ user: serializeUser(user) });
});

export default router;

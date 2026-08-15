
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { FacilityModel } from '../models/Facility';

const router = Router();

const VALID_TYPES = [
  'Hospital',
  'Pharmacy',
  'Ambulance',
  'Urgent Care',
] as const;

type FacilityType = (typeof VALID_TYPES)[number];

function isFacilityType(value: unknown): value is FacilityType {
  return (
    typeof value === 'string' &&
    (VALID_TYPES as readonly string[]).includes(value)
  );
}

// GET /api/facilities
// Optional ?type=Hospital|Pharmacy|Ambulance|Urgent Care filter.
router.get('/', requireAuth, async (req, res) => {
  const { type } = req.query;

  if (type !== undefined && !isFacilityType(type)) {
    return res.status(400).json({
      error: `type must be one of: ${VALID_TYPES.join(', ')}`,
    });
  }

  const facilities = await FacilityModel.find(
    isFacilityType(type) ? { type } : {}
  ).lean();

  return res.json({ facilities });
});

export default router;

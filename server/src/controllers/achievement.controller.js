import { asyncHandler } from '../utils/asyncHandler.js';
import { ACHIEVEMENTS, evaluateAchievements } from '../utils/achievements.js';

// Also runs a fresh evaluation on every fetch — cheap, and it means an
// achievement met before this feature even existed (or between actions) is
// still picked up the next time the user checks, no backfill script needed.
export const getAchievements = asyncHandler(async (req, res) => {
  const { unlocked } = await evaluateAchievements(req.userId);
  const unlockedMap = new Map(unlocked.map((u) => [u.code, u.unlockedAt]));

  const achievements = ACHIEVEMENTS.map((a) => ({
    code: a.code,
    title: a.title,
    description: a.description,
    unlocked: unlockedMap.has(a.code),
    unlockedAt: unlockedMap.get(a.code) || null,
  }));

  res.json({ achievements });
});

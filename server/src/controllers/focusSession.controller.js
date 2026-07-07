import { FocusSession } from '../models/FocusSession.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { evaluateAchievements } from '../utils/achievements.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export const createFocusSession = asyncHandler(async (req, res) => {
  const { goal = '', videoId = null, minutes } = req.body;

  // A plain read-modify-write .save() here would lose updates under
  // concurrent requests (two tabs, a retried request) — both would read the
  // same starting totalFocusMinutes and the second save would clobber the
  // first's increment. $inc is atomic at the DB level, so it's always
  // correct regardless of how many requests land at once.
  await User.updateOne(
    { _id: req.userId },
    { $inc: { 'focusStats.totalFocusMinutes': minutes } }
  );

  const today = dateKey(new Date());
  const yesterday = dateKey(new Date(Date.now() - DAY_MS));

  let user = await User.findById(req.userId).select('focusStats');
  if (!user) throw new ApiError(404, 'User not found');

  // The streak only ever needs to transition once per calendar day. Guard
  // the write with the lastFocusDate this request observed: if a concurrent
  // request already advanced it first, this conditional update simply won't
  // match (no double-increment), and the re-read below picks up its result.
  if (user.focusStats.lastFocusDate !== today) {
    const nextStreak =
      user.focusStats.lastFocusDate === yesterday ? user.focusStats.currentStreak + 1 : 1;
    await User.updateOne(
      { _id: req.userId, 'focusStats.lastFocusDate': user.focusStats.lastFocusDate },
      {
        $set: {
          'focusStats.currentStreak': nextStreak,
          'focusStats.longestStreak': Math.max(user.focusStats.longestStreak, nextStreak),
          'focusStats.lastFocusDate': today,
        },
      }
    );
    user = await User.findById(req.userId).select('focusStats');
  }

  const session = await FocusSession.create({
    user: req.userId,
    video: videoId,
    goal,
    minutes,
  });

  res.status(201).json({ session, stats: user.focusStats });
  evaluateAchievements(req.userId).catch(() => {});
});

export const getFocusStats = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select('focusStats');
  if (!user) throw new ApiError(404, 'User not found');

  const todaySessions = await FocusSession.find({
    user: req.userId,
    createdAt: { $gte: startOfTodayUTC() },
  }).select('minutes');
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0);

  res.json({ ...user.focusStats.toObject(), todayMinutes });
});

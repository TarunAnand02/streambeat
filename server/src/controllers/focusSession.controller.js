import { FocusSession } from '../models/FocusSession.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

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

  const user = await User.findById(req.userId);
  if (!user) throw new ApiError(404, 'User not found');

  const today = dateKey(new Date());
  const yesterday = dateKey(new Date(Date.now() - DAY_MS));
  const stats = user.focusStats || {};

  let currentStreak = stats.currentStreak || 0;
  if (stats.lastFocusDate === today) {
    // Already logged a session today — streak day is already counted.
  } else if (stats.lastFocusDate === yesterday) {
    currentStreak += 1;
  } else {
    currentStreak = 1;
  }

  user.focusStats = {
    currentStreak,
    longestStreak: Math.max(stats.longestStreak || 0, currentStreak),
    lastFocusDate: today,
    totalFocusMinutes: (stats.totalFocusMinutes || 0) + minutes,
  };
  await user.save();

  const session = await FocusSession.create({
    user: req.userId,
    video: videoId,
    goal,
    minutes,
  });

  res.status(201).json({ session, stats: user.focusStats });
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

import { AuditLog } from '../../models/AuditLog.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const PAGE_SIZE = 50;

export const listActivityLogs = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.actor) filter.actor = req.query.actor;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actor', 'username')
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ logs, page, total, pages: Math.ceil(total / PAGE_SIZE) });
});

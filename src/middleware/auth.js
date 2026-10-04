'use strict';
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'openflashcards_secret_change_me';
const SINGLE_USER_MODE = process.env.SINGLE_USER_MODE !== 'false';

function requireAuth(req, res, next) {
  if (SINGLE_USER_MODE) {
    req.user = { id: 'local', username: '本机用户', role: 'user' };
    return next();
  }
  const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' });
}

module.exports = { requireAuth, requireAdmin, signToken };

const express = require('express');
const router = express.Router();
const { register, login, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authLimiter,
  validate({
    email: { required: true, type: 'email' },
    password: { required: true, minLength: 8, maxLength: 128 },
  }),
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login and receive JWT
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  validate({
    email: { required: true, type: 'email' },
    password: { required: true },
  }),
  login
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', authenticate, me);

module.exports = router;

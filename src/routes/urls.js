const express = require('express');
const router = express.Router();
const {
  createUrl,
  getMyUrls,
  getUrlStats,
  updateUrl,
  deleteUrl,
} = require('../controllers/urlController');
const { authenticate } = require('../middleware/auth');
const { createUrlLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');

// All URL routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/urls
 * @desc    Create a new short URL
 * @access  Private
 */
router.post(
  '/',
  createUrlLimiter,
  validate({
    original_url: { required: true, type: 'url' },
  }),
  createUrl
);

/**
 * @route   GET /api/urls
 * @desc    Get all URLs for the authenticated user (paginated)
 * @access  Private
 */
router.get('/', getMyUrls);

/**
 * @route   GET /api/urls/:id/stats
 * @desc    Get click stats for a URL
 * @access  Private
 */
router.get('/:id/stats', getUrlStats);

/**
 * @route   PATCH /api/urls/:id
 * @desc    Update a URL (toggle active, set expiry)
 * @access  Private
 */
router.patch('/:id', updateUrl);

/**
 * @route   DELETE /api/urls/:id
 * @desc    Delete a URL
 * @access  Private
 */
router.delete('/:id', deleteUrl);

module.exports = router;

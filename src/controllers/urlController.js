const Url = require('../models/Url');
const Click = require('../models/Click');

const createUrl = async (req, res) => {
  try {
    const { original_url, expires_at, custom_code } = req.body;

    // If custom code provided, check it isn't taken
    if (custom_code) {
      const existing = await Url.findByShortCode(custom_code);
      if (existing) {
        return res.status(409).json({
          error: 'Conflict',
          message: `The custom code "${custom_code}" is already taken.`,
        });
      }
    }

    const url = await Url.create({
      userId: req.user.id,
      originalUrl: original_url,
      expiresAt: expires_at || null,
      customCode: custom_code || null,
    });

    const shortUrl = `${process.env.BASE_URL}/${url.short_code}`;

    return res.status(201).json({
      message: 'Short URL created.',
      data: { ...url, short_url: shortUrl },
    });
  } catch (err) {
    console.error('Create URL error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create URL.' });
  }
};

const getMyUrls = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [urls, total] = await Promise.all([
      Url.findByUser(req.user.id, { limit, offset }),
      Url.countByUser(req.user.id),
    ]);

    const baseUrl = process.env.BASE_URL;
    const enriched = urls.map((u) => ({
      ...u,
      short_url: `${baseUrl}/${u.short_code}`,
      is_expired: Url.isExpired(u),
    }));

    return res.status(200).json({
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get URLs error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getUrlStats = async (req, res) => {
  try {
    const url = await Url.findById(req.params.id);

    if (!url) {
      return res.status(404).json({ error: 'Not Found', message: 'URL not found.' });
    }

    if (url.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not own this URL.' });
    }

    const stats = await Click.getStats(url.id);

    return res.status(200).json({
      data: {
        url: {
          ...url,
          short_url: `${process.env.BASE_URL}/${url.short_code}`,
          is_expired: Url.isExpired(url),
        },
        stats,
      },
    });
  } catch (err) {
    console.error('Get stats error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const updateUrl = async (req, res) => {
  try {
    const { is_active, expires_at } = req.body;
    const updated = await Url.update(req.params.id, req.user.id, { is_active, expires_at });

    if (!updated) {
      return res.status(404).json({ error: 'Not Found', message: 'URL not found or not owned by you.' });
    }

    return res.status(200).json({ message: 'URL updated.', data: updated });
  } catch (err) {
    console.error('Update URL error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const deleteUrl = async (req, res) => {
  try {
    const deleted = await Url.delete(req.params.id, req.user.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Not Found', message: 'URL not found or not owned by you.' });
    }

    return res.status(200).json({ message: 'URL deleted successfully.' });
  } catch (err) {
    console.error('Delete URL error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Public redirect handler
const redirect = async (req, res) => {
  try {
    const { shortCode } = req.params;
    const url = await Url.findByShortCode(shortCode);

    if (!url) {
      return res.status(404).json({ error: 'Not Found', message: 'Short URL not found.' });
    }

    if (!url.is_active) {
      return res.status(410).json({ error: 'Gone', message: 'This short URL has been deactivated.' });
    }

    if (Url.isExpired(url)) {
      return res.status(410).json({ error: 'Gone', message: 'This short URL has expired.' });
    }

    // Record the click asynchronously (don't await - don't slow down redirect)
    Click.record({
      urlId: url.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'] || null,
    }).catch((err) => console.error('Click record error:', err));

    return res.redirect(301, url.original_url);
  } catch (err) {
    console.error('Redirect error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { createUrl, getMyUrls, getUrlStats, updateUrl, deleteUrl, redirect };

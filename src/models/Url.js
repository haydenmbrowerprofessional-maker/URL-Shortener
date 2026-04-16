const { query } = require('../config/database');
const { nanoid } = require('nanoid');

class Url {
  static async create({ userId, originalUrl, expiresAt = null, customCode = null }) {
    const shortCode = customCode || nanoid(7);

    const result = await query(
      `INSERT INTO urls (user_id, original_url, short_code, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, original_url, short_code, expires_at, is_active, created_at`,
      [userId, originalUrl, shortCode, expiresAt]
    );
    return result.rows[0];
  }

  static async findByShortCode(shortCode) {
    const result = await query(
      `SELECT id, user_id, original_url, short_code, expires_at, is_active, created_at
       FROM urls WHERE short_code = $1`,
      [shortCode]
    );
    return result.rows[0] || null;
  }

  static async findById(id) {
    const result = await query(
      `SELECT id, user_id, original_url, short_code, expires_at, is_active, created_at
       FROM urls WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByUser(userId, { limit = 20, offset = 0 } = {}) {
    const result = await query(
      `SELECT u.id, u.original_url, u.short_code, u.expires_at, u.is_active, u.created_at,
              COUNT(c.id)::int AS click_count
       FROM urls u
       LEFT JOIN clicks c ON c.url_id = u.id
       WHERE u.user_id = $1
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  static async countByUser(userId) {
    const result = await query(
      `SELECT COUNT(*)::int AS total FROM urls WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0].total;
  }

  static async update(id, userId, fields) {
    const allowed = ['is_active', 'expires_at'];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(fields)) {
      if (allowed.includes(key)) {
        updates.push(`${key} = $${idx++}`);
        values.push(val);
      }
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = NOW()`);
    values.push(id, userId);

    const result = await query(
      `UPDATE urls SET ${updates.join(', ')}
       WHERE id = $${idx++} AND user_id = $${idx}
       RETURNING id, original_url, short_code, expires_at, is_active, updated_at`,
      values
    );
    return result.rows[0] || null;
  }

  static async delete(id, userId) {
    const result = await query(
      `DELETE FROM urls WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );
    return result.rows[0] || null;
  }

  static isExpired(url) {
    if (!url.expires_at) return false;
    return new Date(url.expires_at) < new Date();
  }
}

module.exports = Url;

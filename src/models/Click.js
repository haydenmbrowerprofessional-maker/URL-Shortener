const { query } = require('../config/database');

class Click {
  static async record({ urlId, ipAddress, userAgent, referer }) {
    const result = await query(
      `INSERT INTO clicks (url_id, ip_address, user_agent, referer)
       VALUES ($1, $2, $3, $4) RETURNING id, clicked_at`,
      [urlId, ipAddress || null, userAgent || null, referer || null]
    );
    return result.rows[0];
  }

  static async getStats(urlId) {
    const [totalResult, dailyResult, recentResult] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total FROM clicks WHERE url_id = $1`, [urlId]),
      query(
        `SELECT DATE(clicked_at) AS date, COUNT(*)::int AS count
         FROM clicks WHERE url_id = $1 AND clicked_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(clicked_at) ORDER BY date`,
        [urlId]
      ),
      query(
        `SELECT ip_address, user_agent, referer, clicked_at
         FROM clicks WHERE url_id = $1
         ORDER BY clicked_at DESC LIMIT 10`,
        [urlId]
      ),
    ]);

    return {
      total: totalResult.rows[0].total,
      dailyBreakdown: dailyResult.rows,
      recentClicks: recentResult.rows,
    };
  }
}

module.exports = Click;

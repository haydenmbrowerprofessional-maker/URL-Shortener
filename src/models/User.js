const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ email, password }) {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await query(
      `INSERT INTO users (email, password) VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [email.toLowerCase(), hashedPassword]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await query(
      `SELECT id, email, password, created_at FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    return result.rows[0] || null;
  }

  static async findById(id) {
    const result = await query(
      `SELECT id, email, created_at FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async verifyPassword(plaintext, hash) {
    return bcrypt.compare(plaintext, hash);
  }
}

module.exports = User;

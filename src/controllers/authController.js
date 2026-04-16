const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email already exists.',
      });
    }

    const user = await User.create({ email, password });
    const token = generateToken(user);

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: { id: user.id, email: user.email, created_at: user.created_at },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Registration failed.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
    }

    const valid = await User.verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: 'Logged in successfully.',
      token,
      user: { id: user.id, email: user.email, created_at: user.created_at },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Login failed.' });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found.' });
    }
    return res.status(200).json({ user });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { register, login, me };

// Simple validation middleware factory
const validate = (schema) => (req, res, next) => {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = req.body[field];

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({ field, message: `${field} is required` });
      continue;
    }

    if (value !== undefined && value !== null && value !== '') {
      if (rules.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push({ field, message: `${field} must be a valid email address` });
        }
      }

      if (rules.type === 'url') {
        try {
          new URL(value);
        } catch {
          errors.push({ field, message: `${field} must be a valid URL (include http:// or https://)` });
        }
      }

      if (rules.minLength && value.length < rules.minLength) {
        errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push({ field, message: `${field} must be at most ${rules.maxLength} characters` });
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation Error', details: errors });
  }

  next();
};

module.exports = { validate };

/**
 * Admin authentication middleware.
 * Expects: Authorization: Bearer <ADMIN_TOKEN>
 */
module.exports = function adminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Forbidden: invalid admin token' });
  }

  next();
};

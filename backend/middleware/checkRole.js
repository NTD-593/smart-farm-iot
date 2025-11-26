// Middleware to check user role permissions
// Roles hierarchy: ADMIN > OPERATOR > VIEWER

const ROLE_PERMISSIONS = {
  ADMIN: ['read', 'control', 'edit', 'delete', 'manage_users'],
  OPERATOR: ['read', 'control'],
  VIEWER: ['read']
};

// Check if user has required role
exports.checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: `This action requires one of these roles: ${allowedRoles.join(', ')}`,
        yourRole: req.user.role
      });
    }

    next();
  };
};

// Check if user has specific permission
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: `You don't have '${permission}' permission`,
        yourRole: req.user.role
      });
    }

    next();
  };
};

// Admin only middleware
exports.adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ 
      error: 'Access denied', 
      message: 'Admin access required' 
    });
  }

  next();
};

module.exports.ROLE_PERMISSIONS = ROLE_PERMISSIONS;

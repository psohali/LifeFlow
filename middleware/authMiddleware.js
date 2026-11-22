export function requireRoleApi(allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId || !req.session.role) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in to continue.',
      });
    }

    if (!allowedRoles.includes(req.session.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for your account role.',
      });
    }

    if (req.session.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact an administrator.',
      });
    }

    return next();
  };
}

export const requireAdminApi = requireRoleApi(['admin']);
export const requireDonorApi = requireRoleApi(['donor']);
export const requirePatientApi = requireRoleApi(['patient']);

export function requireRolePage(allowedRoles, loginUrl) {
  return (req, res, next) => {
    if (
      !req.session ||
      !req.session.userId ||
      !allowedRoles.includes(req.session.role) ||
      req.session.accountStatus !== 'active'
    ) {
      return res.redirect(loginUrl);
    }
    return next();
  };
}

export const requireAdminPage = requireRolePage(['admin'], '/admin-login.html');
export const requireDonorPage = requireRolePage(['donor'], '/donor-login.html');
export const requirePatientPage = requireRolePage(['patient'], '/patient-login.html');

export function verifySameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return res.status(403).json({
          success: false,
          message: 'Cross-origin request blocked.',
        });
      }
    } catch {
      return res.status(403).json({
        success: false,
        message: 'Invalid request origin.',
      });
    }
  }

  return next();
}

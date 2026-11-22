import crypto from 'crypto';

const SESSION_TTL_MS = 4 * 60 * 60 * 1000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const sessions = new Map();

function signSessionId(sid) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(sid).digest('hex');
}

export function createUserSession(user) {
  const sid = crypto.randomBytes(32).toString('hex');
  const sig = signSessionId(sid);
  const token = `${sid}.${sig}`;

  const sessionData = {
    userId: user.user_id,
    role: user.role,
    username: user.username || null,
    fullName: user.full_name,
    email: user.email || null,
    phone: user.phone || null,
    accountStatus: user.account_status,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  if (user.role === 'admin') {
    sessionData.adminId = user.user_id;
    sessionData.adminUsername = user.username;
    sessionData.adminName = user.full_name;
    sessionData.adminEmail = user.email || null;
  }

  sessions.set(sid, sessionData);
  return { token, sessionData };
}

export function verifySessionToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const dotIdx = rawToken.indexOf('.');
  if (dotIdx <= 0) return null;

  const sid = rawToken.slice(0, dotIdx);
  const sig = rawToken.slice(dotIdx + 1);
  if (!sid || !sig) return null;

  const expectedSig = signSessionId(sid);
  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  const record = sessions.get(sid);
  if (!record) return null;
  if (record.expiresAt < Date.now()) {
    sessions.delete(sid);
    return null;
  }

  record.expiresAt = Date.now() + SESSION_TTL_MS;
  return { sid, session: record };
}

export function destroySessionToken(rawToken) {
  const verified = verifySessionToken(rawToken);
  if (verified) {
    sessions.delete(verified.sid);
  }
}

export function extractTokenFromRequest(req) {
  const authHeader = String(req.headers.authorization || '');
  if (authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }

  const cookieHeader = String(req.headers.cookie || '');
  if (!cookieHeader) return null;

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    if (key === 'lifeflow.sid') {
      const val = pair.slice(eqIdx + 1).trim();
      try {
        return decodeURIComponent(val);
      } catch {
        return val;
      }
    }
  }
  return null;
}

export function shouldUseIframeHttpsCookie(req) {
  const xfProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  const origin = String(req.headers.origin || '').toLowerCase();
  const referer = String(req.headers.referer || '').toLowerCase();

  if (req.secure || xfProto === 'https' || origin.startsWith('https://') || referer.startsWith('https://')) {
    return true;
  }

  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase();

  const isLocalHost =
    host.startsWith('localhost:') ||
    host.startsWith('127.0.0.1:') ||
    host === 'localhost' ||
    host === '127.0.0.1';

  return !isLocalHost;
}

export function setSessionCookie(req, res, token) {
  const useHttpsAttrs = shouldUseIframeHttpsCookie(req);
  const cookieOptions = {
    httpOnly: true,
    path: '/',
    maxAge: SESSION_TTL_MS,
    sameSite: useHttpsAttrs ? 'none' : 'lax',
  };
  if (useHttpsAttrs) {
    cookieOptions.secure = true;
    cookieOptions.partitioned = true;
  }
  res.cookie('lifeflow.sid', token, cookieOptions);
}

export function clearSessionCookie(req, res) {
  const useHttpsAttrs = shouldUseIframeHttpsCookie(req);
  const cookieOptions = {
    httpOnly: true,
    path: '/',
    sameSite: useHttpsAttrs ? 'none' : 'lax',
  };
  if (useHttpsAttrs) {
    cookieOptions.secure = true;
    cookieOptions.partitioned = true;
  }
  res.clearCookie('lifeflow.sid', cookieOptions);
}

export function attachSessionMiddleware(req, res, next) {
  const token = extractTokenFromRequest(req);
  const verified = verifySessionToken(token);
  if (verified) {
    req.session = verified.session;
    req.sessionToken = token;
  } else {
    req.session = null;
    req.sessionToken = null;
  }
  next();
}

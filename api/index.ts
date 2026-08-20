import app from "../server";

export default function handler(req: any, res: any) {
  try {
    if (req.query && req.query.__route) {
      req.url = Array.isArray(req.query.__route) ? req.query.__route[0] : req.query.__route;
    } else if (req.headers && req.headers['x-matched-path']) {
      req.url = req.headers['x-matched-path'];
    } else if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
    }
  } catch (_) {}

  return app(req, res);
}

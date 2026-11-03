export function notFound(req, res) {
  res.status(404).json({ message: 'The requested API route was not found.' });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = Number(err.status || err.statusCode || 500);
  const isProduction = process.env.NODE_ENV === 'production';
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  const logEntry = {
    level: safeStatus >= 500 ? 'error' : 'warn',
    message: err.message || 'Unknown error',
    method: req.method,
    path: req.originalUrl,
    status: safeStatus,
    name: err.name,
  };
  if (safeStatus >= 500) console.error(JSON.stringify(logEntry));
  else if (!isProduction) console.warn(JSON.stringify(logEntry));

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((item) => item.message).join(' ') });
  }
  if (err.code === 11000) return res.status(409).json({ message: 'That value is already in use.' });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid resource identifier.' });
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Request body contains invalid JSON.' });
  }

  const message = safeStatus >= 500 && isProduction
    ? 'An unexpected server error occurred. Please try again later.'
    : (err.message || 'Unexpected server error.');
  return res.status(safeStatus).json({ message });
}

export const notFound = (req, res) => {
  res.status(404).json({ success: false, message: 'Resource not found.' });
};

export const errorHandler = (err, req, res, next) => {
  console.error(err);

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Something went wrong.',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

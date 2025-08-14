const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
  const token = event.queryStringParameters.token;
  if (!token) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Missing token' })
    };
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'Valid' })
    };
  } catch (e) {
    console.error("Token verification error:", e.message);
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Invalid or expired token' })
    };
  }
};
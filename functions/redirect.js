const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
  let token;
  try {
    token = event.body ? JSON.parse(event.body).token : null;
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request body' })
    };
  }
  if (!token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing token' })
    };
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET_KEY);
    return {
      statusCode: 200,
      body: JSON.stringify({
        url: `https://tao-bt-lam-online.netlify.app/?token=${token}`
      })
    };
  } catch (e) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Invalid or expired token' })
    };
  }
};

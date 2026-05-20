const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader)
      return res.status(401).json({ error: "No token provided" });

    // extract token from the "Bearer <token>" string
    const token = authHeader.split(" ")[1];

    // cryptographically verify the token using the secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // attach the decoded user payload to the request object for downsteam routes
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = protect;
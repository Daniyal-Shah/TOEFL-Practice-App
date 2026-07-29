function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  if (req.body) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function getErrorMessage(error) {
  if (error.message?.includes("MONGODB_URI")) {
    return "MONGODB_URI is not configured on the server";
  }

  if (error.code === "ETIMEOUT" || error.syscall === "queryTxt") {
    return "Cannot reach MongoDB Atlas. Check your internet connection and MONGODB_URI.";
  }

  if (error.name === "MongoServerSelectionError") {
    return "Cannot connect to MongoDB Atlas. Check Network Access (0.0.0.0/0) and connection string.";
  }

  if (error.name === "MongoAuthenticationError") {
    return "MongoDB authentication failed. Check username and password in MONGODB_URI.";
  }

  return "Database error";
}

export { sendJson, readJsonBody, getErrorMessage };

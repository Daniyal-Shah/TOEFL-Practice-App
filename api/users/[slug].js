import { getUsersCollection } from "../lib/mongodb.js";

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { slug } = req.query;

    if (!slug) {
      return sendJson(res, 400, { error: "User slug is required" });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ slug });

    if (!user) {
      return sendJson(res, 404, { error: "User not found" });
    }

    return sendJson(res, 200, {
      slug: user.slug,
      name: user.name,
      testResults: user.testResults || {},
    });
  } catch (error) {
    console.error("GET /api/users/[slug] failed:", error);
    return sendJson(res, 500, { error: "Failed to load user profile" });
  }
}

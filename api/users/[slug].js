import { getErrorMessage, sendJson } from "../lib/http.js";
import { getUserBySlug } from "../lib/users-service.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { slug } = req.query;

    if (!slug) {
      return sendJson(res, 400, { error: "User slug is required" });
    }

    const user = await getUserBySlug(slug);

    if (!user) {
      return sendJson(res, 404, { error: "User not found" });
    }

    return sendJson(res, 200, user);
  } catch (error) {
    console.error("GET /api/users/[slug] failed:", error);
    return sendJson(res, 500, { error: getErrorMessage(error) });
  }
}

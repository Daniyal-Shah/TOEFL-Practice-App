import { getErrorMessage, readJsonBody, sendJson } from "../lib/http.js";
import { upsertUser } from "../lib/users-service.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req);
    const result = await upsertUser(body.name);
    return sendJson(res, 200, result);
  } catch (error) {
    console.error("POST /api/users failed:", error);

    if (error.message === "Name is required") {
      return sendJson(res, 400, { error: error.message });
    }

    return sendJson(res, 500, { error: getErrorMessage(error) });
  }
}

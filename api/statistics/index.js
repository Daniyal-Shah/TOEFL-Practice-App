import { getErrorMessage, sendJson } from "../lib/http.js";
import { getStatistics } from "../lib/stats-service.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const taskId =
      typeof req.query?.taskId === "string"
        ? req.query.taskId
        : "build-sentence";
    const statistics = await getStatistics(taskId);
    return sendJson(res, 200, statistics);
  } catch (error) {
    console.error("GET /api/statistics failed:", error);

    if (error.message === "Invalid task ID") {
      return sendJson(res, 400, { error: error.message });
    }

    return sendJson(res, 500, { error: getErrorMessage(error) });
  }
}

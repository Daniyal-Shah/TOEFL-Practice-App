import {
  getErrorMessage,
  readJsonBody,
  sendJson,
} from "../../../../lib/http.js";
import {
  deleteUserTestResult,
  saveUserTestResult,
} from "../../../../lib/users-service.js";

export default async function handler(req, res) {
  try {
    const { slug, taskId, testIndex } = req.query;

    if (!slug || !taskId || testIndex === undefined) {
      return sendJson(res, 400, {
        error: "User slug, task ID, and test index are required",
      });
    }

    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      const result = await saveUserTestResult(
        slug,
        taskId,
        testIndex,
        body.answers,
      );

      if (!result) {
        return sendJson(res, 404, { error: "User not found" });
      }

      return sendJson(res, 200, result);
    }

    if (req.method === "DELETE") {
      const result = await deleteUserTestResult(slug, taskId, testIndex);

      if (!result) {
        return sendJson(res, 404, { error: "User not found" });
      }

      return sendJson(res, 200, result);
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(
      "PUT/DELETE /api/users/[slug]/tasks/[taskId]/results/[testIndex] failed:",
      error,
    );

    if (
      error.message === "Answers are required" ||
      error.message === "Task ID is required"
    ) {
      return sendJson(res, 400, { error: error.message });
    }

    return sendJson(res, 500, { error: getErrorMessage(error) });
  }
}

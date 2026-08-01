import { getErrorMessage, readJsonBody } from "./lib/http.js";
import { getStatistics } from "./lib/stats-service.js";
import { LEGACY_TASK_ID } from "./lib/test-results.js";
import {
  checkDatabaseConnection,
  deleteUserTestResult,
  getUserBySlug,
  saveUserTestResult,
  upsertUser,
} from "./lib/users-service.js";

function normalizePathSegments(pathParam) {
  if (!pathParam) return [];
  return Array.isArray(pathParam) ? pathParam : [pathParam];
}

function routeKey(segments) {
  return segments.join("/");
}

export async function handleApiRequest(req, res, options = {}) {
  const segments = options.pathSegments ?? normalizePathSegments(req.query?.path);
  const method = req.method;
  const key = routeKey(segments);

  try {
    if (method === "GET" && key === "health") {
      if (!process.env.MONGODB_URI) {
        return respond(res, 500, { error: "MONGODB_URI is not configured" });
      }

      return respond(res, 200, {
        ok: true,
        api: "up",
        uriScheme: process.env.MONGODB_URI.split(":")[0],
      });
    }

    if (method === "GET" && key === "health/db") {
      if (!process.env.MONGODB_URI) {
        return respond(res, 500, { error: "MONGODB_URI is not configured" });
      }

      await checkDatabaseConnection();
      return respond(res, 200, { ok: true, database: "connected" });
    }

    if (method === "GET" && key === "statistics") {
      const taskId =
        typeof req.query?.taskId === "string"
          ? req.query.taskId
          : "build-sentence";
      const statistics = await getStatistics(taskId);
      return respond(res, 200, statistics);
    }

    if (method === "POST" && key === "users") {
      const body = await readJsonBody(req);
      const result = await upsertUser(body?.name);
      return respond(res, 200, result);
    }

    if (method === "GET" && segments[0] === "users" && segments.length === 2) {
      const user = await getUserBySlug(segments[1]);

      if (!user) {
        return respond(res, 404, { error: "User not found" });
      }

      return respond(res, 200, user);
    }

    if (
      (method === "PUT" || method === "DELETE") &&
      segments[0] === "users" &&
      segments[2] === "results" &&
      segments.length === 4
    ) {
      const [, slug, , testIndex] = segments;

      if (method === "PUT") {
        const body = await readJsonBody(req);
        const result = await saveUserTestResult(
          slug,
          LEGACY_TASK_ID,
          testIndex,
          body?.answers,
        );

        if (!result) {
          return respond(res, 404, { error: "User not found" });
        }

        return respond(res, 200, result);
      }

      const result = await deleteUserTestResult(slug, LEGACY_TASK_ID, testIndex);

      if (!result) {
        return respond(res, 404, { error: "User not found" });
      }

      return respond(res, 200, result);
    }

    if (
      (method === "PUT" || method === "DELETE") &&
      segments[0] === "users" &&
      segments[2] === "tasks" &&
      segments[4] === "results" &&
      segments.length === 6
    ) {
      const [, slug, , taskId, , testIndex] = segments;

      if (method === "PUT") {
        const body = await readJsonBody(req);
        const result = await saveUserTestResult(
          slug,
          taskId,
          testIndex,
          body?.answers,
        );

        if (!result) {
          return respond(res, 404, { error: "User not found" });
        }

        return respond(res, 200, result);
      }

      const result = await deleteUserTestResult(slug, taskId, testIndex);

      if (!result) {
        return respond(res, 404, { error: "User not found" });
      }

      return respond(res, 200, result);
    }

    return respond(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(`API ${method} /${key || ""} failed:`, error);

    if (error.message === "Name is required") {
      return respond(res, 400, { error: error.message });
    }

    if (
      error.message === "Answers are required" ||
      error.message === "Task ID is required"
    ) {
      return respond(res, 400, { error: error.message });
    }

    if (error.message === "Invalid task ID") {
      return respond(res, 400, { error: error.message });
    }

    return respond(res, 500, { error: getErrorMessage(error) });
  }
}

function respond(res, status, body) {
  if (typeof res.status === "function") {
    return res.status(status).json(body);
  }

  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export { normalizePathSegments };

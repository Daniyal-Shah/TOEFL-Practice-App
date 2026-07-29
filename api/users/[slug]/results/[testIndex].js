import { getUsersCollection } from "../../../lib/mongodb.js";

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  try {
    const { slug, testIndex } = req.query;
    const testKey = String(testIndex);

    if (!slug || testKey === "undefined") {
      return sendJson(res, 400, { error: "User slug and test index are required" });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ slug });

    if (!user) {
      return sendJson(res, 404, { error: "User not found" });
    }

    if (req.method === "PUT") {
      const body = await readJsonBody(req);

      if (!Array.isArray(body.answers)) {
        return sendJson(res, 400, { error: "Answers are required" });
      }

      const now = new Date();
      const updatePath = `testResults.${testKey}`;

      await users.updateOne(
        { slug },
        {
          $set: {
            [updatePath]: {
              answers: body.answers,
              completedAt: now,
            },
            updatedAt: now,
          },
        },
      );

      const updatedUser = await users.findOne({ slug });

      return sendJson(res, 200, {
        testResults: updatedUser.testResults || {},
      });
    }

    if (req.method === "DELETE") {
      const now = new Date();
      const updatePath = `testResults.${testKey}`;

      await users.updateOne(
        { slug },
        {
          $unset: { [updatePath]: "" },
          $set: { updatedAt: now },
        },
      );

      const updatedUser = await users.findOne({ slug });

      return sendJson(res, 200, {
        testResults: updatedUser.testResults || {},
      });
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("PUT/DELETE /api/users/[slug]/results/[testIndex] failed:", error);
    return sendJson(res, 500, { error: "Failed to update test result" });
  }
}

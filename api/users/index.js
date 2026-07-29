import { slugifyName } from "../lib/slug.js";
import { getUsersCollection } from "../lib/mongodb.js";

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
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req);
    const name = body.name?.trim();

    if (!name) {
      return sendJson(res, 400, { error: "Name is required" });
    }

    const slug = slugifyName(name);
    const users = await getUsersCollection();
    const now = new Date();

    await users.updateOne(
      { slug },
      {
        $setOnInsert: { slug, createdAt: now, testResults: {} },
        $set: { name, updatedAt: now },
      },
      { upsert: true },
    );

    const user = await users.findOne({ slug });

    return sendJson(res, 200, {
      slug: user.slug,
      name: user.name,
      testResults: user.testResults || {},
    });
  } catch (error) {
    console.error("POST /api/users failed:", error);
    return sendJson(res, 500, { error: "Failed to save user profile" });
  }
}

import express from "express";
import { getErrorMessage } from "../api/lib/http.js";
import {
  checkDatabaseConnection,
  deleteUserTestResult,
  getUserBySlug,
  saveUserTestResult,
  upsertUser,
} from "../api/lib/users-service.js";

const app = express();
const port = Number(process.env.API_PORT || 3001);

app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({ error: "MONGODB_URI is not configured" });
    }

    await checkDatabaseConnection();
    return res.json({ ok: true, database: "connected" });
  } catch (error) {
    console.error("GET /api/health failed:", error);
    return res.status(500).json({ ok: false, error: getErrorMessage(error) });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const result = await upsertUser(req.body?.name);
    return res.json(result);
  } catch (error) {
    console.error("POST /api/users failed:", error);

    if (error.message === "Name is required") {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.get("/api/users/:slug", async (req, res) => {
  try {
    const user = await getUserBySlug(req.params.slug);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    console.error("GET /api/users/:slug failed:", error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.put("/api/users/:slug/results/:testIndex", async (req, res) => {
  try {
    const result = await saveUserTestResult(
      req.params.slug,
      req.params.testIndex,
      req.body?.answers,
    );

    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(result);
  } catch (error) {
    console.error("PUT /api/users/:slug/results/:testIndex failed:", error);

    if (error.message === "Answers are required") {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.delete("/api/users/:slug/results/:testIndex", async (req, res) => {
  try {
    const result = await deleteUserTestResult(
      req.params.slug,
      req.params.testIndex,
    );

    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(result);
  } catch (error) {
    console.error("DELETE /api/users/:slug/results/:testIndex failed:", error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});

import express from "express";
import { handleApiRequest } from "./router.js";

const app = express();
const port = Number(process.env.API_PORT || 3001);

app.use(express.json());

app.use(async (req, res) => {
  if (!req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Not found" });
  }

  const pathSegments = req.path.slice(4).split("/").filter(Boolean);
  await handleApiRequest(req, res, { pathSegments });
});

app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});

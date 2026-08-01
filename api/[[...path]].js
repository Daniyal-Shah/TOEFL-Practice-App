import { handleApiRequest } from "../server/router.js";

export default function handler(req, res) {
  return handleApiRequest(req, res);
}

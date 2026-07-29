const API_BASE = "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export function loginUser(name) {
  return request("/users", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function fetchUser(slug) {
  return request(`/users/${slug}`);
}

export function saveTestResult(slug, testIndex, answers) {
  return request(`/users/${slug}/results/${testIndex}`, {
    method: "PUT",
    body: JSON.stringify({ answers }),
  });
}

export function clearTestResult(slug, testIndex) {
  return request(`/users/${slug}/results/${testIndex}`, {
    method: "DELETE",
  });
}

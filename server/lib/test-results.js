export const LEGACY_TASK_ID = "build-sentence";

export function isLegacyTestResults(testResults) {
  if (!testResults || typeof testResults !== "object") {
    return false;
  }

  return Object.keys(testResults).some((key) => /^\d+$/.test(key));
}

export function migrateTestResults(testResults) {
  if (!testResults || typeof testResults !== "object") {
    return {};
  }

  if (isLegacyTestResults(testResults)) {
    return {
      [LEGACY_TASK_ID]: testResults,
    };
  }

  return testResults;
}

export function getTaskTestResults(testResults, taskId) {
  const migrated = migrateTestResults(testResults);
  return migrated[taskId] || {};
}

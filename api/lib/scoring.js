export function normalizeWord(word) {
  return word?.toLowerCase() ?? null;
}

export function wordsMatch(selected, correct) {
  if (selected === null && correct === null) return true;
  if (selected === null || correct === null) return false;
  return selected.toLowerCase() === correct.toLowerCase();
}

export function isAnswerCorrect(selected, correct) {
  if (selected.length !== correct.length) return false;
  return selected.every((word, i) => wordsMatch(word, correct[i]));
}

export function computeScoreResults(questions, answers) {
  return questions.map((q, i) => {
    const selected = answers[i].map((s) => s.word);
    if (selected.every((w) => w === null)) return null;
    return isAnswerCorrect(selected, q.correctAnswer);
  });
}

export function getSentenceTestScore(testQuestions, testResult) {
  if (!testResult?.answers) return null;

  const results = computeScoreResults(testQuestions, testResult.answers);
  const score = results.filter((r) => r === true).length;

  return {
    score,
    total: testQuestions.length,
  };
}

export function getEmailTestCompletion(testQuestions, testResult) {
  if (!testResult?.answers || !Array.isArray(testResult.answers)) {
    return null;
  }

  const answered = testResult.answers.filter(
    (response) => typeof response === "string" && response.trim().length > 0,
  ).length;

  if (answered === 0) return null;

  return {
    answered,
    total: testQuestions.length,
  };
}

export function getTestScore(taskType, testQuestions, testResult) {
  if (taskType === "email") {
    return getEmailTestCompletion(testQuestions, testResult);
  }

  return getSentenceTestScore(testQuestions, testResult);
}

export function getScoreLevel(averagePercent, testsCompleted) {
  if (testsCompleted === 0) return "New";
  if (averagePercent >= 90) return "Expert";
  if (averagePercent >= 75) return "Advanced";
  if (averagePercent >= 50) return "Intermediate";
  return "Beginner";
}

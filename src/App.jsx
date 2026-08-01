import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import {
  clearTestResult as clearTestResultApi,
  fetchStatistics,
  fetchUser,
  loginUser,
  saveTestResult as saveTestResultApi,
} from "./api.js";
import { TASKS, chunkTaskItems, getTaskById } from "./data/tasks.js";

function getTaskTestResults(allResults, taskId) {
  if (!allResults || typeof allResults !== "object") return {};

  if (allResults[taskId]) {
    return allResults[taskId];
  }

  const hasLegacy = Object.keys(allResults).some((key) => /^\d+$/.test(key));
  if (hasLegacy && taskId === "build-sentence") {
    return allResults;
  }

  return {};
}
const CURRENT_USER_KEY = "building-sentence-current-user";

function slugifyName(name) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") || "user"
  );
}

function saveCurrentUser(name) {
  localStorage.setItem(CURRENT_USER_KEY, name.trim());
}

function clearCurrentUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

function loadCurrentUser() {
  return localStorage.getItem(CURRENT_USER_KEY);
}

function LoadingScreen({ message = "Loading your progress..." }) {
  return (
    <div className="app">
      <main className="card loading-screen">
        <div className="loading-screen__spinner" aria-hidden="true" />
        <p className="loading-screen__message">{message}</p>
      </main>
    </div>
  );
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="app">
      <main className="card error-screen">
        <h2 className="card__title">Something went wrong</h2>
        <p className="error-screen__message">{message}</p>
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Try Again
        </button>
      </main>
    </div>
  );
}


function createEmptyAnswers(questions) {
  return questions.map((q) =>
    Array(q.correctAnswer.length)
      .fill(null)
      .map(() => ({ word: null, optionIndex: null })),
  );
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function isAnswerCorrect(selected, correct) {
  if (selected.length !== correct.length) return false;
  return selected.every((word, i) => word === correct[i]);
}

function computeScoreResults(questions, answers) {
  return questions.map((q, i) => {
    const selected = answers[i].map((s) => s.word);
    if (selected.every((w) => w === null)) return null;
    return isAnswerCorrect(selected, q.correctAnswer);
  });
}

function getSentenceTestScore(testQuestions, testResult) {
  if (!testResult?.answers) return null;

  const results = computeScoreResults(testQuestions, testResult.answers);
  const score = results.filter((r) => r === true).length;

  return {
    score,
    total: testQuestions.length,
    type: "sentence",
  };
}

function getEmailTestCompletion(testQuestions, testResult) {
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
    type: "email",
  };
}

function getTestScore(taskType, testQuestions, testResult) {
  if (taskType === "email") {
    return getEmailTestCompletion(testQuestions, testResult);
  }

  return getSentenceTestScore(testQuestions, testResult);
}

function createEmptyEmailAnswers(prompts) {
  return prompts.map(() => "");
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="timer__icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
    </svg>
  );
}

function ProgressBar({ total, current, completed }) {
  return (
    <div className="progress-bar">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={[
            "progress-bar__segment",
            i < completed ? "progress-bar__segment--completed" : "",
            i === current ? "progress-bar__segment--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      ))}
    </div>
  );
}

function ProfileScreen({ onContinue, isSubmitting, error }) {
  const [name, setName] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isSubmitting) return;
    onContinue(trimmed);
  };

  return (
    <div className="app">
      <main className="card profile-screen">
        <h1 className="card__title">TOEFL Practice</h1>
        <p className="profile-screen__subtitle">
          Enter your name to save your progress across writing tasks in the
          cloud.
        </p>
        <form className="profile-screen__form" onSubmit={handleSubmit}>
          <label className="profile-screen__label" htmlFor="profile-name">
            Your name
          </label>
          <input
            id="profile-name"
            className="profile-screen__input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Sarah"
            autoComplete="name"
            autoFocus
            maxLength={40}
            disabled={isSubmitting}
          />
          {error && <p className="profile-screen__error">{error}</p>}
          <button
            type="submit"
            className="btn btn--primary profile-screen__submit"
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? "Loading..." : "Start Practicing"}
          </button>
        </form>
        <p className="profile-screen__note">
          Your completed tests and results sync to MongoDB Atlas, so you can
          continue on any device using the same name.
        </p>
      </main>
    </div>
  );
}

function getScoreLevel(averagePercent, testsCompleted) {
  if (testsCompleted === 0) return "New";
  if (averagePercent >= 90) return "Expert";
  if (averagePercent >= 75) return "Advanced";
  if (averagePercent >= 50) return "Intermediate";
  return "Beginner";
}

function levelClass(level) {
  return `stats-level stats-level--${level.toLowerCase()}`;
}

function StatisticsPanel({
  statistics,
  currentUserSlug,
  isLoading,
  error,
  onRetry,
  taskType = "sentence",
}) {
  if (isLoading) {
    return (
      <div className="stats-panel stats-panel--loading">
        <div className="loading-screen__spinner" aria-hidden="true" />
        <p className="loading-screen__message">Loading statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-panel stats-panel--error">
        <p className="error-screen__message">{error}</p>
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (!statistics?.users?.length) {
    return (
      <p className="stats-panel__empty">
        No practice data yet. Complete a test to appear on the leaderboard.
      </p>
    );
  }

  const currentUser = statistics.users.find(
    (user) => user.slug === currentUserSlug,
  );

  return (
    <div className="stats-panel">
      {currentUser && (
        <section className="stats-summary">
          <h3 className="stats-summary__title">Your stats</h3>
          <div className="stats-summary__grid">
            <div className="stats-summary__card">
              <span className="stats-summary__label">Level</span>
              <span className={levelClass(currentUser.level)}>
                {currentUser.level}
              </span>
            </div>
            <div className="stats-summary__card">
              <span className="stats-summary__label">
                {taskType === "email" ? "Completion" : "Average score"}
              </span>
              <strong>{currentUser.averagePercent}%</strong>
            </div>
            <div className="stats-summary__card">
              <span className="stats-summary__label">Tests completed</span>
              <strong>
                {currentUser.testsCompleted}/{statistics.totalTests}
              </strong>
            </div>
            {taskType === "sentence" && (
              <div className="stats-summary__card">
                <span className="stats-summary__label">Total correct</span>
                <strong>
                  {currentUser.totalCorrect}/{currentUser.totalQuestions}
                </strong>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="stats-leaderboard">
        <h3 className="stats-leaderboard__title">Leaderboard</h3>
        <div className="stats-table">
          <div className="stats-table__head">
            <span>Rank</span>
            <span>User</span>
            <span>Level</span>
            <span>Tests</span>
            <span>Avg</span>
            <span>{taskType === "email" ? "Done" : "Score"}</span>
          </div>
          {statistics.users.map((user, index) => {
            const isCurrentUser = user.slug === currentUserSlug;

            return (
              <div
                key={user.slug}
                className={[
                  "stats-table__row",
                  isCurrentUser ? "stats-table__row--current" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="stats-table__rank">#{index + 1}</span>
                <span className="stats-table__name">
                  {user.name}
                  {isCurrentUser && (
                    <span className="stats-table__you">You</span>
                  )}
                </span>
                <span className={levelClass(user.level)}>{user.level}</span>
                <span>
                  {user.testsCompleted}/{statistics.totalTests}
                </span>
                <span>{user.averagePercent}%</span>
                <span>
                  {taskType === "email"
                    ? `${user.testsCompleted} tests`
                    : `${user.totalCorrect}/${user.totalQuestions}`}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TaskHubScreen({ userName, onSelectTask, onSwitchUser }) {
  return (
    <div className="app">
      <main className="card task-hub">
        <div className="test-selection__user-bar">
          <span className="test-selection__user-label">
            Practicing as <strong>{userName}</strong>
          </span>
          <button
            type="button"
            className="test-selection__switch-user"
            onClick={onSwitchUser}
          >
            Switch user
          </button>
        </div>

        <h1 className="card__title">TOEFL Practice</h1>
        <p className="task-hub__subtitle">Choose a writing task to practice</p>

        <ul className="task-hub__list">
          {TASKS.filter((task) => task.available).map((task) => (
            <li key={task.id}>
              <button
                type="button"
                className="task-hub__item"
                onClick={() => onSelectTask(task.id)}
              >
                <span className="task-hub__item-label">{task.label}</span>
                <span className="task-hub__item-description">
                  {task.description}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="task-hub__note">
          More tasks like Reading and Speaking are coming soon.
        </p>
      </main>
    </div>
  );
}

function HomeScreen({
  task,
  tests,
  testResults,
  userName,
  userSlug,
  onSelect,
  onBackToTasks,
  onSwitchUser,
}) {
  const [activeTab, setActiveTab] = useState("practice");
  const [statistics, setStatistics] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);

  const loadStatistics = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);

    try {
      const data = await fetchStatistics(task.id);
      setStatistics(data);
    } catch (error) {
      setStatsError(error.message);
    } finally {
      setStatsLoading(false);
    }
  }, [task.id]);

  useEffect(() => {
    if (activeTab === "statistics") {
      loadStatistics();
    }
  }, [activeTab, loadStatistics]);

  return (
    <div className="app">
      <main className="card test-selection">
        <div className="test-selection__user-bar">
          <span className="test-selection__user-label">
            Practicing as <strong>{userName}</strong>
          </span>
          <button
            type="button"
            className="test-selection__switch-user"
            onClick={onSwitchUser}
          >
            Switch user
          </button>
        </div>

        <button
          type="button"
          className="test-selection__back"
          onClick={onBackToTasks}
        >
          ← All Tasks
        </button>

        <h1 className="card__title">{task.label}</h1>

        <div className="home-tabs">
          <button
            type="button"
            className={[
              "home-tabs__tab",
              activeTab === "practice" ? "home-tabs__tab--active" : "",
            ].join(" ")}
            onClick={() => setActiveTab("practice")}
          >
            Practice Tests
          </button>
          <button
            type="button"
            className={[
              "home-tabs__tab",
              activeTab === "statistics" ? "home-tabs__tab--active" : "",
            ].join(" ")}
            onClick={() => setActiveTab("statistics")}
          >
            Statistics
          </button>
        </div>

        {activeTab === "practice" ? (
          <>
            <p className="test-selection__subtitle">Choose a practice test</p>
            <ul className="test-selection__list">
              {tests.map((testQuestions, i) => {
                const savedResult = testResults[i] ?? testResults[String(i)];
                const testScore = getTestScore(
                  task.type,
                  testQuestions,
                  savedResult,
                );
                const isDone = Boolean(testScore);

                return (
                  <li key={i}>
                    <button
                      type="button"
                      className={[
                        "test-selection__item",
                        isDone ? "test-selection__item--done" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => onSelect(i)}
                    >
                      <span className="test-selection__name">
                        Practice Test {i + 1}
                      </span>
                      <span className="test-selection__info">
                        <span className="test-selection__meta">
                          {testQuestions.length}{" "}
                          {task.type === "email" ? "email" : "question"}
                          {testQuestions.length === 1 ? "" : "s"}
                        </span>
                        {isDone && (
                          <>
                            {task.type === "sentence" ? (
                              <span className="test-selection__score">
                                {testScore.score}/{testScore.total}
                              </span>
                            ) : (
                              <span className="test-selection__score">
                                {testScore.answered}/{testScore.total} written
                              </span>
                            )}
                            <span className="test-selection__badge">Done</span>
                          </>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <StatisticsPanel
            statistics={statistics}
            currentUserSlug={userSlug}
            isLoading={statsLoading}
            error={statsError}
            onRetry={loadStatistics}
            taskType={task.type}
          />
        )}
      </main>
    </div>
  );
}

function SentenceReviewLine({
  sentenceStart,
  slots,
  sentenceEnd,
  correctAnswer,
}) {
  return (
    <div className="review-sentence">
      {sentenceStart && (
        <span className="review-sentence__part">{sentenceStart}</span>
      )}
      {slots.map((word, i) => {
        const correctWord = correctAnswer[i];
        const isEmpty = word === null;
        const isSlotCorrect = !isEmpty && word === correctWord;

        return (
          <span
            key={i}
            className={[
              "review-blank",
              isEmpty
                ? "review-blank--empty"
                : isSlotCorrect
                  ? "review-blank--correct"
                  : "review-blank--incorrect",
            ].join(" ")}
            title={`Blank ${i + 1}`}
          >
            {isEmpty ? "—" : word}
          </span>
        );
      })}
      {sentenceEnd && (
        <span className="review-sentence__part">{sentenceEnd}</span>
      )}
    </div>
  );
}

function QuestionReview({ question, userSlots, result, questionNumber }) {
  const userWords = userSlots.map((slot) => slot.word);
  const wrongSlots = question.correctAnswer
    .map((correctWord, i) => ({
      index: i,
      userWord: userWords[i],
      correctWord,
    }))
    .filter(({ userWord, correctWord }) => userWord !== correctWord);

  const statusClass =
    result === true
      ? "review-card__status--correct"
      : result === false
        ? "review-card__status--incorrect"
        : "review-card__status--skipped";

  const statusLabel =
    result === true ? "Correct" : result === false ? "Incorrect" : "Skipped";

  return (
    <article className="review-card">
      <div className="review-card__header">
        <span className="review-card__num">Question {questionNumber}</span>
        <span className={["review-card__status", statusClass].join(" ")}>
          {statusLabel}
        </span>
      </div>

      <p className="review-card__prompt">{question.prompt}</p>

      <div className="review-card__block">
        <span className="review-card__label">Your answer</span>
        <SentenceReviewLine
          sentenceStart={question.sentenceStart}
          slots={userWords}
          sentenceEnd={question.sentenceEnd}
          correctAnswer={question.correctAnswer}
        />
      </div>

      {/* {wrongSlots.length > 0 && (
        <div className="review-card__mistakes">
          <span className="review-card__label">Wrong placeholders</span>
          <ul className="review-card__mistake-list">
            {wrongSlots.map(({ index, userWord, correctWord }) => (
              <li key={index} className="review-card__mistake">
                <span className="review-card__mistake-slot">Blank {index + 1}</span>
                <span className="review-card__mistake-detail">
                  {userWord === null ? (
                    <>
                      You left this empty. Correct:{' '}
                      <strong>{correctWord}</strong>
                    </>
                  ) : (
                    <>
                      You wrote <strong>{userWord}</strong>. Correct:{' '}
                      <strong>{correctWord}</strong>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )} */}

      {result !== true && (
        <div className="review-card__block">
          <span className="review-card__label">Correct answer</span>
          <SentenceReviewLine
            sentenceStart={question.sentenceStart}
            slots={question.correctAnswer}
            sentenceEnd={question.sentenceEnd}
            correctAnswer={question.correctAnswer}
          />
        </div>
      )}
    </article>
  );
}

function ResultsScreen({
  score,
  total,
  questions,
  answers,
  results,
  onRestart,
  onReset,
  onBackToTests,
  isPreviousAttempt = false,
}) {
  return (
    <div className="results">
      <h2 className="card__title">
        {isPreviousAttempt ? "Previous Results" : "Practice Complete"}
      </h2>
      <div className="results__score">
        {score}/{total}
      </div>
      <p className="results__label">correct sentences</p>

      <div className="results__summary">
        {results.map((r, i) => (
          <div key={i} className="results__item">
            <span className="results__item-num">Q{i + 1}</span>
            <span
              className={[
                "results__item-status",
                r === true
                  ? "results__item-status--correct"
                  : r === false
                    ? "results__item-status--incorrect"
                    : "results__item-status--skipped",
              ].join(" ")}
            >
              {r === true ? "Correct" : r === false ? "Incorrect" : "Skipped"}
            </span>
          </div>
        ))}
      </div>

      <div className="results__review">
        <h3 className="results__review-title">Answer Review</h3>
        {questions.map((question, i) => (
          <QuestionReview
            key={question.id ?? i}
            question={question}
            userSlots={answers[i]}
            result={results[i]}
            questionNumber={i + 1}
          />
        ))}
      </div>

      <div className="results__actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={onBackToTests}
        >
          All Practice Tests
        </button>
        {isPreviousAttempt ? (
          <button type="button" className="btn btn--primary" onClick={onReset}>
            Reset & Try Again
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            onClick={onRestart}
          >
            Practice Again
          </button>
        )}
      </div>
    </div>
  );
}

function SavedResultsView({ questions, answers, onBackToTests, onReset }) {
  const scoreResults = useMemo(
    () => computeScoreResults(questions, answers),
    [questions, answers],
  );
  const score = scoreResults.filter((r) => r === true).length;

  return (
    <div className="app">
      <ResultsScreen
        score={score}
        total={questions.length}
        questions={questions}
        answers={answers}
        results={scoreResults}
        onBackToTests={onBackToTests}
        onReset={onReset}
        isPreviousAttempt
      />
    </div>
  );
}

function PracticeTest({
  questions,
  taskLabel,
  timeLimitSeconds,
  onExit,
  onComplete,
}) {
  const totalQuestions = questions.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(() => createEmptyAnswers(questions));
  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
  const [showResults, setShowResults] = useState(false);
  const [checkedQuestions, setCheckedQuestions] = useState({});
  const hasSavedResultsRef = useRef(false);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentIndex];
  const isChecked = checkedQuestions[currentIndex];

  const usedOptionIndices = useMemo(
    () =>
      new Set(
        currentAnswer.map((s) => s.optionIndex).filter((i) => i !== null),
      ),
    [currentAnswer],
  );

  const scoreResults = useMemo(
    () => computeScoreResults(questions, answers),
    [answers, questions],
  );

  const score = scoreResults.filter((r) => r === true).length;

  useEffect(() => {
    if (showResults || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setShowResults(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showResults, timeLeft]);

  useEffect(() => {
    if (showResults && !hasSavedResultsRef.current) {
      hasSavedResultsRef.current = true;
      onComplete(answers);
    }
  }, [showResults, onComplete, answers]);

  const handleWordClick = useCallback(
    (word, optionIndex) => {
      if (isChecked || usedOptionIndices.has(optionIndex)) return;

      setAnswers((prev) => {
        const updated = [...prev];
        const slots = [...updated[currentIndex]];
        const emptyIndex = slots.findIndex((s) => s.word === null);
        if (emptyIndex === -1) return prev;
        slots[emptyIndex] = { word, optionIndex };
        updated[currentIndex] = slots;
        return updated;
      });
    },
    [currentIndex, isChecked, usedOptionIndices],
  );

  const handleBlankClick = useCallback(
    (slotIndex) => {
      if (isChecked) return;

      setAnswers((prev) => {
        const updated = [...prev];
        const slots = [...updated[currentIndex]];
        if (!slots[slotIndex].word) return prev;
        slots[slotIndex] = { word: null, optionIndex: null };
        updated[currentIndex] = slots;
        return updated;
      });
    },
    [currentIndex, isChecked],
  );

  const checkCurrent = () => {
    setCheckedQuestions((prev) => ({ ...prev, [currentIndex]: true }));
  };

  const goNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setShowResults(true);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleRestart = () => {
    hasSavedResultsRef.current = false;
    setCurrentIndex(0);
    setAnswers(createEmptyAnswers(questions));
    setTimeLeft(timeLimitSeconds);
    setShowResults(false);
    setCheckedQuestions({});
  };

  const timerClass =
    timeLeft <= 0
      ? "timer timer--expired"
      : timeLeft <= 60
        ? "timer timer--warning"
        : "timer";

  const currentIsCorrect = isAnswerCorrect(
    currentAnswer.map((s) => s.word),
    currentQuestion.correctAnswer,
  );
  const allFilled = currentAnswer.every((s) => s.word !== null);

  if (showResults) {
    return (
      <div className="app">
        <ResultsScreen
          score={score}
          total={totalQuestions}
          questions={questions}
          answers={answers}
          results={scoreResults}
          onRestart={handleRestart}
          onBackToTests={onExit}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-header__task">{taskLabel}</span>
        <div className="app-header__actions">
          <div className={timerClass}>
            <ClockIcon />
            {formatTime(timeLeft)}
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onExit}
            aria-label="Back to practice tests"
            title="Back to tests"
          >
            ×
          </button>
        </div>
      </header>

      <main className="card">
        <div className="card__header">
          <h1 className="card__title">{taskLabel}</h1>
          <span className="card__progress-label">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
        </div>

        <ProgressBar
          total={totalQuestions}
          current={currentIndex}
          completed={currentIndex}
        />

        <div className="prompt-row">
          <div className="avatar avatar--prompt">
            <UserIcon />
          </div>
          <p className="prompt-text">{currentQuestion.prompt}</p>
        </div>

        <div className="answer-row">
          <div className="avatar avatar--answer">
            <UserIcon />
          </div>
          <div className="sentence-builder">
            <div className="sentence-line">
              <span className="sentence-start">
                {currentQuestion.sentenceStart}
              </span>
              {currentAnswer.map((slot, i) => (
                <button
                  key={i}
                  type="button"
                  className={[
                    "blank",
                    slot.word ? "blank--filled" : "",
                    isChecked && slot.word
                      ? slot.word === currentQuestion.correctAnswer[i]
                        ? "blank--correct"
                        : "blank--incorrect"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleBlankClick(i)}
                  disabled={isChecked}
                  aria-label={
                    slot.word ? `Remove "${slot.word}"` : `Blank ${i + 1}`
                  }
                >
                  {slot.word?.toLowerCase() || ""}
                </button>
              ))}
              <span className="sentence-end">
                {currentQuestion.sentenceEnd}
              </span>
            </div>
          </div>
        </div>

        <div className="word-bank">
          <div className="word-bank__words">
            {currentQuestion.options.map((word, i) => {
              const isUsed = usedOptionIndices.has(i);

              return (
                <span key={`${word}-${i}`}>
                  {i > 0 && <span className="word-bank__separator">/</span>}
                  <span
                    className={[
                      "word-bank__word",
                      isUsed
                        ? "word-bank__word--used"
                        : "word-bank__word--available",
                    ].join(" ")}
                    onClick={() => !isUsed && handleWordClick(word, i)}
                    role="button"
                    tabIndex={isUsed ? -1 : 0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (!isUsed) handleWordClick(word, i);
                      }
                    }}
                  >
                    {word.toLowerCase()}
                  </span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="card__footer">
          <div>
            {isChecked && (
              <span
                className={[
                  "feedback",
                  currentIsCorrect
                    ? "feedback--correct"
                    : "feedback--incorrect",
                ].join(" ")}
              >
                {currentIsCorrect
                  ? "✓ Correct!"
                  : "✗ Incorrect — try reviewing the answer"}
              </span>
            )}
          </div>

          <div className="card__footer-nav">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={goBack}
              disabled={currentIndex === 0}
            >
              ← Back
            </button>

            {!isChecked && allFilled && (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={checkCurrent}
              >
                Check Answer
              </button>
            )}

            <button type="button" className="btn btn--primary" onClick={goNext}>
              {currentIndex < totalQuestions - 1
                ? "Next Question →"
                : "Finish →"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function EmailPromptReview({ prompt, userResponse, promptNumber }) {
  const hasResponse = userResponse.trim().length > 0;

  return (
    <article className="review-card email-review">
      <div className="review-card__header">
        <span className="review-card__num">Email {promptNumber}</span>
        <span
          className={[
            "review-card__status",
            hasResponse
              ? "review-card__status--correct"
              : "review-card__status--skipped",
          ].join(" ")}
        >
          {hasResponse ? "Submitted" : "Skipped"}
        </span>
      </div>

      <p className="review-card__prompt">{prompt.scenario}</p>

      <div className="email-prompt-meta">
        <p>
          <strong>To:</strong> {prompt.recipient}
        </p>
        <p>
          <strong>Subject:</strong> {prompt.subject}
        </p>
      </div>

      <ul className="email-instructions">
        {prompt.instructions.map((instruction) => (
          <li key={instruction}>{instruction}</li>
        ))}
      </ul>

      <div className="review-card__block">
        <span className="review-card__label">Your email</span>
        <div className="email-response-box">
          {hasResponse ? userResponse : "No response submitted."}
        </div>
      </div>

      <div className="review-card__block">
        <span className="review-card__label">Sample answer</span>
        <div className="email-response-box email-response-box--sample">
          {prompt.sampleAnswer}
        </div>
      </div>
    </article>
  );
}

function EmailResultsScreen({
  prompts,
  responses,
  onRestart,
  onReset,
  onBackToTests,
  isPreviousAttempt = false,
}) {
  const answeredCount = responses.filter((r) => r.trim().length > 0).length;

  return (
    <div className="results">
      <h2 className="card__title">
        {isPreviousAttempt ? "Previous Results" : "Practice Complete"}
      </h2>
      <div className="results__score">{answeredCount}</div>
      <p className="results__label">
        of {prompts.length} emails written
      </p>

      <div className="results__summary">
        {responses.map((response, i) => (
          <div key={i} className="results__item">
            <span className="results__item-num">E{i + 1}</span>
            <span
              className={[
                "results__item-status",
                response.trim()
                  ? "results__item-status--correct"
                  : "results__item-status--skipped",
              ].join(" ")}
            >
              {response.trim() ? "Written" : "Skipped"}
            </span>
          </div>
        ))}
      </div>

      <div className="results__review">
        <h3 className="results__review-title">Answer Review</h3>
        {prompts.map((prompt, i) => (
          <EmailPromptReview
            key={prompt.id ?? i}
            prompt={prompt}
            userResponse={responses[i] ?? ""}
            promptNumber={i + 1}
          />
        ))}
      </div>

      <div className="results__actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={onBackToTests}
        >
          All Practice Tests
        </button>
        {isPreviousAttempt ? (
          <button type="button" className="btn btn--primary" onClick={onReset}>
            Reset & Try Again
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            onClick={onRestart}
          >
            Practice Again
          </button>
        )}
      </div>
    </div>
  );
}

function SavedEmailResultsView({ prompts, responses, onBackToTests, onReset }) {
  return (
    <div className="app">
      <EmailResultsScreen
        prompts={prompts}
        responses={responses}
        onBackToTests={onBackToTests}
        onReset={onReset}
        isPreviousAttempt
      />
    </div>
  );
}

function EmailPracticeTest({
  prompts,
  taskLabel,
  timeLimitSeconds,
  onExit,
  onComplete,
}) {
  const totalPrompts = prompts.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState(() => createEmptyEmailAnswers(prompts));
  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
  const [showResults, setShowResults] = useState(false);
  const hasSavedResultsRef = useRef(false);

  const currentPrompt = prompts[currentIndex];
  const currentResponse = responses[currentIndex] ?? "";

  useEffect(() => {
    if (showResults || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setShowResults(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showResults, timeLeft]);

  useEffect(() => {
    if (showResults && !hasSavedResultsRef.current) {
      hasSavedResultsRef.current = true;
      onComplete(responses);
    }
  }, [showResults, onComplete, responses]);

  const handleResponseChange = (value) => {
    setResponses((prev) => {
      const next = [...prev];
      next[currentIndex] = value;
      return next;
    });
  };

  const goNext = () => {
    if (currentIndex < totalPrompts - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setShowResults(true);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleRestart = () => {
    hasSavedResultsRef.current = false;
    setCurrentIndex(0);
    setResponses(createEmptyEmailAnswers(prompts));
    setTimeLeft(timeLimitSeconds);
    setShowResults(false);
  };

  const timerClass =
    timeLeft <= 0
      ? "timer timer--expired"
      : timeLeft <= 60
        ? "timer timer--warning"
        : "timer";

  if (showResults) {
    return (
      <div className="app">
        <EmailResultsScreen
          prompts={prompts}
          responses={responses}
          onRestart={handleRestart}
          onBackToTests={onExit}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-header__task">{taskLabel}</span>
        <div className="app-header__actions">
          <div className={timerClass}>
            <ClockIcon />
            {formatTime(timeLeft)}
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onExit}
            aria-label="Back to practice tests"
            title="Back to tests"
          >
            ×
          </button>
        </div>
      </header>

      <main className="card">
        <div className="card__header">
          <h1 className="card__title">{taskLabel}</h1>
          <span className="card__progress-label">
            Email {currentIndex + 1} of {totalPrompts}
          </span>
        </div>

        <ProgressBar
          total={totalPrompts}
          current={currentIndex}
          completed={currentIndex}
        />

        <div className="email-practice">
          <p className="email-practice__scenario">{currentPrompt.scenario}</p>

          <div className="email-prompt-meta">
            <p>
              <strong>To:</strong> {currentPrompt.recipient}
            </p>
            <p>
              <strong>Subject:</strong> {currentPrompt.subject}
            </p>
          </div>

          <p className="email-practice__direction">
            Write as much as you can and in complete sentences.
          </p>

          <ul className="email-instructions">
            {currentPrompt.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ul>

          <label className="email-practice__label" htmlFor="email-response">
            Your email
          </label>
          <textarea
            id="email-response"
            className="email-practice__textarea"
            value={currentResponse}
            onChange={(event) => handleResponseChange(event.target.value)}
            placeholder="Write your email here..."
            rows={12}
          />
        </div>

        <div className="card__footer">
          <div className="card__footer-nav">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={goBack}
              disabled={currentIndex === 0}
            >
              ← Back
            </button>

            <button type="button" className="btn btn--primary" onClick={goNext}>
              {currentIndex < totalPrompts - 1
                ? "Next Email →"
                : "Finish →"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const selectedTask = selectedTaskId ? getTaskById(selectedTaskId) : null;
  const practiceTests = useMemo(
    () => (selectedTask ? chunkTaskItems(selectedTask) : []),
    [selectedTask],
  );
  const [userName, setUserName] = useState(() => loadCurrentUser());
  const userSlug = userName ? slugifyName(userName) : null;
  const [selectedTestIndex, setSelectedTestIndex] = useState(null);
  const [testMode, setTestMode] = useState("practice");
  const [practiceSessionKey, setPracticeSessionKey] = useState(0);
  const [allTestResults, setAllTestResults] = useState({});
  const taskTestResults = selectedTaskId
    ? getTaskTestResults(allTestResults, selectedTaskId)
    : {};
  const [isLoadingUser, setIsLoadingUser] = useState(Boolean(userSlug));
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const skipSessionFetchRef = useRef(false);

  const loadUserProgress = useCallback(async (slug) => {
    setIsLoadingUser(true);
    setLoadError(null);

    try {
      const data = await fetchUser(slug);
      setUserName(data.name);
      setAllTestResults(data.testResults || {});
      saveCurrentUser(data.name);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    if (!userSlug) {
      setIsLoadingUser(false);
      return;
    }

    if (skipSessionFetchRef.current) {
      skipSessionFetchRef.current = false;
      return;
    }

    loadUserProgress(userSlug);
  }, [userSlug, loadUserProgress]);

  const handleSetUser = useCallback(async (name) => {
    setIsSubmittingProfile(true);
    setProfileError(null);

    try {
      const data = await loginUser(name);
      skipSessionFetchRef.current = true;
      saveCurrentUser(data.name);
      setUserName(data.name);
      setAllTestResults(data.testResults || {});
      setSelectedTaskId(null);
      setSelectedTestIndex(null);
      setTestMode("practice");
      setLoadError(null);
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setIsSubmittingProfile(false);
    }
  }, []);

  const handleSwitchUser = useCallback(() => {
    clearCurrentUser();
    setUserName(null);
    setAllTestResults({});
    setSelectedTaskId(null);
    setSelectedTestIndex(null);
    setTestMode("practice");
    setLoadError(null);
    setProfileError(null);
  }, []);

  const saveTestResult = useCallback(
    async (taskId, testIndex, answers) => {
      if (!userSlug) return;

      setAllTestResults((prev) => ({
        ...prev,
        [taskId]: {
          ...(prev[taskId] || {}),
          [testIndex]: { answers },
        },
      }));

      try {
        const data = await saveTestResultApi(
          userSlug,
          taskId,
          testIndex,
          answers,
        );
        setAllTestResults(data.testResults || {});
      } catch (error) {
        console.error("Failed to save test result:", error);
      }
    },
    [userSlug],
  );

  const clearTestResult = useCallback(
    async (taskId, testIndex) => {
      if (!userSlug) return;

      setAllTestResults((prev) => {
        const next = { ...prev };
        if (next[taskId]) {
          const taskResults = { ...next[taskId] };
          delete taskResults[testIndex];
          next[taskId] = taskResults;
        }
        return next;
      });
      setTestMode("practice");
      setPracticeSessionKey((key) => key + 1);

      try {
        const data = await clearTestResultApi(userSlug, taskId, testIndex);
        setAllTestResults(data.testResults || {});
      } catch (error) {
        console.error("Failed to clear test result:", error);
        await loadUserProgress(userSlug);
      }
    },
    [loadUserProgress, userSlug],
  );

  const handleSelectTask = useCallback((taskId) => {
    setSelectedTaskId(taskId);
    setSelectedTestIndex(null);
    setTestMode("practice");
  }, []);

  const handleBackToTasks = useCallback(() => {
    setSelectedTaskId(null);
    setSelectedTestIndex(null);
    setTestMode("practice");
  }, []);

  const handleSelectTest = useCallback(
    (index) => {
      setSelectedTestIndex(index);
      setTestMode(taskTestResults[index]?.answers ? "review" : "practice");
      setPracticeSessionKey((key) => key + 1);
    },
    [taskTestResults],
  );

  const handleTestComplete = useCallback(
    (answers) => {
      if (selectedTaskId !== null && selectedTestIndex !== null) {
        saveTestResult(selectedTaskId, selectedTestIndex, answers);
      }
    },
    [saveTestResult, selectedTaskId, selectedTestIndex],
  );

  const handleResetTest = useCallback(() => {
    if (selectedTaskId !== null && selectedTestIndex !== null) {
      clearTestResult(selectedTaskId, selectedTestIndex);
    }
  }, [clearTestResult, selectedTaskId, selectedTestIndex]);

  if (!userName) {
    return (
      <ProfileScreen
        onContinue={handleSetUser}
        isSubmitting={isSubmittingProfile}
        error={profileError}
      />
    );
  }

  if (isLoadingUser) {
    return <LoadingScreen />;
  }

  if (loadError) {
    return (
      <ErrorScreen
        message={loadError}
        onRetry={() => userSlug && loadUserProgress(userSlug)}
      />
    );
  }

  if (selectedTaskId === null) {
    return (
      <TaskHubScreen
        userName={userName}
        onSelectTask={handleSelectTask}
        onSwitchUser={handleSwitchUser}
      />
    );
  }

  if (selectedTestIndex === null) {
    return (
      <HomeScreen
        task={selectedTask}
        tests={practiceTests}
        testResults={taskTestResults}
        userName={userName}
        userSlug={userSlug}
        onSelect={handleSelectTest}
        onBackToTasks={handleBackToTasks}
        onSwitchUser={handleSwitchUser}
      />
    );
  }

  const testItems = practiceTests[selectedTestIndex];
  const savedAnswers = taskTestResults[selectedTestIndex]?.answers;

  if (selectedTask.type === "email") {
    if (testMode === "review" && savedAnswers) {
      return (
        <SavedEmailResultsView
          prompts={testItems}
          responses={savedAnswers}
          onBackToTests={() => setSelectedTestIndex(null)}
          onReset={handleResetTest}
        />
      );
    }

    return (
      <EmailPracticeTest
        key={`${selectedTaskId}-${selectedTestIndex}-${practiceSessionKey}`}
        prompts={testItems}
        taskLabel={`${selectedTask.label} — Practice Test ${selectedTestIndex + 1}`}
        timeLimitSeconds={selectedTask.timeLimitSeconds}
        onExit={() => setSelectedTestIndex(null)}
        onComplete={handleTestComplete}
      />
    );
  }

  if (testMode === "review" && savedAnswers) {
    return (
      <SavedResultsView
        questions={testItems}
        answers={savedAnswers}
        onBackToTests={() => setSelectedTestIndex(null)}
        onReset={handleResetTest}
      />
    );
  }

  return (
    <PracticeTest
      key={`${selectedTaskId}-${selectedTestIndex}-${practiceSessionKey}`}
      questions={testItems}
      taskLabel={`${selectedTask.label} — Practice Test ${selectedTestIndex + 1}`}
      timeLimitSeconds={selectedTask.timeLimitSeconds}
      onExit={() => setSelectedTestIndex(null)}
      onComplete={handleTestComplete}
    />
  );
}

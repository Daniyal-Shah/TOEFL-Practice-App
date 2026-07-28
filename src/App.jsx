import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import questionData from "./data/questions.json";

const QUESTIONS_PER_TEST = 10;
const PRACTICE_TIME_SECONDS = 6 * 60;
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

function getCompletedTestsKey(userSlug) {
  return `building-sentence-completed-tests:${userSlug}`;
}

function loadCurrentUser() {
  return localStorage.getItem(CURRENT_USER_KEY);
}

function saveCurrentUser(name) {
  localStorage.setItem(CURRENT_USER_KEY, name.trim());
}

function loadCompletedTests(userSlug) {
  try {
    const stored = localStorage.getItem(getCompletedTestsKey(userSlug));
    if (!stored) return new Set();

    const parsed = JSON.parse(stored);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveCompletedTests(userSlug, completed) {
  localStorage.setItem(
    getCompletedTestsKey(userSlug),
    JSON.stringify([...completed]),
  );
}

function chunkQuestions(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
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

function ProfileScreen({ onContinue }) {
  const [name, setName] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onContinue(trimmed);
  };

  return (
    <div className="app">
      <main className="card profile-screen">
        <h1 className="card__title">Build a Sentence</h1>
        <p className="profile-screen__subtitle">
          Enter your name to save your own practice progress on this device.
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
          />
          <button
            type="submit"
            className="btn btn--primary profile-screen__submit"
            disabled={!name.trim()}
          >
            Start Practicing
          </button>
        </form>
        <p className="profile-screen__note">
          Progress stays on your browser only. Your friend will not see your
          completed tests.
        </p>
      </main>
    </div>
  );
}

function TestSelectionScreen({
  tests,
  completedTests,
  userName,
  onSelect,
  onSwitchUser,
}) {
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
        <h1 className="card__title">Build a Sentence</h1>
        <p className="test-selection__subtitle">Choose a practice test</p>
        <ul className="test-selection__list">
          {tests.map((testQuestions, i) => {
            const isDone = completedTests.has(i);

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
                      {testQuestions.length} question
                      {testQuestions.length === 1 ? "" : "s"}
                    </span>
                    {isDone && (
                      <span className="test-selection__badge">Done</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
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
  onBackToTests,
}) {
  return (
    <div className="results">
      <h2 className="card__title">Practice Complete</h2>
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
        <button type="button" className="btn btn--primary" onClick={onRestart}>
          Practice Again
        </button>
      </div>
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

  const scoreResults = useMemo(() => {
    return questions.map((q, i) => {
      const selected = answers[i].map((s) => s.word);
      if (selected.every((w) => w === null)) return null;
      return isAnswerCorrect(selected, q.correctAnswer);
    });
  }, [answers, questions]);

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
    if (showResults) {
      onComplete();
    }
  }, [showResults, onComplete]);

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
          <h1 className="card__title">Build a Sentence</h1>
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
                  {slot.word || ""}
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
                    {word}
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

export default function App() {
  const { taskLabel, questions: allQuestions } = questionData;
  const practiceTests = useMemo(
    () => chunkQuestions(allQuestions, QUESTIONS_PER_TEST),
    [allQuestions],
  );
  const [userName, setUserName] = useState(() => loadCurrentUser());
  const userSlug = userName ? slugifyName(userName) : null;
  const [selectedTestIndex, setSelectedTestIndex] = useState(null);
  const [completedTests, setCompletedTests] = useState(() =>
    userSlug ? loadCompletedTests(userSlug) : new Set(),
  );

  const handleSetUser = useCallback((name) => {
    const slug = slugifyName(name);
    saveCurrentUser(name);
    setUserName(name.trim());
    setCompletedTests(loadCompletedTests(slug));
    setSelectedTestIndex(null);
  }, []);

  const handleSwitchUser = useCallback(() => {
    localStorage.removeItem(CURRENT_USER_KEY);
    setUserName(null);
    setCompletedTests(new Set());
    setSelectedTestIndex(null);
  }, []);

  const markTestComplete = useCallback(
    (testIndex) => {
      if (!userSlug) return;

      setCompletedTests((prev) => {
        if (prev.has(testIndex)) return prev;

        const next = new Set(prev);
        next.add(testIndex);
        saveCompletedTests(userSlug, next);
        return next;
      });
    },
    [userSlug],
  );

  const handleTestComplete = useCallback(() => {
    if (selectedTestIndex !== null) {
      markTestComplete(selectedTestIndex);
    }
  }, [markTestComplete, selectedTestIndex]);

  if (!userName) {
    return <ProfileScreen onContinue={handleSetUser} />;
  }

  if (selectedTestIndex === null) {
    return (
      <TestSelectionScreen
        tests={practiceTests}
        completedTests={completedTests}
        userName={userName}
        onSelect={setSelectedTestIndex}
        onSwitchUser={handleSwitchUser}
      />
    );
  }

  const testQuestions = practiceTests[selectedTestIndex];

  return (
    <PracticeTest
      key={selectedTestIndex}
      questions={testQuestions}
      taskLabel={`${taskLabel} — Practice Test ${selectedTestIndex + 1}`}
      timeLimitSeconds={PRACTICE_TIME_SECONDS}
      onExit={() => setSelectedTestIndex(null)}
      onComplete={handleTestComplete}
    />
  );
}

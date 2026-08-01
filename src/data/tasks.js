import emailData from "./emails.json";
import questionData from "./questions.json";

export const TASKS = [
  {
    id: "build-sentence",
    label: "Build a Sentence",
    description:
      "Arrange words from the bank to form grammatically correct sentences.",
    type: "sentence",
    data: questionData,
    itemsKey: "questions",
    questionsPerTest: 10,
    timeLimitSeconds: 6 * 60,
    available: true,
  },
  {
    id: "write-email",
    label: "Write an Email",
    description:
      "Read a scenario and write a complete email with recipient, subject, and three points.",
    type: "email",
    data: emailData,
    itemsKey: "prompts",
    questionsPerTest: 5,
    timeLimitSeconds: 7 * 60,
    available: true,
  },
];

export function getTaskById(taskId) {
  return TASKS.find((task) => task.id === taskId) ?? null;
}

export function getTaskItems(task) {
  return task.data[task.itemsKey] ?? [];
}

export function chunkTaskItems(task) {
  const items = getTaskItems(task);
  const size = task.questionsPerTest;
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

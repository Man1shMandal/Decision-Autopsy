import { useState } from "react";

function inferQuickReplies(question) {
  const text = `${question.question} ${question.rationale}`.toLowerCase();

  if (text.includes("how long")) {
    return ["Less than 1 year", "1-3 years", "More than 3 years"];
  }

  if (
    text.startsWith("are you") ||
    text.startsWith("do you") ||
    text.startsWith("have you") ||
    text.includes(" does your ") ||
    text.includes(" do you ")
  ) {
    return ["Yes", "No", "Not sure"];
  }

  if (text.includes("monthly income") || text.includes("income and savings")) {
    return ["No income now", "Some savings", "Stable income"];
  }

  if (text.includes("partner") || text.includes("marry") || text.includes("marriage")) {
    return ["Same timeline", "Different timeline", "Not discussed clearly"];
  }

  return [];
}

export default function QuestionCard({
  question,
  questionLabel,
  progressPercent,
  progressLabel,
  onAnswer,
  onSkip,
}) {
  const [freeAnswer, setFreeAnswer] = useState("");
  const quickReplies = inferQuickReplies(question);

  function submitFreeAnswer() {
    const value = freeAnswer.trim();
    if (!value) return;
    onAnswer(question, value);
    setFreeAnswer("");
  }

  function submitQuickReply(value) {
    onAnswer(question, value);
    setFreeAnswer("");
  }

  return (
    <article className="msg ai">
      <div className="bubble-wrap">
        <div className="avatar" aria-hidden="true" />
        <div className="bubble question-shell">
          <div className="question-head">
            <div className="question-step">{questionLabel || "Next question"}</div>
            <div className="question-progress-text">{progressLabel || ""}</div>
          </div>
          <p className="question-text">{question.question}</p>
          <p className="question-context">{question.rationale}</p>

          {quickReplies.length > 0 ? (
            <div className="option-list">
              {quickReplies.map((item, index) => (
                <button
                  key={item}
                  className="option-row"
                  type="button"
                  onClick={() => submitQuickReply(item)}
                >
                  <span className="option-index">{index + 1}</span>
                  <span className="option-copy">{item}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="custom-answer-row">
            <div className="custom-answer-input">
              <span className="custom-answer-icon" aria-hidden="true">✎</span>
              <input
                type="text"
                value={freeAnswer}
                onChange={(event) => setFreeAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  submitFreeAnswer();
                }}
                placeholder="Something else"
              />
            </div>
            <button className="skip-cta" type="button" onClick={() => onSkip(question)}>
              Skip
            </button>
          </div>

          <div className="question-bottom">
            <div className="confidence-row">
              <div className="confidence-track">
                <div
                  className="confidence-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="confidence-value">{progressPercent}%</span>
            </div>

            <button className="small-btn" type="button" onClick={submitFreeAnswer}>
              Use
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

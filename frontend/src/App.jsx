import { useMemo, useState } from "react";
import { runListener, runQuestioner } from "./services/apiClient.js";
import { createInitialContext } from "./state/context.js";
import MessageList from "./components/MessageList.jsx";
import QuestionCard from "./components/QuestionCard.jsx";
import Composer from "./components/Composer.jsx";

function getConfidenceColor(value) {
  if (value >= 70) return "#2DD68A";
  if (value >= 45) return "#E6A830";
  return "#5A8DF0";
}

function buildBackendContext(ctx) {
  const additionalAnswers = Object.fromEntries(
    ctx.question_history
      .filter((item) => typeof item.answer === "string" && item.answer.trim())
      .map((item) => [item.question_id, item.answer])
  );

  return {
    decision: {
      title: ctx.decision || null,
      description: ctx.situation_summary || ctx.decision || null,
    },
    answers: {
      additional_answers: additionalAnswers,
    },
    listener_result: ctx.listener_result,
    question_history: ctx.question_history,
  };
}

function normalizeQuestionRecord(question, answer) {
  return {
    question_id: question.question_id,
    question: question.question,
    priority: question.priority,
    rationale: question.rationale,
    answer,
  };
}

export default function App() {
  const [ctx, setCtx] = useState(createInitialContext());
  const [messages, setMessages] = useState([]);
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [state, setState] = useState("idle");
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const inputDisabled = ["parsing", "questioning"].includes(state);
  const hasConversationStarted = messages.length > 0 || Boolean(pendingQuestion) || isTyping;

  const headerMeta = useMemo(() => {
    if (!ctx.decision) return "Live backend mode active.";
    return `Confidence ${ctx.confidence}% · Clarity ${ctx.clarity}%`;
  }, [ctx.clarity, ctx.confidence, ctx.decision]);

  function addMessage(type, content, extra = {}) {
    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        content,
        ...extra,
      },
    ]);
  }

  function resetAll() {
    setCtx(createInitialContext());
    setMessages([]);
    setPendingQuestion(null);
    setState("idle");
    setIsTyping(false);
    setInputValue("");
  }

  async function safeRequest(action) {
    try {
      return await action();
    } catch (error) {
      console.error(error);
      setIsTyping(false);
      setState("error");
      addMessage("error", "The live backend request failed. Check the backend server and try again.");
      return null;
    }
  }

  async function fetchQuestions(nextCtx, prompt) {
    setState("questioning");
    setIsTyping(true);

    const response = await safeRequest(() => runQuestioner(buildBackendContext(nextCtx), prompt));
    if (!response) return;

    setIsTyping(false);

    const questions = response.output.questions ?? [];
    const nextQuestion = questions[0] ?? null;

    setCtx((current) => ({
      ...current,
      active_questions: questions,
    }));
    setPendingQuestion(nextQuestion);

    if (!nextQuestion) {
      addMessage("ai", "Listener and Questioner completed. Downstream agents are not wired into the UI yet.");
      setState("complete");
      return;
    }

    addMessage("ai", `Focus: ${response.output.recommended_focus}`);
    setState("questioning");
  }

  async function startDecision(text) {
    setState("parsing");
    setIsTyping(true);

    const baseCtx = {
      ...createInitialContext(),
      decision: text,
    };

    setCtx(baseCtx);
    addMessage("user", text);

    const listenerResponse = await safeRequest(() => runListener(buildBackendContext(baseCtx), text));
    if (!listenerResponse) return;

    setIsTyping(false);

    const listenerOutput = listenerResponse.output;
    const parsedCtx = {
      ...baseCtx,
      confidence: listenerOutput.confidence_score,
      clarity: listenerOutput.clarity_score,
      situation_summary: listenerOutput.situation_summary,
      listener_result: listenerOutput,
    };

    setCtx(parsedCtx);
    addMessage("ai", listenerOutput.situation_summary, {
      muted: `Missing: ${listenerOutput.missing_information.join(", ") || "none"}`,
    });

    await fetchQuestions(parsedCtx, "Ask the next best questions.");
  }

  async function onQuestionAnswer(question, answer) {
    const nextCtx = {
      ...ctx,
      question_history: [
        ...ctx.question_history,
        normalizeQuestionRecord(question, answer),
      ],
      active_questions: ctx.active_questions.filter(
        (item) => item.question_id !== question.question_id
      ),
    };

    setCtx(nextCtx);
    setPendingQuestion(null);
    addMessage("user", answer);

    const nextQuestion = nextCtx.active_questions[0] ?? null;
    if (nextQuestion) {
      setPendingQuestion(nextQuestion);
      return;
    }

    await fetchQuestions(nextCtx, "Given the current answers, ask the next best unanswered question.");
  }

  async function onQuestionSkip(question) {
    const nextCtx = {
      ...ctx,
      skipped: [...ctx.skipped, question.question_id],
      question_history: [
        ...ctx.question_history,
        normalizeQuestionRecord(question, null),
      ],
      active_questions: ctx.active_questions.filter(
        (item) => item.question_id !== question.question_id
      ),
    };

    setCtx(nextCtx);
    setPendingQuestion(null);
    addMessage("ai", `Skipped: ${question.question}`);

    const nextQuestion = nextCtx.active_questions[0] ?? null;
    if (nextQuestion) {
      setPendingQuestion(nextQuestion);
      return;
    }

    await fetchQuestions(nextCtx, "A question was skipped. Ask the next best unanswered question.");
  }

  async function onSubmitInput(text) {
    const value = text.trim();
    if (!value || inputDisabled) return;

    setInputValue("");

    if (!ctx.decision) {
      await startDecision(value);
      return;
    }

    addMessage("error", "Use the active question card below. Free-form follow-up chat is not connected yet.");
  }

  return (
    <>
      <div className="bg-glow bg-glow-left" />
      <div className="bg-glow bg-glow-right" />

      <div className="app-shell">
        <header className="topbar">
          <div>
            <div className="eyebrow">Decision Intelligence</div>
            <h1>Decision Autopsy</h1>
            <p className="subtitle">See every road before you take one.</p>
          </div>
          <button className="ghost-btn" type="button" onClick={resetAll}>New Autopsy</button>
        </header>

        {hasConversationStarted ? (
          <main className="workspace">
            <section className="messages" aria-live="polite">
              <MessageList messages={messages} isTyping={isTyping} />

              {pendingQuestion ? (
                <QuestionCard
                  question={pendingQuestion}
                  confidence={ctx.confidence}
                  confidenceColor={getConfidenceColor(ctx.confidence)}
                  onAnswer={onQuestionAnswer}
                  onSkip={onQuestionSkip}
                />
              ) : null}
            </section>
          </main>
        ) : (
          <section className="starter-panel">
            <div className="starter-kicker">Start with one real decision</div>
            <h2>Type your situation below and press Send.</h2>
            <p>The UI now uses the live Listener and Questioner backend.</p>
          </section>
        )}

        <section className="composer-wrap">
          <Composer
            value={inputValue}
            onChange={setInputValue}
            onSubmit={onSubmitInput}
            disabled={inputDisabled}
            placeholder="Describe a decision you're facing..."
          />

          <p className="hint">{headerMeta}</p>
        </section>
      </div>
    </>
  );
}

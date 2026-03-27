export function createInitialContext() {
  return {
    decision: "",
    confidence: 0,
    clarity: 0,
    situation_summary: "",
    answers: {},
    skipped: [],
    listener_result: null,
    question_history: [],
    active_questions: [],
  };
}

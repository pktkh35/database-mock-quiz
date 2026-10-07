const KEY = "sql-mock-exam:v1";

export function emptyState() {
  return {
    questionIds: [],
    questions: [],
    currentIndex: 0,
    drafts: {},
    saved: {},
    playground: "",
    startedAt: null,
    submittedAt: null,
    result: null,
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { state: emptyState(), storageOk: true };
    return { state: { ...emptyState(), ...JSON.parse(raw) }, storageOk: true };
  } catch {
    return { state: emptyState(), storageOk: probe() };
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

function probe() {
  try {
    localStorage.setItem("__t", "1");
    localStorage.removeItem("__t");
    return true;
  } catch {
    return false;
  }
}

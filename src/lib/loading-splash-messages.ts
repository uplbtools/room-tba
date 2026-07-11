/** Whimsical one-liners shown below the loading phase label (not error state).
 * One is picked deterministically by minute (Layout.astro inline script). */
export const LOADING_SPLASH_MESSAGES = [
  "Finding where you need to be",
  "Asking the guard where AnSci is",
  "Waiting for the Kaliwa jeep",
  "Counting steps up Forestry hill",
  "Reserving you a Lib seat",
  "Following the smell of DTRI ice cream",
  "Dodging the Carabao Park traffic",
  "Reading the org tarps so you don't have to",
  "Herding classrooms into place",
] as const;

export const LOADING_SPLASH_FIRST = LOADING_SPLASH_MESSAGES[0];

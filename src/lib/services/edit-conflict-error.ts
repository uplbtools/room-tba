export class EditConflictError<TLatest> extends Error {
  latest: TLatest | null;

  constructor(latest: TLatest | null) {
    super("This record was changed by another editor.");
    this.name = "EditConflictError";
    this.latest = latest;
  }
}

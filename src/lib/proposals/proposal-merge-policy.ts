/** Whether submitProposal may merge into an open row by entity + submitter (updates only). */
export function allowEntityScopedProposalMerge(
  isCreate: boolean,
  submitterUserId: number | null | undefined,
): boolean {
  return Boolean(submitterUserId && !isCreate);
}

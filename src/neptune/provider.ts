/**
 * Deliberately minimal until Phase 0 verifies the live explorer and node sources.
 */
export interface NeptuneDataProvider {
  readonly status: 'unimplemented';
}

export const unimplementedNeptuneDataProvider: NeptuneDataProvider = {
  status: 'unimplemented',
};

/** Deliberately disabled until an isolated preview migration/seed is authorized.
 * Both entrances must change together. Never turn on in production by accident. */
export const DYNAMIC_LIBRARY_ENABLED: boolean = false;
/** Independent UI gate. Set only in dedicated preview after all corresponding server flags,
 * migrations, bucket identities and inspector service are verified. */
export const LIBRARY_COLLECTIONS_ENABLED: boolean = false;

/** Additional opt-in in a verified isolated preview only. */
export const LIBRARY_DISCOVERY_ENABLED: boolean = false;

/** Dedicated preview only. Requires all search server gates. */
export const LIBRARY_SEMANTIC_SEARCH_ENABLED: boolean = false;

/** Explicit independent preview only. */
export const IMPERIAL_GUIDE_ENABLED: boolean = false;

/** Dedicated preview only; requires matching server gate and migration. */
export const IMPERIAL_EXPLORATION_ENABLED: boolean = false;

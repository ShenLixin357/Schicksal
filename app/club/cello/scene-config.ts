/** Percentages belong to the room's 1672 × 941 art plane, never viewport pixels.
 * Replace a future room plate by changing only placement and this asset's hit regions.
 * Asset itself is 1024 × 1536; lower feet reach y=.963. */
export const CELLO_SCENE = {
    asset: '/cello/cello-corner.webp',
    placement: { left: 32.8, bottom: 8.2, width: 18.6, rotate: -.5 },
    instrument: { left: 34, top: 4, width: 50, height: 83 },
    manuscript: { left: 4, top: 42, width: 32, height: 13 },
    // Actual four visible strings: scroll/fingerboard to bridge. Coordinates are in the asset.
    strings: [{ topX: 65.7, bottomX: 48.7 }, { topX: 66.7, bottomX: 50.3 }, { topX: 67.7, bottomX: 51.9 }, { topX: 68.7, bottomX: 53.5 }],
    stringTop: 15.1, stringBottom: 53.6,
} as const;

/** Shared immutable colour/order description of the approved eight-ray emblem.
 * Keep this data free of navigation, Lounge, or 3D rendering dependencies.
 * Changes to colours require separate explicit user approval.
 */
import { CITIZENS } from "../citizens";
import type { EmblemBladeSpec } from "./hero-emblem-sculpture";

// The current homepage emblem is the canonical source for color order and adjacency.
// Every 2D and 3D rendering reads this same clockwise blade specification.
export const EMBLEM_BLADES: readonly EmblemBladeSpec[] = CITIZENS.map((citizen, index) => ({
  index,
  citizenId: citizen.id,
  color: citizen.accent,
  angle: index * 45,
}));

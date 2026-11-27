import { COMMITTEE_LOUNGE_ART } from "./lounge-access";

export async function prepareLounge() {
  const art = new window.Image();
  art.src = COMMITTEE_LOUNGE_ART;
  await Promise.all([import("./committee-lounge"), art.decode()]);
}

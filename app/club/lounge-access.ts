"use client";

import type { Citizen } from "../citizens";

/** Single source of Lounge authorization presentation and announcement identity.
 * This is NOT a replacement for server-side access checks.
 */
export const CLUB_MEMBER_IDS = new Set(["amberina", "zxy", "truth"]);

export const LOUNGE_IDENTITIES: Record<string, { spoken: string; mask: string }> = {
  amberina: { spoken: "Lady Mafraer the Witch", mask: "玛法女巫" },
  zxy: { spoken: "Lord Chryser, the Jade Ember", mask: "Lord Chryser" },
  truth: { spoken: "Nishujiade, the Truth-Teller", mask: "Nishujiade" },
};



function playLoungeChime() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const now = context.currentTime;
  [659.25, 987.77, 1318.51].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = index === 1 ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, now + index * .105);
    gain.gain.linearRampToValueAtTime(.045, now + index * .105 + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, now + index * .105 + .22);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now + index * .105);
    oscillator.stop(now + index * .105 + .24);
  });
  window.setTimeout(() => void context.close(), 900);
}

export function announceCommitteeLounge(citizen: Citizen, onComplete: () => void) {
  playLoungeChime();
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    onComplete();
    return;
  }
  const synthesis = window.speechSynthesis;
  synthesis.cancel();
  const title = LOUNGE_IDENTITIES[citizen.id]?.spoken || citizen.name;
  const utterance = new SpeechSynthesisUtterance(`Welcome to Committee Lounge, esteemed member ${title}.`);
  utterance.lang = "en-US";
  utterance.rate = .84;
  utterance.pitch = 1.06;
  utterance.volume = .94;
  const voices = synthesis.getVoices();
  const preferredNames = ["Microsoft Aria", "Microsoft Zira", "Ava", "Samantha", "Serena", "Victoria", "Google UK English Female", "Moira"];
  utterance.voice = preferredNames.map((name) => voices.find((voice) => voice.name.includes(name))).find(Boolean)
    ?? voices.find((voice) => /^en/i.test(voice.lang) && /female|woman/i.test(voice.name))
    ?? voices.find((voice) => /^en/i.test(voice.lang))
    ?? null;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onComplete();
  };
  utterance.onend = finish;
  utterance.onerror = finish;
  synthesis.speak(utterance);
  window.setTimeout(finish, 9000);
}
export const COMMITTEE_LOUNGE_ART = "/committee-lounge-word-globe-v1.png";

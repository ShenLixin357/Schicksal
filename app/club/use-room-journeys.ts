"use client";

import { useEffect, useRef, useState } from "react";
import { FAN_CYCLE_MS } from "./fan-motion";
import { MAFRAER_ROOM_ASSETS } from "./mafraer-lounge";
import { startMusicBoxTune } from "./lounge-props";

/** Single owner of the private Lounge scene transitions and their resources.
 * No chat history, vase state, game save data, network member privileges or
 * CSS/artwork is owned here.
 */
export function useRoomJourneys({ initialRoom, setChatOpen, setClubStatus, setWhisper }: {
  initialRoom: "committee" | "game-room";
  setChatOpen: (value: boolean) => void;
  setClubStatus: (value: string) => void;
  setWhisper: (value: string) => void;
}) {
  const [roomView, setRoomView] = useState<"committee" | "amberina" | "chryser" | "truth" | "game-room">(initialRoom);
  const [fanTransition, setFanTransition] = useState<"enter" | "exit" | null>(null);
  const [fireplaceOpening, setFireplaceOpening] = useState(false);
  const [globeOpening, setGlobeOpening] = useState(false);
  const [musicBoxOpening, setMusicBoxOpening] = useState(false);

  const musicBoxTimerRef = useRef<number | null>(null);
  const musicBoxSoundRef = useRef<(() => void) | null>(null);
  const musicBoxTravelRef = useRef(0);
  const fanTimerRef = useRef<number | null>(null);
  const fanDeadlineRef = useRef<number | null>(null);
  const fireplaceTimerRef = useRef<number | null>(null);
  const fireplaceDeadlineRef = useRef<number | null>(null);
  const fanTravelRef = useRef(0);
  const fireplaceTravelRef = useRef(0);
  const globeTravelRef = useRef(0);
  const globeTimerRef = useRef<number | null>(null);
  const globeDeadlineRef = useRef<number | null>(null);

  useEffect(() => () => {
    fanTravelRef.current += 1;
    fireplaceTravelRef.current += 1;
    globeTravelRef.current += 1;
    musicBoxTravelRef.current += 1;
    musicBoxSoundRef.current?.();
    if (musicBoxTimerRef.current !== null) window.clearTimeout(musicBoxTimerRef.current);
    if (fanTimerRef.current !== null) window.clearTimeout(fanTimerRef.current);
    if (fanDeadlineRef.current !== null) window.clearTimeout(fanDeadlineRef.current);
    if (fireplaceTimerRef.current !== null) window.clearTimeout(fireplaceTimerRef.current);
    if (fireplaceDeadlineRef.current !== null) window.clearTimeout(fireplaceDeadlineRef.current);
    if (globeTimerRef.current !== null) window.clearTimeout(globeTimerRef.current);
    if (globeDeadlineRef.current !== null) window.clearTimeout(globeDeadlineRef.current);
  }, []);

  const travelWithFan = (nextRoom: "committee" | "amberina") => {
    if (fanTransition || globeOpening || musicBoxOpening || fireplaceOpening) return;
    setChatOpen(false);
    setFanTransition(nextRoom === "amberina" ? "enter" : "exit");
    const request = ++fanTravelRef.current;
    const started = performance.now();
    const background = new window.Image();
    let settled = false;
    background.src = nextRoom === "amberina" ? MAFRAER_ROOM_ASSETS.moonlit : "/committee-lounge-word-globe-v1.png";
    const completePassage = (loaded: boolean) => {
      if (settled || request !== fanTravelRef.current) return;
      settled = true;
      if (fanDeadlineRef.current !== null) window.clearTimeout(fanDeadlineRef.current);
      fanDeadlineRef.current = null;
      const elapsed = performance.now() - started;
      const cycle = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 240 : FAN_CYCLE_MS;
      // Keep dancing while the destination loads; leave on a full bloom, not mid-snap.
      const finishAt = Math.max(1, Math.ceil(elapsed / cycle)) * cycle;
      fanTimerRef.current = window.setTimeout(() => {
        if (request !== fanTravelRef.current) return;
        if (loaded) setRoomView(nextRoom);
        else {
          setClubStatus("房间的月光暂时没有回应，请再试一次。");
          setWhisper("房间的月光暂时没有回应，请再试一次。");
        }
        setFanTransition(null);
        fanTimerRef.current = null;
      }, Math.max(0, finishAt - elapsed));
    };
    // A stalled decode must not leave the passage overlay mounted indefinitely.
    fanDeadlineRef.current = window.setTimeout(() => completePassage(false), 12000);
    void background.decode().then(() => completePassage(true), () => completePassage(false));
  };

  const openWordmageLounge = () => {
    if (globeOpening || fanTransition || fireplaceOpening || musicBoxOpening) return;
    setChatOpen(false);
    setGlobeOpening(true);
    setWhisper("地球仪上的经纬线缓缓展开，磁场回应了言灵师的暗号。");
    const request = ++globeTravelRef.current;
    const started = performance.now();
    const background = new window.Image();
    let finished = false;
    const complete = (loaded: boolean) => {
      if (finished || request !== globeTravelRef.current) return;
      finished = true;
      if (globeDeadlineRef.current !== null) window.clearTimeout(globeDeadlineRef.current);
      globeDeadlineRef.current = null;
      const minimum = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 180 : 1900;
      globeTimerRef.current = window.setTimeout(() => {
        if (request !== globeTravelRef.current) return;
        if (loaded) setRoomView("truth");
        else {
          setClubStatus("言灵通道暂时没有回应，请再试一次。");
          setWhisper("地球仪安静地合上了航路。轻触它，可以再次尝试进入言灵师的 Lounge。");
        }
        setGlobeOpening(false);
        globeTimerRef.current = null;
      }, Math.max(0, minimum - (performance.now() - started)));
    };
    globeDeadlineRef.current = window.setTimeout(() => complete(false), 12000);
    background.src = "/nishujiade-private-lounge-v1.png";
    void background.decode().then(() => complete(true), () => complete(false));
  };

  const openChryserLounge = () => {
    if (fireplaceOpening || globeOpening || fanTransition || musicBoxOpening) return;
    setChatOpen(false);
    setFireplaceOpening(true);
    setWhisper("壁炉深处先出现一粒绿色余烬，随后整座炉膛突然燃烧起来。");
    const request = ++fireplaceTravelRef.current;
    const started = performance.now();
    const background = new window.Image();
    let settled = false;
    const complete = (loaded: boolean) => {
      if (settled || request !== fireplaceTravelRef.current) return;
      settled = true;
      if (fireplaceDeadlineRef.current !== null) window.clearTimeout(fireplaceDeadlineRef.current);
      fireplaceDeadlineRef.current = null;
      const elapsed = performance.now() - started;
      const minimum = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 280 : 2600;
      fireplaceTimerRef.current = window.setTimeout(() => {
        if (request !== fireplaceTravelRef.current) return;
        if (loaded) setRoomView("chryser");
        else {
          setClubStatus("翡翠壁炉暂时无法打开，请再试一次。");
          setWhisper("绿色余烬熄灭了；通往 Room No. 02 的门没有打开。");
        }
        setFireplaceOpening(false);
        fireplaceTimerRef.current = null;
      }, Math.max(0, minimum - elapsed));
    };
    // Preserve the existing scene and exact animation timing on success.
    // Both decoding failure and a hung decode fail safely without stale callbacks.
    fireplaceDeadlineRef.current = window.setTimeout(() => complete(false), 12000);
    background.src = "/chryser-private-lounge.png";
    void background.decode().then(() => complete(true), () => complete(false));
  };

  const openGameRoom = () => {
    if (musicBoxOpening || globeOpening || fireplaceOpening || fanTransition) return;
    setChatOpen(false); setMusicBoxOpening(true);
    setWhisper("八音盒打开了。小小的星月随音乐转动，另一间明亮的房间正在醒来。");
    musicBoxSoundRef.current?.();
    musicBoxSoundRef.current = startMusicBoxTune();
    const request = ++musicBoxTravelRef.current, started = performance.now();
    const background = new window.Image();
    let finished = false;
    const complete = (loaded: boolean) => {
      if (finished || request !== musicBoxTravelRef.current) return;
      finished = true;
      if (musicBoxTimerRef.current !== null) window.clearTimeout(musicBoxTimerRef.current);
      const minimum = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 250 : 2400;
      musicBoxTimerRef.current = window.setTimeout(() => {
        if (request !== musicBoxTravelRef.current) return;
        musicBoxSoundRef.current?.(); musicBoxSoundRef.current = null;
        if (loaded) setRoomView("game-room");
        else setWhisper("八音盒的房门暂时没有打开，请再轻触一次。");
        setMusicBoxOpening(false); musicBoxTimerRef.current = null;
      }, Math.max(0, minimum - (performance.now() - started)));
    };
    musicBoxTimerRef.current = window.setTimeout(() => complete(false), 8000);
    background.src = "/lounge-game-room-v1.webp";
    void background.decode().then(() => complete(true), () => complete(false));
  };

  return {
    roomView, setRoomView, fanTransition, fireplaceOpening, globeOpening,
    musicBoxOpening, travelWithFan, openWordmageLounge,
    openChryserLounge, openGameRoom,
  };
}

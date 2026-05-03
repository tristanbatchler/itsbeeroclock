import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "../lib/constants";
import type { CheckInResponse } from "../types/drinks";

function loadSessionCheckIns(): CheckInResponse[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION_CHECKINS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadTriggeredFlag(): boolean {
  try {
    return (
      localStorage.getItem(STORAGE_KEYS.SESSION_CHECKIN_TRIGGERED) === "true"
    );
  } catch {
    return false;
  }
}

function saveSessionCheckIns(checkIns: CheckInResponse[]) {
  localStorage.setItem(STORAGE_KEYS.SESSION_CHECKINS, JSON.stringify(checkIns));
}

function saveTriggeredFlag(value: boolean) {
  localStorage.setItem(STORAGE_KEYS.SESSION_CHECKIN_TRIGGERED, String(value));
}

export function useSessionCheckIns() {
  const [checkIns, setCheckIns] =
    useState<CheckInResponse[]>(loadSessionCheckIns);
  const [checkInTriggered, setCheckInTriggered] =
    useState<boolean>(loadTriggeredFlag);

  useEffect(() => {
    saveSessionCheckIns(checkIns);
  }, [checkIns]);

  useEffect(() => {
    saveTriggeredFlag(checkInTriggered);
  }, [checkInTriggered]);

  const addCheckIn = (checkIn: CheckInResponse) => {
    setCheckIns((prev) => [...prev, checkIn]);
  };

  const clearCheckIns = () => {
    setCheckIns([]);
    setCheckInTriggered(false);
  };

  return {
    checkIns,
    addCheckIn,
    clearCheckIns,
    checkInTriggered,
    setCheckInTriggered,
  };
}

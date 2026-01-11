
import { MeditationGuide, AppSettings } from "../types";

const STORAGE_KEY = 'zenflow_guides';
const SETTINGS_KEY = 'zenflow_settings';

export const saveGuide = (guide: MeditationGuide) => {
  const existing = getGuides();
  const updated = [guide, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const getGuides = (): MeditationGuide[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const updateGuide = (updatedGuide: MeditationGuide) => {
  const existing = getGuides();
  const updated = existing.map(g => g.id === updatedGuide.id ? updatedGuide : g);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const deleteGuide = (id: string) => {
  const existing = getGuides();
  const updated = existing.filter(g => g.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const getSettings = (): AppSettings => {
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : { language: 'zh', baseUrl: '' };
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

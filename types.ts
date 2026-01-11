
export enum MeditationStyle {
  CALM = 'Calm',
  ENERGIZING = 'Energizing',
  SLEEP = 'Sleep',
  MINDFUL = 'Mindful',
  BREATHWORK = 'Breathwork'
}

export enum GuideStatus {
  SUCCESS = 'Success',
  FAILED = 'Failed',
  PENDING = 'Pending'
}

export type Language = 'en' | 'zh';

export interface AppSettings {
  language: Language;
  baseUrl: string;
}

export interface AudioMetadata {
  id: string;
  url: string;
  voiceId: string;
  format: string;
  duration?: number;
  createdAt: number;
}

export interface MeditationGuide {
  id: string;
  topic: string;
  language: string;
  style: MeditationStyle;
  duration: number; // in minutes
  model: string;
  content: string;
  usageTokens?: number;
  status: GuideStatus;
  createdAt: number;
  audios: AudioMetadata[];
}

export interface GenerationParams {
  topic: string;
  language: string;
  style: MeditationStyle;
  duration: number;
}

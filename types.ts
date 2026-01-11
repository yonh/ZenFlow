
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

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: 'Male' | 'Female' | 'Neutral';
  tags: string[];
}

export const OFFICIAL_VOICES: VoiceOption[] = [
  { id: 'Kore', name: 'Kore', description: '温和稳重，适合深度导引', gender: 'Female', tags: ['稳重', '母性', '平静'] },
  { id: 'Zephyr', name: 'Zephyr', description: '灵动轻盈，充满空气感', gender: 'Female', tags: ['空灵', '自然', '舒缓'] },
  { id: 'Puck', name: 'Puck', description: '友好明亮，充满积极能量', gender: 'Male', tags: ['阳光', '活力', '亲切'] },
  { id: 'Charon', name: 'Charon', description: '深沉睿智，适合智慧沉思', gender: 'Male', tags: ['厚重', '磁性', '智慧'] },
  { id: 'Fenrir', name: 'Fenrir', description: '坚毅有力，扎根于大地', gender: 'Male', tags: ['力量', '低沉', '安全感'] }
];

export interface SpeechParams {
  speakingRate: number;
  pitch: number;
}

export interface AudioMetadata {
  id: string;
  url: string;
  voiceId: string;
  format: string;
  duration?: number;
  createdAt: number;
  params: SpeechParams;
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

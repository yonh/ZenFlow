
import { GoogleGenAI, Modality, Type, LiveServerMessage, Blob as GenAIBlob, FunctionDeclaration } from "@google/genai";
import { MeditationStyle, GenerationParams, SpeechParams } from "../types";
import { getSettings } from "./storageService";

// Manual Base64 Implementation as per guidelines
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  for (i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7fff) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out], { type: "audio/wav" });

  function setUint16(data: number) { view.setUint16(pos, data, true); pos += 2; }
  function setUint32(data: number) { view.setUint32(pos, data, true); pos += 4; }
}

const getStandardAIInstance = () => {
  const settings = getSettings();
  return new GoogleGenAI({ 
    apiKey: process.env.API_KEY as string,
    baseUrl: settings.baseUrl || undefined 
  });
};

const getLiveAIInstance = () => {
  return new GoogleGenAI({ 
    apiKey: process.env.API_KEY as string
  });
};

export const generateMeditationText = async (params: GenerationParams) => {
  const ai = getStandardAIInstance();
  const prompt = `
    Create a detailed meditation guide script.
    Topic: ${params.topic}
    Language: ${params.language}
    Style: ${params.style}
    Estimated Duration: ${params.duration} minutes

    The script should be structured with:
    1. An introduction to settle in.
    2. The core meditation practice (breathing, visualization, or affirmation).
    3. A gentle conclusion.

    Use soothing, descriptive language appropriate for a ${params.style} meditation.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      temperature: 0.7,
      topP: 0.9,
    },
  });

  return {
    content: response.text || '',
    model: 'gemini-3-flash-preview',
    usage: 0,
  };
};

export const generateMeditationSpeech = async (
  text: string, 
  voiceName: string = 'Kore',
  params?: SpeechParams
): Promise<{ blob: Blob; duration: number }> => {
  const ai = getStandardAIInstance();
  const prompt = `Say in a calm, meditative voice: ${text.slice(0, 3000)}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
        speakingRate: params?.speakingRate ?? 1.0,
        pitch: params?.pitch ?? 0.0
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Failed to generate audio content.");

  const sampleRate = 24000;
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
  
  const decodedData = decode(base64Audio);
  const audioBuffer = await decodeAudioData(decodedData, audioContext, sampleRate, 1);
  
  const wavBlob = audioBufferToWav(audioBuffer);
  
  return {
    blob: wavBlob,
    duration: audioBuffer.duration
  };
};

// --- Live API Helper ---

export const setMeditationTopicFunction: FunctionDeclaration = {
  name: 'setMeditationTopic',
  parameters: {
    type: Type.OBJECT,
    description: 'Finalize the meditation session plan based on the conversation.',
    properties: {
      topic: {
        type: Type.STRING,
        description: 'A concise and descriptive topic for the meditation.',
      },
      style: {
        type: Type.STRING,
        enum: ['Calm', 'Energizing', 'Sleep', 'Mindful', 'Breathwork'],
        description: 'The suggested style.',
      },
      duration: {
        type: Type.NUMBER,
        description: 'Suggested duration in minutes.',
      }
    },
    required: ['topic'],
  },
};

export const connectToLiveAssistant = (callbacks: {
  onMessage: (message: LiveServerMessage) => void;
  onOpen: () => void;
  onClose: () => void;
  onError: (e: any) => void;
}) => {
  const ai = getLiveAIInstance();
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    callbacks: {
      onopen: callbacks.onOpen,
      onmessage: callbacks.onMessage,
      onclose: (e: any) => callbacks.onClose(),
      onerror: (e: any) => callbacks.onError(e),
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
      systemInstruction: 'You are a ZenFlow Meditation Planner. Help the user define their meditation topic, style, and duration through a friendly conversation. Use a calm and soothing voice. When you have enough information to form a great meditation prompt, call the setMeditationTopic function to finalize the plan.',
      tools: [{ functionDeclarations: [setMeditationTopicFunction] }],
      outputAudioTranscription: {},
      inputAudioTranscription: {},
    },
  });
};

export const connectToLiveMeditation = (
  script: string,
  callbacks: {
    onMessage: (message: LiveServerMessage) => void;
    onOpen: () => void;
    onClose: () => void;
    onError: (e: any) => void;
  }
) => {
  const ai = getLiveAIInstance();
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    callbacks: {
      onopen: callbacks.onOpen,
      onmessage: callbacks.onMessage,
      onclose: (e: any) => callbacks.onClose(),
      onerror: (e: any) => callbacks.onError(e),
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
      systemInstruction: `You are a professional meditation guide. Your tone should be slow and peaceful.
      
      BASE SCRIPT:
      """
      ${script}
      """
      
      RULES:
      1. Speak slowly with intentional pauses.
      2. If the user interacts, gently guide them back to the meditation flow.
      3. Your tone is warm and grounded.`,
      outputAudioTranscription: {},
      inputAudioTranscription: {},
    },
  });
};

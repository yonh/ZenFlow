
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  History, 
  Settings as SettingsIcon, 
  Wind, 
  Play, 
  Download, 
  Trash2, 
  ChevronRight, 
  Search,
  Loader2,
  ArrowLeft,
  Volume2,
  Languages,
  Globe,
  Save,
  Sparkles,
  BookOpen,
  ChevronDown,
  Clock,
  Mic,
  MicOff,
  X,
  MessageSquare
} from 'lucide-react';
import { 
  MeditationGuide, 
  MeditationStyle, 
  GuideStatus, 
  AudioMetadata,
  AppSettings,
  Language
} from './types';
import { 
  generateMeditationText, 
  generateMeditationSpeech, 
  connectToLiveAssistant, 
  decode, 
  encode, 
  decodeAudioData 
} from './services/geminiService';
import { getGuides, saveGuide, updateGuide, deleteGuide, getSettings, saveSettings } from './services/storageService';
import { Blob as GenAIBlob } from "@google/genai";

// --- Prompt Templates ---

const PROMPT_TEMPLATES = {
  zh: [
    { title: '深夜深度助眠', topic: '在一个宁静的海滩边，听着海浪声，身体逐渐放松沉入梦乡' },
    { title: '工作间隙解压', topic: '在繁忙的工作中寻找片刻宁静，关注呼吸，释放肩颈压力' },
    { title: '晨间感恩冥想', topic: '迎接新的一天，感受阳光洒在身上的温暖，培养内心的喜悦' },
    { title: '情绪平复导引', topic: '如同观察云朵般观察自己的情绪，允许它们流动，找回内心平衡' },
  ],
  en: [
    { title: 'Deep Sleep Journey', topic: 'On a quiet beach, listening to the waves, slowly drifting into sleep' },
    { title: 'Work Break Relief', topic: 'Finding a moment of peace at work, focusing on breath, releasing neck tension' },
    { title: 'Morning Gratitude', topic: 'Welcoming the day, feeling sunlight, cultivating inner joy' },
    { title: 'Emotional Balance', topic: 'Observing emotions like passing clouds, allowing flow, finding balance' },
  ]
};

// --- Shared Components ---

const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all font-bold ${active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
  >
    {icon}
    <span className="text-sm">{label}</span>
  </button>
);

const Badge = ({ status }: { status: GuideStatus }) => {
  const colors = {
    [GuideStatus.SUCCESS]: 'bg-emerald-100 text-emerald-600',
    [GuideStatus.FAILED]: 'bg-rose-100 text-rose-600',
    [GuideStatus.PENDING]: 'bg-amber-100 text-amber-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${colors[status]}`}>
      {status}
    </span>
  );
};

// --- Localization ---

const translations = {
  zh: {
    title: 'ZenFlow 冥想助手',
    createNew: '开启新篇章',
    history: '历史记录',
    audioLibrary: '语音库',
    settings: '偏好设置',
    generateTitle: '定制您的冥想引导',
    generateSubtitle: '根据您的心情、时长和风格量身打造。',
    topicLabel: '冥想主题或关注点',
    topicPlaceholder: '例如：工作后的减压、晨间感恩...',
    styleLabel: '引导风格',
    durationLabel: '预计时长 (分钟)',
    languageLabel: '输出语言',
    generateBtn: '生成冥想稿',
    generating: '正在构思引导词...',
    searchPlaceholder: '搜索历史记录...',
    noHistory: '暂无历史记录',
    startGenerating: '立即开始生成',
    backToHistory: '返回列表',
    voiceGenTitle: '语音合成',
    voiceGenSubtitle: '将冥想稿转为舒缓的语音导引。',
    convertToAudio: '生成语音',
    synthesizing: '正在合成语音...',
    downloadRecording: '下载音频',
    generateAnother: '生成其他音色',
    practiceTip: '练习小贴士',
    tipContent: '为了获得最佳效果，请找一个安静的空间，佩戴舒适的耳机，并专注于句子之间的停顿。',
    settingsTitle: '偏好设置',
    appLanguage: '界面语言',
    apiEndpoint: 'API 接口地址',
    apiEndpointDesc: '支持 OpenAI 兼容的转发地址 (例如: https://api.proxy.com/v1)',
    saveSettings: '保存设置',
    settingsSaved: '设置已更新',
    deleteConfirm: '确定要删除这条冥想记录吗？',
    errorGen: '生成失败，请检查网络或配置。',
    errorTts: '合成失败，请重试。',
    magicTopic: '智能生成主题',
    templates: '示例模板',
    custom: '自定义',
    preset: '预设',
    voiceAssistant: '语音对话构思',
    vaTitle: '冥想助手',
    vaSubtitle: '与 AI 对话，共同构思最适合您的冥想方案。',
    vaListening: '正在倾听...',
    vaSpeaking: '正在为您规划...',
    vaDone: '规划完成',
    vaError: '语音连接失败，请重试',
    usePlan: '采用此方案',
    styles: {
      [MeditationStyle.CALM]: '平静 (Calm)',
      [MeditationStyle.ENERGIZING]: '活力 (Energizing)',
      [MeditationStyle.SLEEP]: '助眠 (Sleep)',
      [MeditationStyle.MINDFUL]: '正念 (Mindful)',
      [MeditationStyle.BREATHWORK]: '呼吸 (Breathwork)',
    }
  },
  en: {
    title: 'ZenFlow Meditation',
    createNew: 'Create New',
    history: 'History',
    audioLibrary: 'Audio Library',
    settings: 'Preferences',
    generateTitle: 'Create Your Guided Meditation',
    generateSubtitle: 'Tailor your session\'s theme, duration, and energy.',
    topicLabel: 'Topic or Focus',
    topicPlaceholder: 'e.g., Stress relief after work, Morning gratitude...',
    styleLabel: 'Style',
    durationLabel: 'Duration (mins)',
    languageLabel: 'Language',
    generateBtn: 'Generate Script',
    generating: 'Drafting your guide...',
    searchPlaceholder: 'Search history...',
    noHistory: 'No history found',
    startGenerating: 'Generate Now',
    backToHistory: 'Back to History',
    voiceGenTitle: 'Voice Generation',
    voiceGenSubtitle: 'Generate a soothing voice recording of this script.',
    convertToAudio: 'Convert to Audio',
    synthesizing: 'Synthesizing...',
    downloadRecording: 'Download Recording',
    generateAnother: 'Generate Another Voice',
    practiceTip: 'Practice Tip',
    tipContent: 'For best results, find a quiet space, use comfortable headphones, and focus on the gaps between the sentences.',
    settingsTitle: 'Preferences',
    appLanguage: 'Display Language',
    apiEndpoint: 'API Base URL',
    apiEndpointDesc: 'Supports OpenAI compatible proxy endpoints (e.g., https://api.proxy.com/v1)',
    saveSettings: 'Save Preferences',
    settingsSaved: 'Settings saved',
    deleteConfirm: 'Are you sure you want to delete this record?',
    errorGen: 'Generation failed. Check configuration.',
    errorTts: 'TTS failed. Try again.',
    magicTopic: 'AI Suggest Topic',
    templates: 'Templates',
    custom: 'Custom',
    preset: 'PRESET',
    voiceAssistant: 'Voice Assistant',
    vaTitle: 'Meditation Assistant',
    vaSubtitle: 'Talk to AI to co-create your perfect meditation plan.',
    vaListening: 'Listening...',
    vaSpeaking: 'Thinking...',
    vaDone: 'Plan Ready',
    vaError: 'Voice connection failed',
    usePlan: 'Use This Plan',
    styles: {
      [MeditationStyle.CALM]: 'Calm',
      [MeditationStyle.ENERGIZING]: 'Energizing',
      [MeditationStyle.SLEEP]: 'Sleep',
      [MeditationStyle.MINDFUL]: 'Mindful',
      [MeditationStyle.BREATHWORK]: 'Breathwork',
    }
  }
};

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'generate' | 'history' | 'audio' | 'settings'>('generate');
  const [guides, setGuides] = useState<MeditationGuide[]>([]);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  
  // Settings & i18n
  const [settings, setSettingsState] = useState<AppSettings>(getSettings());
  const t = (key: keyof typeof translations.zh) => translations[settings.language][key];

  // Form State
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState<MeditationStyle>(MeditationStyle.CALM);
  const [duration, setDuration] = useState(5);
  const [isCustomDuration, setIsCustomDuration] = useState(true);
  const [targetLang, setTargetLang] = useState(settings.language === 'zh' ? 'Chinese' : 'English');

  // Voice Assistant State
  const [vaStatus, setVaStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking' | 'done' | 'error'>('idle');
  const [vaTranscription, setVaTranscription] = useState('');
  const [vaModelTurn, setVaModelTurn] = useState('');
  const [plannedTopic, setPlannedTopic] = useState<any>(null);

  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<any>(null);

  useEffect(() => {
    setGuides(getGuides());
    return () => {
      stopVoiceAssistant();
    };
  }, []);

  const handleMagicTopic = async () => {
    const currentTemplates = PROMPT_TEMPLATES[settings.language];
    const randomTpl = currentTemplates[Math.floor(Math.random() * currentTemplates.length)];
    setTopic(randomTpl.topic);
  };

  const handleCreateGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;

    setIsGenerating(true);
    try {
      const result = await generateMeditationText({ topic, language: targetLang, style, duration });
      const newGuide: MeditationGuide = {
        id: crypto.randomUUID(),
        topic,
        language: targetLang,
        style,
        duration,
        model: result.model,
        content: result.content,
        status: GuideStatus.SUCCESS,
        createdAt: Date.now(),
        audios: []
      };
      saveGuide(newGuide);
      setGuides(getGuides());
      setSelectedGuideId(newGuide.id);
      setActiveTab('history');
      setTopic('');
    } catch (error) {
      alert(t('errorGen'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSynthesize = async (guide: MeditationGuide) => {
    setIsSynthesizing(true);
    try {
      const { blob, duration: audioDuration } = await generateMeditationSpeech(guide.content);
      const url = URL.createObjectURL(blob);
      const newAudio: AudioMetadata = {
        id: crypto.randomUUID(),
        url,
        voiceId: 'Kore',
        format: 'wav',
        duration: audioDuration,
        createdAt: Date.now()
      };
      
      const updatedGuide = {
        ...guide,
        audios: [...guide.audios, newAudio]
      };
      updateGuide(updatedGuide);
      setGuides(getGuides());
    } catch (error) {
      alert(t('errorTts'));
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(settings);
    alert(t('settingsSaved'));
  };

  const handleDelete = (id: string) => {
    if (confirm(t('deleteConfirm'))) {
      deleteGuide(id);
      setGuides(getGuides());
      if (selectedGuideId === id) setSelectedGuideId(null);
    }
  };

  // --- Voice Assistant Logic ---

  const startVoiceAssistant = async () => {
    setShowVoiceAssistant(true);
    setVaStatus('connecting');
    setPlannedTopic(null);
    setVaTranscription('');
    setVaModelTurn('');

    try {
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputNodeRef.current = outputAudioContextRef.current.createGain();
      outputNodeRef.current.connect(outputAudioContextRef.current.destination);
      nextStartTimeRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      sessionPromiseRef.current = connectToLiveAssistant({
        onOpen: () => {
          setVaStatus('listening');
          const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) {
              int16[i] = inputData[i] * 32768;
            }
            // Use GenAIBlob to avoid conflict with browser's global Blob type
            const pcmBlob: GenAIBlob = {
              data: encode(new Uint8Array(int16.buffer)),
              mimeType: 'audio/pcm;rate=16000',
            };
            sessionPromiseRef.current.then((session: any) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContextRef.current!.destination);
        },
        onMessage: async (message) => {
          if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
            const base64 = message.serverContent.modelTurn.parts[0].inlineData.data;
            const audioCtx = outputAudioContextRef.current!;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64), audioCtx, 24000, 1);
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputNodeRef.current!);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            sourcesRef.current.add(source);
            source.onended = () => sourcesRef.current.delete(source);
          }

          if (message.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }

          if (message.serverContent?.inputTranscription) {
            setVaTranscription(prev => prev + message.serverContent!.inputTranscription!.text);
          }
          if (message.serverContent?.outputTranscription) {
            setVaModelTurn(prev => prev + message.serverContent!.outputTranscription!.text);
          }

          if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
              if (fc.name === 'setMeditationTopic') {
                setPlannedTopic(fc.args);
                setVaStatus('done');
                sessionPromiseRef.current.then((session: any) => {
                  session.sendToolResponse({
                    functionResponses: [{
                      id: fc.id,
                      name: fc.name,
                      response: { result: 'Topic saved. You can now tell the user the plan is ready.' }
                    }]
                  });
                });
              }
            }
          }
        },
        onClose: () => {
          setVaStatus('idle');
        },
        onError: (e) => {
          console.error('VA Error:', e);
          setVaStatus('error');
        }
      });
    } catch (err) {
      console.error('Failed to start VA:', err);
      setVaStatus('error');
    }
  };

  const stopVoiceAssistant = () => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then((s: any) => s.close());
    }
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    setShowVoiceAssistant(false);
    setVaStatus('idle');
  };

  const usePlannedPlan = () => {
    if (plannedTopic) {
      setTopic(plannedTopic.topic);
      if (plannedTopic.style) setStyle(plannedTopic.style as MeditationStyle);
      if (plannedTopic.duration) setDuration(plannedTopic.duration);
    }
    stopVoiceAssistant();
  };

  const filteredGuides = guides.filter(g => 
    g.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedGuide = guides.find(g => g.id === selectedGuideId);
  const darkInputClasses = "w-full bg-[#333333] text-white px-5 py-5 rounded-[20px] border border-transparent focus:border-indigo-400 outline-none transition-all placeholder:text-slate-500 font-medium";

  return (
    <div className="flex h-screen bg-[#F0F2F5] overflow-hidden font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-6 hidden md:flex">
        <div className="flex items-center space-x-3 mb-10 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Wind className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold font-accent tracking-tight text-indigo-900">ZenFlow</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem 
            icon={<Plus className="w-5 h-5" />} 
            label={t('createNew')} 
            active={activeTab === 'generate'} 
            onClick={() => { setActiveTab('generate'); setSelectedGuideId(null); }}
          />
          <SidebarItem 
            icon={<History className="w-5 h-5" />} 
            label={t('history')} 
            active={activeTab === 'history'} 
            onClick={() => { setActiveTab('history'); setSelectedGuideId(null); }}
          />
          <SidebarItem 
            icon={<Volume2 className="w-5 h-5" />} 
            label={t('audioLibrary')} 
            active={activeTab === 'audio'} 
            onClick={() => setActiveTab('audio')}
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <SidebarItem 
            icon={<SettingsIcon className="w-5 h-5" />} 
            label={t('settings')} 
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-12">
          
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center space-x-4 mb-2">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <SettingsIcon className="text-indigo-600 w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold font-accent">{t('settingsTitle')}</h2>
              </div>

              <form onSubmit={handleSaveSettings} className="bg-white rounded-[40px] p-10 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-10">
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 text-slate-800 font-bold">
                    <Languages className="w-5 h-5 text-indigo-500" />
                    <span>{t('appLanguage')}</span>
                  </div>
                  <div className="flex p-1 bg-slate-50 rounded-2xl border border-slate-100">
                    <button 
                      type="button"
                      onClick={() => setSettingsState({...settings, language: 'zh'})}
                      className={`flex-1 py-3 px-4 rounded-xl transition-all font-semibold ${settings.language === 'zh' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      中文 (简体)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSettingsState({...settings, language: 'en'})}
                      className={`flex-1 py-3 px-4 rounded-xl transition-all font-semibold ${settings.language === 'en' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      English
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center space-x-3 text-slate-800 font-bold">
                    <Globe className="w-5 h-5 text-indigo-500" />
                    <span>{t('apiEndpoint')}</span>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-400 font-medium">{t('apiEndpointDesc')}</p>
                    <input 
                      type="url" 
                      value={settings.baseUrl}
                      onChange={(e) => setSettingsState({...settings, baseUrl: e.target.value})}
                      placeholder="https://api.openai-proxy.com/v1"
                      className={darkInputClasses}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-[24px] font-bold text-lg hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-100"
                >
                  <Save className="w-5 h-5" />
                  <span>{t('saveSettings')}</span>
                </button>
              </form>
            </div>
          )}

          {/* Generate Tab */}
          {activeTab === 'generate' && !selectedGuideId && (
            <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in zoom-in-95 duration-500">
              <div className="text-center space-y-3">
                <h2 className="text-4xl font-bold font-accent tracking-tight">{t('generateTitle')}</h2>
                <p className="text-slate-500 max-w-lg mx-auto">{t('generateSubtitle')}</p>
              </div>

              <form onSubmit={handleCreateGuide} className="bg-white rounded-[40px] p-10 shadow-2xl shadow-slate-300/30 border border-slate-100 space-y-10">
                {/* Topic Input */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-base font-bold text-slate-800">{t('topicLabel')}</label>
                    <div className="flex space-x-2">
                      <button type="button" onClick={() => setShowTemplates(true)} className="flex items-center space-x-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"><BookOpen className="w-3 h-3" /><span>{t('templates')}</span></button>
                      <button type="button" onClick={handleMagicTopic} className="flex items-center space-x-1 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors"><Sparkles className="w-3 h-3" /><span>{t('magicTopic')}</span></button>
                      <button type="button" onClick={startVoiceAssistant} className="flex items-center space-x-1 text-xs font-bold text-violet-600 bg-violet-50 px-3 py-1.5 rounded-full hover:bg-violet-100 transition-colors"><Mic className="w-3 h-3" /><span>{t('voiceAssistant')}</span></button>
                    </div>
                  </div>
                  <textarea 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={t('topicPlaceholder')}
                    rows={2}
                    className={`${darkInputClasses} resize-none`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Style Select */}
                  <div className="space-y-4">
                    <label className="text-base font-bold text-slate-800">{t('styleLabel')}</label>
                    <div className="relative group">
                      <select 
                        value={style}
                        onChange={(e) => setStyle(e.target.value as MeditationStyle)}
                        className={`${darkInputClasses} appearance-none cursor-pointer pr-12 focus:ring-2 focus:ring-indigo-400`}
                        style={{ colorScheme: 'dark' }}
                      >
                        {Object.values(MeditationStyle).map(s => (
                          <option key={s} value={s} className="bg-[#333333] text-white py-2">
                            {(translations[settings.language] as any).styles[s]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-6 h-6 group-hover:text-white transition-colors" />
                    </div>
                  </div>

                  {/* Duration Input */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-base font-bold text-slate-800">{t('durationLabel')}</label>
                      <button 
                        type="button"
                        onClick={() => setIsCustomDuration(!isCustomDuration)}
                        className="text-[11px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-colors"
                      >
                        {isCustomDuration ? t('preset') : t('custom')}
                      </button>
                    </div>
                    {isCustomDuration ? (
                      <input 
                        type="number" 
                        min="1" 
                        max="120"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                        className={darkInputClasses}
                      />
                    ) : (
                      <div className="grid grid-cols-4 gap-3 h-[68px]">
                        {[5, 10, 15, 20].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setDuration(val)}
                            className={`rounded-[20px] border-2 transition-all font-bold text-lg ${duration === val ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-[#333333] text-slate-400 border-transparent hover:border-slate-500'}`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Language Select */}
                <div className="space-y-4">
                  <label className="text-base font-bold text-slate-800">{t('languageLabel')}</label>
                  <div className="relative group">
                    <select 
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      className={`${darkInputClasses} appearance-none cursor-pointer pr-12 focus:ring-2 focus:ring-indigo-400`}
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="Chinese" className="bg-[#333333] text-white">中文 (Chinese)</option>
                      <option value="English" className="bg-[#333333] text-white">English</option>
                      <option value="Japanese" className="bg-[#333333] text-white">日本語 (Japanese)</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-6 h-6 group-hover:text-white transition-colors" />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isGenerating || !topic}
                  className="w-full py-6 bg-[#B4B4F8] text-white rounded-[32px] font-black text-2xl hover:bg-[#a0a0f0] transition-all disabled:opacity-50 flex items-center justify-center space-x-3 shadow-xl shadow-indigo-100 uppercase tracking-widest"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-7 h-7 animate-spin" /><span>{t('generating')}</span></>
                  ) : (
                    <><Plus className="w-7 h-7" /><span>{t('generateBtn')}</span></>
                  )}
                </button>
              </form>

              {/* Template Modal */}
              {showTemplates && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                  <div className="bg-white rounded-[40px] w-full max-w-xl p-8 shadow-2xl relative">
                    <button onClick={() => setShowTemplates(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-500"><X className="w-8 h-8" /></button>
                    <h3 className="text-2xl font-bold font-accent mb-6">{t('templates')}</h3>
                    <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2">
                      {PROMPT_TEMPLATES[settings.language].map((tpl, i) => (
                        <button
                          key={i}
                          onClick={() => { setTopic(tpl.topic); setShowTemplates(false); }}
                          className="text-left p-6 rounded-[24px] border border-slate-100 bg-slate-50 hover:border-indigo-300 hover:bg-white transition-all group"
                        >
                          <div className="font-bold text-slate-800 mb-1 group-hover:text-indigo-600 text-lg">{tpl.title}</div>
                          <div className="text-sm text-slate-500 line-clamp-2">{tpl.topic}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Voice Assistant Modal */}
              {showVoiceAssistant && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-500">
                  <div className="bg-white rounded-[40px] w-full max-w-2xl p-10 shadow-2xl relative overflow-hidden flex flex-col items-center text-center space-y-8">
                    <button onClick={stopVoiceAssistant} className="absolute top-6 right-6 text-slate-300 hover:text-slate-500 transition-colors">
                      <X className="w-8 h-8" />
                    </button>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-center space-x-3 mb-2">
                        <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200">
                          <Mic className="text-white w-7 h-7" />
                        </div>
                        <h3 className="text-3xl font-black font-accent tracking-tight">{t('vaTitle')}</h3>
                      </div>
                      <p className="text-slate-400 font-medium px-10">{t('vaSubtitle')}</p>
                    </div>

                    {/* VA Visualization */}
                    <div className="relative w-48 h-48 flex items-center justify-center">
                      <div className={`absolute inset-0 bg-violet-100 rounded-full animate-ping opacity-20 ${vaStatus === 'listening' ? 'block' : 'hidden'}`}></div>
                      <div className={`absolute inset-4 bg-violet-200 rounded-full animate-pulse opacity-40 ${vaStatus === 'speaking' ? 'block' : 'hidden'}`}></div>
                      <div className="relative w-32 h-32 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full shadow-2xl flex items-center justify-center">
                        {vaStatus === 'connecting' ? <Loader2 className="w-10 h-10 text-white animate-spin" /> : 
                         vaStatus === 'done' ? <Sparkles className="w-10 h-10 text-white" /> :
                         vaStatus === 'error' ? <MicOff className="w-10 h-10 text-white" /> :
                         <div className="flex items-end space-x-1 h-10">
                           {[1, 2, 3, 4, 5].map(i => (
                             <div key={i} className={`w-1.5 bg-white rounded-full ${vaStatus === 'listening' || vaStatus === 'speaking' ? 'animate-bounce' : 'h-2'}`} style={{ animationDelay: `${i * 0.1}s`, height: `${20 + Math.random() * 60}%` }}></div>
                           ))}
                         </div>
                        }
                      </div>
                    </div>

                    <div className="w-full space-y-6">
                      <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 min-h-[120px] max-h-[160px] overflow-y-auto text-left relative shadow-inner">
                        <div className="flex items-center space-x-2 mb-3">
                          <MessageSquare className="w-4 h-4 text-violet-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {vaStatus === 'listening' ? t('vaListening') : vaStatus === 'speaking' ? t('vaSpeaking') : vaStatus === 'done' ? t('vaDone') : '...'}
                          </span>
                        </div>
                        <p className="text-slate-700 font-serif italic text-lg leading-relaxed">
                          {vaModelTurn || vaTranscription || (vaStatus === 'connecting' ? 'Connecting to assistant...' : 'Hello! I am your meditation guide. How are you feeling today?')}
                        </p>
                      </div>

                      {vaStatus === 'done' && plannedTopic && (
                        <div className="animate-in slide-in-from-top-4 duration-300">
                          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[24px] text-left mb-6">
                            <h4 className="font-black text-emerald-900 mb-2 flex items-center space-x-2">
                              <Sparkles className="w-4 h-4" />
                              <span>Planned Meditation</span>
                            </h4>
                            <p className="text-emerald-700 font-bold mb-1">{plannedTopic.topic}</p>
                            <div className="flex space-x-3 text-xs text-emerald-600/70 font-black uppercase">
                              <span>Style: {plannedTopic.style || 'Custom'}</span>
                              <span>Duration: {plannedTopic.duration || 5}M</span>
                            </div>
                          </div>
                          <button 
                            onClick={usePlannedPlan}
                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center space-x-2"
                          >
                            <Save className="w-5 h-5" />
                            <span>{t('usePlan')}</span>
                          </button>
                        </div>
                      )}
                      
                      {vaStatus === 'error' && (
                        <button 
                          onClick={startVoiceAssistant}
                          className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold text-lg hover:bg-rose-700 transition-all flex items-center justify-center space-x-2"
                        >
                          <span>{t('vaError')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {(activeTab === 'history' || selectedGuideId) && !selectedGuideId && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold font-accent tracking-tight">{t('history')}</h2>
                <div className="relative w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder={t('searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium shadow-sm"
                  />
                </div>
              </div>

              {filteredGuides.length === 0 ? (
                <div className="bg-white rounded-[40px] p-20 text-center border border-slate-100 shadow-sm">
                  <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <History className="text-slate-200 w-12 h-12" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">{t('noHistory')}</h3>
                  <button onClick={() => setActiveTab('generate')} className="mt-8 px-10 py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition-all">
                    {t('startGenerating')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGuides.map((guide) => (
                    <div 
                      key={guide.id}
                      onClick={() => setSelectedGuideId(guide.id)}
                      className="group bg-white rounded-[32px] p-8 border border-slate-100 flex flex-col cursor-pointer hover:border-indigo-200 hover:shadow-xl hover:-translate-y-1 transition-all"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                          <Wind className="text-indigo-600 w-5 h-5 group-hover:text-white" />
                        </div>
                        <Badge status={guide.status} />
                      </div>
                      <h4 className="font-black text-xl text-slate-900 line-clamp-2 mb-6 leading-tight">{guide.topic}</h4>
                      <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-[11px] font-black uppercase text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{guide.duration}M</span>
                        </div>
                        <div className="text-[11px] font-black text-indigo-400">{new Date(guide.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Details View */}
          {selectedGuideId && selectedGuide && (
            <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
              <button onClick={() => setSelectedGuideId(null)} className="flex items-center space-x-3 text-slate-500 hover:text-indigo-600 mb-8 font-black uppercase tracking-widest text-xs">
                <ArrowLeft className="w-4 h-4" /><span>{t('backToHistory')}</span>
              </button>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-8">
                  <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm relative">
                    <div className="flex items-start justify-between mb-8">
                      <div className="space-y-2">
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">{selectedGuide.topic}</h3>
                        <div className="flex items-center space-x-4">
                          <span className="bg-indigo-600 text-white px-3 py-1 rounded-full uppercase font-black text-[10px] tracking-widest">
                            {(translations[settings.language] as any).styles[selectedGuide.style]}
                          </span>
                          <span className="text-slate-400 font-bold text-sm">{selectedGuide.duration}M</span>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(selectedGuide.id)} className="text-slate-300 hover:text-rose-500 p-3 rounded-2xl hover:bg-rose-50"><Trash2 className="w-6 h-6" /></button>
                    </div>
                    <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 leading-loose font-serif text-xl italic bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-inner">
                      {selectedGuide.content}
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-4 space-y-8">
                  <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm sticky top-12">
                    <h4 className="font-black text-lg text-slate-900 mb-4 flex items-center space-x-3">
                      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center"><Volume2 className="w-4 h-4 text-white" /></div>
                      <span>{t('voiceGenTitle')}</span>
                    </h4>
                    {selectedGuide.audios.length === 0 ? (
                      <button onClick={() => handleSynthesize(selectedGuide)} disabled={isSynthesizing} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center space-x-3">
                        {isSynthesizing ? <><Loader2 className="w-5 h-5 animate-spin" /><span>{t('synthesizing')}</span></> : <><Play className="w-5 h-5 fill-current" /><span>{t('convertToAudio')}</span></>}
                      </button>
                    ) : (
                      <div className="space-y-6">
                        {selectedGuide.audios.map((audio) => (
                          <div key={audio.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Speaker: {audio.voiceId}</span>
                              <span className="text-[10px] font-black text-slate-400">{Math.round(audio.duration || 0)}S</span>
                            </div>
                            <audio src={audio.url} controls className="w-full h-10 mb-4" />
                            <a href={audio.url} download={`${selectedGuide.topic}.wav`} className="w-full flex items-center justify-center space-x-2 text-xs font-black text-indigo-600 bg-white py-3 rounded-xl border border-indigo-100">
                              <Download className="w-4 h-4" /><span>{t('downloadRecording')}</span>
                            </a>
                          </div>
                        ))}
                        <button onClick={() => handleSynthesize(selectedGuide)} disabled={isSynthesizing} className="w-full py-3 text-indigo-600 hover:text-indigo-700 text-xs font-black flex items-center justify-center space-x-2 bg-indigo-50 rounded-xl">
                          {isSynthesizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}<span>{t('generateAnother')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audio Library */}
          {activeTab === 'audio' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
              <h2 className="text-3xl font-bold font-accent tracking-tight">{t('audioLibrary')}</h2>
              <div className="bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('topicLabel')}</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Voice</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Length</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Created</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {guides.flatMap(g => g.audios.map(a => ({ guide: g, audio: a }))).length === 0 ? (
                       <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium italic">No recordings in library yet.</td></tr>
                    ) : (
                      guides.flatMap(g => g.audios.map(a => ({ guide: g, audio: a }))).map(({ guide, audio }) => (
                        <tr key={audio.id} className="hover:bg-indigo-50/30 transition-colors group">
                          <td className="px-8 py-6 font-bold text-slate-800">{guide.topic}</td>
                          <td className="px-8 py-6 text-sm font-semibold text-indigo-500">{audio.voiceId}</td>
                          <td className="px-8 py-6 text-sm text-slate-400 font-bold">{Math.round(audio.duration || 0)}s</td>
                          <td className="px-8 py-6 text-xs text-slate-400 font-medium">{new Date(audio.createdAt).toLocaleDateString()}</td>
                          <td className="px-8 py-6">
                            <button onClick={() => { setSelectedGuideId(guide.id); setActiveTab('history'); }} className="bg-white px-4 py-2 rounded-xl text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white font-bold text-xs flex items-center space-x-2 transition-all shadow-sm">
                              <Play className="w-3 h-3 fill-current" /><span>Listen</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

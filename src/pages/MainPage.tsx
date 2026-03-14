import { useState, useEffect } from 'react';
import { Settings as SettingsType } from '../types/index';
import { Settings } from '../components/Settings';
import { Generator } from '../components/Generator';

const DEFAULT_SETTINGS: SettingsType = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo',
  outputFields: [],
  promptTemplate: 'Define the word "{{Word}}" in detail, including pronunciation, parts of speech, meanings, and usage notes.',
  webhookUrl: '',
};

interface MainPageProps {
  initialTab?: 'generator' | 'settings';
}

export default function MainPage({ initialTab = 'generator' }: MainPageProps) {
  const [activeTab, setActiveTab] = useState<'generator' | 'settings'>(initialTab);
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div>
      <div className="flex gap-4 border-b border-slate-200 mb-8">
        <button
          onClick={() => setActiveTab('generator')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'generator'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Generator
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'settings'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Settings
        </button>
      </div>

      {activeTab === 'generator' && <Generator settings={settings} />}
      {activeTab === 'settings' && <Settings settings={settings} onSave={setSettings} />}
    </div>
  );
}

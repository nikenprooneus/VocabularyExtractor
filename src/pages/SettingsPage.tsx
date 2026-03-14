import { Settings } from '../components/Settings';
import { useSettings } from '../contexts/SettingsContext';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();

  return <Settings settings={settings} onSave={updateSettings} />;
}

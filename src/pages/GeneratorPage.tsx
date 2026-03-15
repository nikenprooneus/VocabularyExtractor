import { Generator } from '../components/Generator';
import { useSettings } from '../contexts/SettingsContext';

export default function GeneratorPage() {
  const { settings, isLoading } = useSettings();

  return <Generator settings={settings} isLoading={isLoading} />;
}

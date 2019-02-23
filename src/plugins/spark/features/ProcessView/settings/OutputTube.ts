import { ComponentSettings } from '../state';
import { LEFT, CENTER } from '../getters';
import { defaultSettings } from '../components/getters';

const settings: ComponentSettings = {
  ...defaultSettings,
  isSink: true,
  transitions: () => ({
    [LEFT]: [{ outCoords: CENTER, pressure: 0 }],
  }),
};

export default settings;

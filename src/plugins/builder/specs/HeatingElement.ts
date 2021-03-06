import { PartSpec } from '@/plugins/builder/types';
import { showDrivingBlockDialog } from '@/plugins/builder/utils';
import { BlockType } from '@/plugins/spark/types';

export const PWM_KEY = 'pwm';
export const PWM_TYPES = [BlockType.ActuatorPwm];

const DEFAULT_SIZE_X = 5;
const SIZE_Y = 1;

const spec: PartSpec = {
  id: 'HeatingElement',
  title: 'Heating element',
  cards: [
    {
      component: 'BlockAddressCard',
      props: {
        settingsKey: PWM_KEY,
        compatible: PWM_TYPES,
        label: 'PWM',
      },
    },
    {
      component: 'SizeCard',
      props: {
        settingsKey: 'sizeX',
        defaultSize: DEFAULT_SIZE_X,
        label: 'Width',
        min: 3,
        max: 10,
      },
    },
    {
      component: 'BorderCard',
    },
  ],
  size: part => [
    part.settings.sizeX || DEFAULT_SIZE_X,
    SIZE_Y,
  ],
  transitions: () => ({}),
  interactHandler: part => showDrivingBlockDialog(part, PWM_KEY, PWM_TYPES),
};

export default spec;

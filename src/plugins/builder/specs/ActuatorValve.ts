import { blockTypes } from '@/plugins/spark/getters';
import { sparkStore } from '@/plugins/spark/store';
import { DigitalState } from '@/plugins/spark/types';

import { LEFT, RIGHT } from '../getters';
import { settingsBlock } from '../helpers';
import { PartSpec, PersistentPart, Transitions } from '../types';

const spec: PartSpec = {
  id: 'ActuatorValve',
  title: 'Valve: actuator',
  size: () => [1, 1],
  cards: [{
    component: 'BlockAddressCard',
    props: {
      settingsKey: 'valve',
      compatible: [blockTypes.MotorValve, blockTypes.DigitalActuator],
      label: 'Valve or Actuator',
    },
  }],
  transitions: (part: PersistentPart): Transitions => {
    const block = settingsBlock(part, 'valve');
    return block && block.data.state === DigitalState.Active
      ? {
        [LEFT]: [{ outCoords: RIGHT }],
        [RIGHT]: [{ outCoords: LEFT }],
      }
      : {};
  },
  interactHandler: (part: PersistentPart) => {
    const block = settingsBlock(part, 'valve');
    if (block) {
      block.data.desiredState = block.data.state === DigitalState.Active
        ? DigitalState.Inactive
        : DigitalState.Active;
      sparkStore.saveBlock(block);
    }
  },
};

export default spec;

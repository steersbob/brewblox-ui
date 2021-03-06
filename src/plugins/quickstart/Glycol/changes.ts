import { nanoid } from 'nanoid';

import { BuilderConfig, BuilderLayout } from '@/plugins/builder/types';
import { GraphConfig } from '@/plugins/history/types';
import {
  ActuatorPwmBlock,
  Block,
  BlockType,
  DigitalActuatorBlock,
  DigitalState,
  FilterChoice,
  MutexBlock,
  PidBlock,
  SetpointProfileBlock,
  SetpointSensorPairBlock,
} from '@/plugins/spark/types';
import { featureStore } from '@/store/features';
import { systemStore } from '@/store/system';
import { Widget } from '@/store/widgets';
import { bloxLink, bloxQty, deltaTempQty, inverseTempQty, tempQty } from '@/utils/bloxfield';
import { durationMs } from '@/utils/duration';

import { TempControlWidget } from '../TempControl/types';
import { DisplayBlock, PidConfig } from '../types';
import { pidDefaults, unlinkedActuators, withoutPrefix, withPrefix } from '../utils';
import { GlycolConfig, GlycolOpts } from './types';

const makeGlycolBeerCoolConfig = (): PidConfig => ({
  kp: inverseTempQty(-20),
  ti: bloxQty('2h'),
  td: bloxQty('10m'),
});

const makeGlycolBeerHeatConfig = (): PidConfig => ({
  kp: inverseTempQty(100),
  ti: bloxQty('2h'),
  td: bloxQty('10m'),
});

const makeGlycolConfig = (): PidConfig => ({
  kp: inverseTempQty(-20),
  ti: bloxQty('2h'),
  td: bloxQty('5m'),
});

export function defineChangedBlocks(config: GlycolConfig): Block[] {
  const pins = config.heated ? [config.heatPin!, config.coolPin] : [config.coolPin];
  return unlinkedActuators(config.serviceId, pins);
}

export function defineCreatedBlocks(config: GlycolConfig, opts: GlycolOpts): Block[] {
  const { serviceId, names } = config;
  const { beerSetting, glycolSetting } = opts;
  const groups = [0];

  const heatingBlocks = [
    names.heatPid,
    names.heatPwm,
    names.heatAct,
  ];

  const blocks: [
    SetpointSensorPairBlock,
    SetpointProfileBlock,
    MutexBlock,
    DigitalActuatorBlock,
    DigitalActuatorBlock,
    ActuatorPwmBlock,
    ActuatorPwmBlock,
    PidBlock,
    PidBlock,
  ] = [
      // Setpoint
      {
        id: names.beerSetpoint,
        type: BlockType.SetpointSensorPair,
        serviceId,
        groups,
        data: {
          sensorId: bloxLink(names.beerSensor),
          storedSetting: beerSetting,
          settingEnabled: true,
          setting: tempQty(null),
          value: tempQty(null),
          valueUnfiltered: tempQty(null),
          filterThreshold: deltaTempQty(5),
          filter: FilterChoice.FILTER_15s,
          resetFilter: false,
        },
      },
      // Profile
      {
        id: names.beerProfile,
        type: BlockType.SetpointProfile,
        serviceId,
        groups,
        data: {
          start: new Date().getTime() / 1000,
          enabled: false,
          targetId: bloxLink(names.beerSetpoint),
          points: [
            { time: 0, temperature: beerSetting },
            { time: durationMs('7d') / 1000, temperature: beerSetting },
            { time: durationMs('10d') / 1000, temperature: beerSetting.copy(beerSetting.value! + 3) },
          ],
          drivenTargetId: bloxLink(null),
        },
      },
      // Mutex
      {
        id: names.mutex,
        type: BlockType.Mutex,
        serviceId,
        groups,
        data: {
          differentActuatorWait: bloxQty('5m'),
          waitRemaining: bloxQty('0s'),
        },
      },
      // Digital Actuators
      {
        id: names.coolAct,
        type: BlockType.DigitalActuator,
        serviceId,
        groups,
        data: {
          hwDevice: bloxLink(config.coolPin.arrayId),
          channel: config.coolPin.pinId,
          invert: false,
          desiredState: DigitalState.STATE_INACTIVE,
          state: DigitalState.STATE_INACTIVE,
          constrainedBy: {
            constraints: [
              {
                mutexed: {
                  mutexId: bloxLink(names.mutex),
                  extraHoldTime: bloxQty('15m'),
                  hasCustomHoldTime: true,
                  hasLock: false,
                },
                remaining: bloxQty('0s'),
              },
              {
                minOn: bloxQty('5s'),
                remaining: bloxQty('0s'),
              },
            ],
          },
        },
      },
      {
        id: names.heatAct,
        type: BlockType.DigitalActuator,
        serviceId,
        groups,
        data: {
          hwDevice: bloxLink(config.heatPin ? config.heatPin!.arrayId : null),
          channel: config.heatPin ? config.heatPin!.pinId : 0,
          invert: false,
          desiredState: DigitalState.STATE_INACTIVE,
          state: DigitalState.STATE_INACTIVE,
          constrainedBy: {
            constraints: [
              {
                mutexed: {
                  mutexId: bloxLink(names.mutex),
                  extraHoldTime: bloxQty('15m'),
                  hasCustomHoldTime: true,
                  hasLock: false,
                },
                remaining: bloxQty('0s'),
              },
            ],
          },
        },
      },
      // PWM
      {
        id: names.coolPwm,
        type: BlockType.ActuatorPwm,
        serviceId,
        groups,
        data: {
          enabled: true,
          period: bloxQty('10m'),
          actuatorId: bloxLink(names.coolAct),
          drivenActuatorId: bloxLink(null),
          setting: 0,
          desiredSetting: 0,
          value: 0,
          constrainedBy: { constraints: [] },
        },
      },
      {
        id: names.heatPwm,
        type: BlockType.ActuatorPwm,
        serviceId,
        groups,
        data: {
          enabled: true,
          period: bloxQty('10s'),
          actuatorId: bloxLink(names.heatAct),
          drivenActuatorId: bloxLink(null),
          setting: 0,
          desiredSetting: 0,
          value: 0,
          constrainedBy: { constraints: [] },
        },
      },
      {
        id: names.coolPid,
        type: BlockType.Pid,
        serviceId,
        groups,
        data: {
          ...pidDefaults(),
          ...makeGlycolBeerCoolConfig(),
          enabled: true,
          inputId: bloxLink(names.beerSetpoint),
          outputId: bloxLink(names.coolPwm),
        },
      },
      {
        id: names.heatPid,
        type: BlockType.Pid,
        serviceId,
        groups,
        data: {
          ...pidDefaults(),
          ...makeGlycolBeerHeatConfig(),
          enabled: true,
          inputId: bloxLink(names.beerSetpoint),
          outputId: bloxLink(names.heatPwm),
        },
      },
    ];

  if (config.glycolControl === 'Control') {
    const glycolControlBlocks: [
      SetpointSensorPairBlock,
      DigitalActuatorBlock,
      ActuatorPwmBlock,
      PidBlock
    ] = [
        // Setpoint
        {
          id: names.glycolSetpoint,
          type: BlockType.SetpointSensorPair,
          serviceId,
          groups,
          data: {
            sensorId: bloxLink(names.glycolSensor),
            storedSetting: glycolSetting,
            settingEnabled: true,
            setting: tempQty(null),
            value: tempQty(null),
            valueUnfiltered: tempQty(null),
            filterThreshold: deltaTempQty(5),
            filter: FilterChoice.FILTER_15s,
            resetFilter: false,
          },
        },
        // Digital actuator
        {
          id: names.glycolAct,
          type: BlockType.DigitalActuator,
          serviceId,
          groups,
          data: {
            hwDevice: bloxLink(config.glycolPin!.arrayId),
            channel: config.glycolPin!.pinId,
            invert: false,
            desiredState: DigitalState.STATE_INACTIVE,
            state: DigitalState.STATE_INACTIVE,
            constrainedBy: {
              constraints: [
                { minOff: bloxQty('5m'), remaining: bloxQty('0s') },
                { minOn: bloxQty('3m'), remaining: bloxQty('0s') },
              ],
            },
          },
        },
        // PWM
        {
          id: names.glycolPwm,
          type: BlockType.ActuatorPwm,
          serviceId,
          groups,
          data: {
            enabled: true,
            period: bloxQty('30m'),
            actuatorId: bloxLink(names.glycolAct),
            drivenActuatorId: bloxLink(null),
            setting: 0,
            desiredSetting: 0,
            value: 0,
            constrainedBy: { constraints: [] },
          },
        },
        {
          id: names.glycolPid,
          type: BlockType.Pid,
          serviceId,
          groups,
          data: {
            ...pidDefaults(),
            ...makeGlycolConfig(),
            enabled: true,
            inputId: bloxLink(names.glycolSetpoint),
            outputId: bloxLink(names.glycolPwm),
          },
        },
      ];

    blocks.push(...glycolControlBlocks);
  }

  return config.heated
    ? blocks
    : blocks.filter(block => !heatingBlocks.includes(block.id));
}

export function defineWidgets(config: GlycolConfig, layouts: BuilderLayout[]): Widget[] {
  const { serviceId, dashboardId, names, prefix, glycolControl } = config;
  const tempUnit = systemStore.units.temperature;

  const createWidget = (name: string, type: string): Widget => ({
    ...featureStore.widgetSize(type),
    dashboard: dashboardId,
    id: nanoid(),
    title: name,
    feature: type,
    order: 0,
    config: {
      blockId: name,
      serviceId: serviceId,
    },
  });

  const builder: Widget<BuilderConfig> = {
    ...createWidget(withPrefix(prefix, 'Process'), 'Builder'),
    cols: 4,
    rows: 5,
    pinnedPosition: { x: 1, y: 1 },
    config: {
      currentLayoutId: layouts[0].id,
      layoutIds: layouts.map(l => l.id),
    },
  };

  const graph: Widget<GraphConfig> = {
    ...createWidget(withPrefix(prefix, 'Graph'), 'Graph'),
    cols: 6,
    rows: 5,
    pinnedPosition: { x: 5, y: 1 },
    config: {
      layout: {},
      params: { duration: '10m' },
      targets: [
        {
          measurement: serviceId,
          fields: [
            `${names.beerSensor}/value[${tempUnit}]`,
            `${names.beerSetpoint}/setting[${tempUnit}]`,
            `${names.coolPwm}/value`,
            `${names.coolAct}/state`,
          ],
        },
      ],
      renames: {
        [`${serviceId}/${names.beerSensor}/value[${tempUnit}]`]: 'Beer temperature',
        [`${serviceId}/${names.beerSetpoint}/setting[${tempUnit}]`]: 'Beer setting',
        [`${serviceId}/${names.coolPwm}/value`]: 'Cool PWM value',
        [`${serviceId}/${names.coolAct}/state`]: 'Cool Pin state',
      },
      axes: {
        [`${serviceId}/${names.coolPwm}/value`]: 'y2',
        [`${serviceId}/${names.coolAct}/state`]: 'y2',
      },
      colors: {},
      precision: {},
    },
  };

  if (config.heated) {
    graph.config.targets[0].fields.push(
      `${names.heatPwm}/value`,
      `${names.heatAct}/state`,
    );
    Object.assign(graph.config.renames, {
      [`${serviceId}/${names.heatPwm}/value`]: 'Heat PWM value',
      [`${serviceId}/${names.heatAct}/state`]: 'Heat Pin state',
    });
    Object.assign(graph.config.axes, {
      [`${serviceId}/${names.heatPwm}/value`]: 'y2',
      [`${serviceId}/${names.heatAct}/state`]: 'y2',
    });
  }

  const beerModeId = nanoid();
  const beerTempControl: TempControlWidget = {
    ...createWidget(withPrefix(prefix, 'Assistant'), 'TempControl'),
    cols: 4,
    rows: 4,
    pinnedPosition: { x: 1, y: 6 },
    config: {
      serviceId,
      coolPid: bloxLink(names.coolPid, BlockType.Pid),
      heatPid: bloxLink(config.heated ? names.heatPid : null, BlockType.Pid),
      profile: bloxLink(names.beerProfile, BlockType.SetpointProfile),
      activeMode: beerModeId,
      modes: [
        {
          id: beerModeId,
          title: 'Beer',
          setpoint: bloxLink(names.beerSetpoint, BlockType.SetpointSensorPair),
          coolConfig: makeGlycolBeerCoolConfig(),
          heatConfig: config.heated ? makeGlycolBeerHeatConfig() : null,
        },
      ],
    },
  };

  const glycolModeId = nanoid();
  const glycolTempControl: TempControlWidget = {
    ...createWidget(withPrefix(prefix, 'Glycol'), 'TempControl'),
    cols: 4,
    rows: 4,
    pinnedPosition: { x: 1, y: 10 },
    config: {
      serviceId,
      coolPid: bloxLink(names.glycolPid, BlockType.Pid),
      heatPid: bloxLink(null, BlockType.Pid),
      profile: bloxLink(null, BlockType.SetpointProfile),
      activeMode: glycolModeId,
      modes: [
        {
          id: glycolModeId,
          title: 'Glycol',
          setpoint: bloxLink(names.glycolSetpoint, BlockType.SetpointSensorPair),
          coolConfig: makeGlycolConfig(),
          heatConfig: null,
        },
      ],
    },
  };

  const profile: Widget = {
    ...createWidget(names.beerProfile, BlockType.SetpointProfile),
    cols: 6,
    rows: 4,
    pinnedPosition: { x: 5, y: 6 },
  };

  const output: Widget[] = [
    builder,
    graph,
    beerTempControl,
    profile,
  ];

  if (glycolControl === 'Control') {
    output.push(glycolTempControl);
  }

  return output;
}

export const defineDisplayedBlocks = (config: GlycolConfig): DisplayBlock[] => {
  const { coolPid, heatPid } = config.names;
  const output = [
    {
      blockId: coolPid,
      opts: {
        showDialog: false,
        color: '037cd5',
        name: withoutPrefix(config.prefix, coolPid),
      },
    },
  ];
  if (config.heated) {
    output.push({
      blockId: heatPid,
      opts: {
        showDialog: false,
        color: 'df2b35',
        name: withoutPrefix(config.prefix, heatPid),
      },
    });
  }
  return output;
};

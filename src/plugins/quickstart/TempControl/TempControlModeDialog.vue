<script lang="ts">
import { computed, defineComponent, PropType, reactive } from 'vue';

import { useDialog, useGlobals } from '@/composables';
import { SparkServiceModule, sparkStore } from '@/plugins/spark/store';
import { BlockType, Quantity, SetpointSensorPairBlock } from '@/shared-types';
import { bloxQty, inverseTempQty } from '@/utils/bloxfield';
import { createDialog } from '@/utils/dialog';
import { deepCopy, typeMatchFilter } from '@/utils/functional';

import { PidConfig } from '../types';
import { TempControlMode } from './types';

const setpointFilter = typeMatchFilter(BlockType.SetpointSensorPair);
const durationRules: InputRule[] = [
  v => v >= 0 || 'Value must be positive',
  v => v < (2 ** 16 * 1000) || 'Value is too large to be stored in firmware',
];

export default defineComponent({
  name: 'TempControlModeDialog',
  props: {
    ...useDialog.props,
    modelValue: {
      type: Object as PropType<TempControlMode>,
      required: true,
    },
    saveMode: {
      type: Function as PropType<(mode: TempControlMode) => unknown>,
      required: true,
    },
    serviceId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: 'Edit control mode',
    },
    showConfirm: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    ...useDialog.emits,
  ],
  setup(props) {
    const {
      dense,
    } = useGlobals.setup();
    const {
      dialogRef,
      dialogProps,
      onDialogHide,
      onDialogOK,
      onDialogCancel,
    } = useDialog.setup();
    const tempMode = reactive<TempControlMode>(deepCopy(props.modelValue));

    function save(): void {
      props.saveMode(tempMode);
    }

    const module = computed<SparkServiceModule | null>(
      () => sparkStore.moduleById(props.serviceId),
    );

    const setpoint = computed<SetpointSensorPairBlock | null>(
      () => module.value?.blockByLink(tempMode.setpoint) ?? null,
    );

    function removeConfig(kind: 'cool' | 'heat'): void {
      createDialog({
        component: 'ConfirmDialog',
        componentProps: {
          title: `Remove ${kind} config`,
          message: `Are you sure you want to remove the ${kind} config from the ${tempMode.title} mode?`,
          noBackdropDismiss: true,
        },
      })
        .onOk(() => {
          tempMode[kind + 'Config'] = null;
          save();
        });
    }

    function updateConfig(cfg: 'cool' | 'heat', key: keyof PidConfig, value: Quantity): void {
      const config: PidConfig | undefined = tempMode[cfg + 'Config'];
      if (config) {
        config[key] = value;
        save();
      }
    }

    function addCoolConfig(): void {
      tempMode.coolConfig = {
        kp: inverseTempQty(-50),
        ti: bloxQty('0s'),
        td: bloxQty('0s'),
      };
      save();
    }

    function addHeatConfig(): void {
      tempMode.heatConfig = {
        kp: inverseTempQty(100),
        ti: bloxQty('0s'),
        td: bloxQty('0s'),
      };
      save();
    }

    return {
      setpointFilter,
      durationRules,
      dense,
      dialogRef,
      dialogProps,
      onDialogHide,
      onDialogCancel,
      onDialogOK,
      tempMode,
      save,
      setpoint,
      removeConfig,
      updateConfig,
      addCoolConfig,
      addHeatConfig,
    };
  },
});
</script>

<template>
  <q-dialog
    ref="dialogRef"
    :maximized="dense"
    v-bind="dialogProps"
    @hide="onDialogHide"
  >
    <Card>
      <template #toolbar>
        <Toolbar :title="title" subtitle="Temperature control mode" />
      </template>

      <q-card-section
        class="row q-gutter-xs"
      >
        <InputField
          :model-value="tempMode.title"
          label="Mode name"
          title="Mode name"
          class="col-grow"
          @update:model-value="v => { tempMode.title = v; save(); }"
        />

        <LinkField
          :model-value="tempMode.setpoint"
          :service-id="serviceId"
          :block-filter="setpointFilter"
          :label-color="!setpoint ? 'negative' : ''"
          title="PID input Setpoint"
          label="PID input Setpoint"
          class="col-grow"
          @update:model-value="v => { tempMode.setpoint = v; save(); }"
        />

        <div class="col-break" />

        <template v-if="tempMode.coolConfig">
          <QuantityField
            :model-value="tempMode.coolConfig.kp"
            title="Cool Kp"
            label="Cool Kp"
            class="col cool-field"
            @update:model-value="v => updateConfig('cool', 'kp', v)"
          />
          <DurationField
            :model-value="tempMode.coolConfig.ti"
            :rules="durationRules"
            title="Cool Ti"
            label="Cool Ti"
            class="col cool-field"
            @update:model-value="v => updateConfig('cool', 'ti', v)"
          />
          <DurationField
            :model-value="tempMode.coolConfig.td"
            :rules="durationRules"
            title="Cool Td"
            label="Cool Td"
            class="col cool-field"
            @update:model-value="v => updateConfig('cool', 'td', v)"
          />
          <q-btn
            flat
            icon="delete"
            @click="removeConfig('cool')"
          >
            <q-tooltip>
              Remove cool config from this mode.
            </q-tooltip>
          </q-btn>
        </template>
        <q-btn
          v-else
          flat
          color="blue"
          label="Add cool PID settings"
          @click="addCoolConfig"
        />

        <div class="col-break" />

        <template v-if="tempMode.heatConfig">
          <QuantityField
            :model-value="tempMode.heatConfig.kp"
            title="Heat Kp"
            label="Heat Kp"
            class="col heat-field"
            @update:model-value="v => updateConfig('heat', 'kp', v)"
          />
          <DurationField
            :model-value="tempMode.heatConfig.ti"
            :rules="durationRules"
            title="Heat Ti"
            label="Heat Ti"
            class="col heat-field"
            @update:model-value="v => updateConfig('heat', 'ti', v)"
          />
          <DurationField
            :model-value="tempMode.heatConfig.td"
            :rules="durationRules"
            title="Heat Td"
            label="Heat Td"
            class="col heat-field"
            @update:model-value="v => updateConfig('heat', 'td', v)"
          />
          <q-btn
            flat
            icon="delete"
            @click="removeConfig('heat')"
          >
            <q-tooltip>
              Remove heat config from this mode.
            </q-tooltip>
          </q-btn>
        </template>
        <q-btn
          v-else
          flat
          color="red"
          label="Add heat PID settings"
          @click="addHeatConfig"
        />
      </q-card-section>

      <q-card-section class="text-weight-light q-pt-none q-mx-xs">
        <q-item-label class="text-subtitle1">
          Temperature control with PID
        </q-item-label>
        <p>
          The minimal building blocks for a control system are:
          <ul>
            <li>A sensor, to measure what you want to control.</li>
            <li>A setpoint, the target value for the sensor.</li>
            <li>An actuator, to drive the sensor value towards the setpoint.</li>
            <li>
              A controller, in our case a PID,
              to calculate what the value for the actuator should be
              from the sensor and setpoint value.
            </li>
          </ul>
        </p>

        <p>
          Because the system can respond differently
          to the heater and the cooler, each has its own PID. <br>
          For more information, visit our <a
            href="https://brewblox.netlify.app/user/control_chains.html"
            target="_blank"
            style="color: white"
          >control chains guide</a>.
        </p>

        <q-item-label class="text-subtitle1">
          Control modes
        </q-item-label>
        <p>
          Control modes let you toggle between PID configurations.
        </p>
        <p>
          When you control fridge air temperature,
          the measured temperature will change more quickly
          than when you control a large volume of beer. <br>
          This requires different PID settings.
          By using control modes, you can store the settings, and switch between them.
        </p>
        <p>
          PID settings can still be tuned by changing the block settings.
          This widget detects changes,
          and will offer to either update or re-apply the mode settings.
        </p>
        <p>
          Each mode uses its own Setpoint and Temperature Sensor.
          When applying a mode, the PID input Setpoint is changed.
        </p>
      </q-card-section>

      <template v-if="showConfirm" #actions>
        <q-btn
          unelevated
          label="Cancel"
          @click="onDialogCancel"
        />
        <q-space />
        <q-btn
          unelevated
          label="Confirm"
          color="primary"
          @click="onDialogOK()"
        />
      </template>
    </Card>
  </q-dialog>
</template>

<style lang="sass" scoped>
.heat-field
  background: rgba($red, 0.1)

.cool-field
  background: rgba($blue, 0.1)
</style>

<script lang="ts">
import mapValues from 'lodash/mapValues';
import UrlSafeString from 'url-safe-string';
import { computed, defineComponent, PropType, reactive } from 'vue';

import { makeBlockIdRules } from '@/plugins/spark/utils';
import { makeDashboardIdRules } from '@/utils/dashboards';
import { ruleValidator, suggestId } from '@/utils/functional';

import { QuickstartConfig } from '../types';
import { withPrefix } from '../utils';


export default defineComponent({
  name: 'QuickstartNamingTask',
  props: {
    config: {
      type: Object as PropType<QuickstartConfig>,
      required: true,
    },
    defaultNames: {
      type: Object as PropType<AnyDict>,
      required: true,
    },
    defaultPrefix: {
      type: String,
      required: true,
    },
    defaultDashboardTitle: {
      type: String,
      required: true,
    },
  },
  emits: [
    'update:config',
    'back',
    'next',
  ],
  setup(props, { emit }) {
    const customNames = reactive<AnyDict>({});
    const idGenerator = new UrlSafeString();

    const serviceId = computed<string>(
      () => props.config.serviceId,
    );

    function updateConfig(cfg: Partial<QuickstartConfig>): void {
      emit('update:config', { ...props.config, ...cfg });
    }

    const prefix = computed<string>({
      get: () => props.config.prefix ?? props.defaultPrefix,
      set: prefix => updateConfig({ prefix }),
    });

    const dashboardTitle = computed<string>({
      get: () => props.config.dashboardTitle ?? props.defaultDashboardTitle,
      set: dashboardTitle => updateConfig({ dashboardTitle }),
    });

    const dashboardIdRules = makeDashboardIdRules();
    const dashboardIdValidator = ruleValidator(dashboardIdRules);

    const dashboardId = computed<string>({
      get: () => props.config.dashboardId
        ?? suggestId(idGenerator.generate(dashboardTitle.value), dashboardIdValidator),
      set: dashboardId => updateConfig({ dashboardId }),
    });

    // We want to avoid circular references between validator and the `actualNames` computed property
    // These rules do not yet check for duplicates
    const limitedNameRules = computed<InputRule[]>(
      () => makeBlockIdRules(serviceId.value),
    );

    const actualNames = computed<AnyDict>(
      () => ({
        ...mapValues(
          props.defaultNames,
          v => suggestId(withPrefix(prefix.value, v), ruleValidator(limitedNameRules.value)),
        ),
        ...customNames,
      }),
    );

    const nameRules = computed<InputRule[]>(
      () => [
        ...limitedNameRules.value,
        v => Object.values(actualNames.value).filter(n => n === v).length < 2
          || "Name can't be a duplicate",
      ],
    );

    const nameValidator = computed<(v: any) => boolean>(
      () => ruleValidator(nameRules.value),
    );

    const valuesOk = computed<boolean>(
      () =>
        [
          dashboardTitle,
          dashboardIdValidator(dashboardId.value),
          Object.values(actualNames.value).every(nameValidator.value),
        ]
          .every(Boolean),
    );

    function updateName(key: string, val: string): void {
      customNames[key] = val.trim();
    }

    function clearKey(key: keyof QuickstartConfig): void {
      updateConfig({ [key]: undefined });
    }

    function clearName(key: string): void {
      delete customNames[key];
    }

    function taskDone(): void {
      if (!valuesOk.value) {
        return;
      }
      updateConfig({
        prefix: prefix.value,
        names: actualNames.value,
        dashboardId: dashboardId.value,
        dashboardTitle: dashboardTitle.value,
      });
      emit('next');
    }

    return {
      dashboardIdRules,
      serviceId,
      prefix,
      dashboardTitle,
      dashboardId,
      nameRules,
      actualNames,
      valuesOk,
      updateName,
      clearKey,
      clearName,
      taskDone,
    };
  },
});
</script>

<template>
  <WizardBody>
    <q-card-section>
      <q-item class="text-weight-light">
        <q-item-section>
          <q-item-label class="text-subtitle1">
            Name your new dashboard and blocks
          </q-item-label>
        </q-item-section>
      </q-item>

      <!-- Dashboard title -->
      <QuickstartNameField
        v-model="dashboardTitle"
        label="Dashboard name"
        @clear="clearKey('dashboardTitle')"
      >
        <template #help>
          The name for the new dashboard.
        </template>
      </QuickstartNameField>

      <!-- Overall prefix -->
      <QuickstartPrefixField
        v-model="prefix"
        @clear="clearKey('prefix')"
      />

      <!-- Automatically generated names -->
      <q-expansion-item label="Generated names" icon="mdi-tag-multiple" dense>
        <!-- Dashboard ID -->
        <QuickstartNameField
          v-model="dashboardId"
          label="Dashboard ID"
          :rules="dashboardIdRules"
          @clear="clearKey('dashboardId')"
        >
          <template #help>
            The unique identifier for your dashboard.
            <br> By default, this is an URL-safe version of the dashboard title.
          </template>
        </QuickstartNameField>
        <!-- Block names -->
        <QuickstartNameField
          v-for="(nVal, nKey) in actualNames"
          :key="nKey"
          :model-value="nVal"
          :label="defaultNames[nKey]"
          :rules="nameRules"
          @clear="clearName(nKey)"
          @update:model-value="v => updateName(nKey, v)"
        />
      </q-expansion-item>
    </q-card-section>

    <template #actions>
      <q-btn
        unelevated
        label="Back"
        @click="$emit('back')"
      />
      <q-space />
      <q-btn
        :disable="!valuesOk"
        unelevated
        label="Next"
        color="primary"
        @click="taskDone"
      />
    </template>
  </WizardBody>
</template>

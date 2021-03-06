<script lang="ts">
import { computed, defineComponent, PropType, ref } from 'vue';

import { useDialog } from '@/composables';
import { ruleValidator } from '@/utils/functional';

export default defineComponent({
  name: 'DatetimeDialog',
  props: {
    ...useDialog.props,
    modelValue: {
      type: Date,
      required: true,
    },
    label: {
      type: String,
      default: 'Date and time',
    },
    resetIcon: {
      type: String,
      default: 'restore',
    },
    rules: {
      type: Array as PropType<InputRule[]>,
      default: () => [],
    },
  },
  emits: [
    ...useDialog.emits,
  ],
  setup(props) {
    const {
      dialogRef,
      dialogProps,
      onDialogHide,
      onDialogCancel,
      onDialogOK,
    } = useDialog.setup();
    const local = ref<Date | null>(props.modelValue);

    const valid = computed<boolean>(
      () => ruleValidator(props.rules)(local.value),
    );

    function save(): void {
      if (valid.value) {
        onDialogOK(local.value);
      }
    }

    return {
      dialogRef,
      dialogProps,
      onDialogHide,
      onDialogCancel,
      local,
      valid,
      save,
    };
  },
});
</script>

<template>
  <q-dialog
    ref="dialogRef"
    v-bind="dialogProps"
    @hide="onDialogHide"
    @keyup.enter="save"
  >
    <DialogCard v-bind="{title, message, html}">
      <DatetimeInput v-model="local" output="date" />
      <template #actions>
        <q-btn
          :icon="resetIcon"
          flat
          @click="local = new Date()"
        >
          <q-tooltip>Reset to current date and time</q-tooltip>
        </q-btn>
        <q-space />
        <q-btn
          flat
          color="primary"
          label="Cancel"
          @click="onDialogCancel"
        />
        <q-btn
          :disable="!valid"
          flat
          color="primary"
          label="OK"
          @click="save"
        />
      </template>
    </DialogCard>
  </q-dialog>
</template>

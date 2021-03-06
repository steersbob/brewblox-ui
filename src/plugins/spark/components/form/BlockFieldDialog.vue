<script lang="ts">
import { defineComponent, PropType, ref } from 'vue';

import { useDialog } from '@/composables';
import type { BlockAddress, BlockField } from '@/plugins/spark/types';
import { deepCopy } from '@/utils/functional';

export default defineComponent({
  name: 'BlockFieldDialog',
  props: {
    ...useDialog.props,
    modelValue: {
      type: [Object, Array, String, Number, Boolean, Date] as PropType<any>,
      required: true,
    },
    address: {
      type: Object as PropType<BlockAddress>,
      required: true,
    },
    field: {
      type: Object as PropType<BlockField>,
      required: true,
    },
    comparison: {
      type: Boolean,
      default: false,
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
      onDialogOK,
      onDialogCancel,
    } = useDialog.setup();
    const local = ref<any>(deepCopy(props.modelValue));

    function save(): void {
      onDialogOK(local.value);
    }

    return {
      dialogRef,
      dialogProps,
      onDialogHide,
      onDialogCancel,
      local,
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
      <component
        :is="field.component"
        v-model="local"
        v-bind="field.componentProps"
        :service-id="address.serviceId"
        :block-id="address.id"
        :comparison="comparison"
        editable
      />
      <template #actions>
        <q-btn flat label="Cancel" color="primary" @click="onDialogCancel" />
        <q-btn flat label="OK" color="primary" @click="save" />
      </template>
    </DialogCard>
  </q-dialog>
</template>

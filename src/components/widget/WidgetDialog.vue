<script lang="ts">
import { computed, defineComponent, PropType } from 'vue';

import { useDialog, useGlobals } from '@/composables';
import { ComponentResult, featureStore, WidgetContext, WidgetMode } from '@/store/features';
import { Widget, widgetStore } from '@/store/widgets';

export default defineComponent({
  name: 'WidgetDialog',
  props: {
    ...useDialog.props,
    widgetId: {
      type: String,
      required: true,
    },
    mode: {
      type: String as PropType<WidgetMode>,
      default: 'Full',
    },
    getProps: {
      type: Function as PropType<() => AnyDict>,
      default: () => ({}),
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
    } = useDialog.setup();
    const {
      dense,
    } = useGlobals.setup();

    const widget = computed<Widget | null>(
      () => widgetStore.widgetById(props.widgetId),
    );

    const context = computed<WidgetContext>(
      () => ({
        container: 'Dialog',
        mode: props.mode,
        size: 'Fixed',
      }),
    );

    const widgetComponent = computed<ComponentResult | null>(
      () => widget.value === null
        ? null
        : featureStore.widgetComponent(widget.value),
    );

    const widgetProps = computed<AnyDict>(
      () => props.getProps() ?? {},
    );

    return {
      dialogRef,
      dialogProps,
      onDialogHide,
      dense,
      context,
      widgetComponent,
      widgetProps,
    };
  },
});
</script>

<template>
  <q-dialog
    ref="dialogRef"
    :maximized="dense"
    v-bind="dialogProps"
    class="row"
    @hide="onDialogHide"
  >
    <WidgetProvider :widget-id="widgetId" :context="context">
      <component
        :is="widgetComponent.component"
        v-if="widgetComponent"
        :error="widgetComponent.error"
        v-bind="widgetProps"
        @close="onDialogHide"
      />
    </WidgetProvider>
  </q-dialog>
</template>

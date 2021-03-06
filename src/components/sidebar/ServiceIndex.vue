<script lang="ts">
import { computed, defineComponent, ref } from 'vue';

import { useGlobals } from '@/composables';
import { featureStore, ServiceFeature } from '@/store/features';
import { Service, ServiceStatus, serviceStore, ServiceStub } from '@/store/services';
import { objectSorter } from '@/utils/functional';
import { startChangeServiceTitle, startCreateService, startRemoveService } from '@/utils/services';

interface ServiceSuggestion {
  stub: ServiceStub;
  feature: ServiceFeature;
}

export default defineComponent({
  name: 'ServiceIndex',
  props: {
    editing: {
      type: Boolean,
      required: true,
    },
  },
  emits: [
    'update:editing',
  ],
  setup() {
    const { dense } = useGlobals.setup();
    const dragging = ref(false);

    const services = computed<Service[]>({
      // avoid modifying the store object
      get: () => [...serviceStore.services].sort(objectSorter('order')),
      set: services => serviceStore.updateServiceOrder(services.map(v => v.id)),
    });

    const suggestions = computed<ServiceSuggestion[]>(
      () => serviceStore
        .stubs
        .map(stub => {
          const feature = featureStore.serviceById(stub.type)!;
          return { stub, feature };
        })
        .filter(({ feature }) => feature !== null),
    );

    function status(service: Service): ServiceStatus | null {
      return serviceStore.statuses.find(v => v.id === service.id) ?? null;
    }

    return {
      dense,
      dragging,
      services,
      suggestions,
      status,
      startChangeServiceTitle,
      startCreateService,
      startRemoveService,
    };
  },
});
</script>

<template>
  <draggable
    v-model="services"
    :disabled="dense || !editing"
    item-key="id"
    @start="dragging=true"
    @end="dragging=false"
  >
    <template #header>
      <q-item class="q-pb-none">
        <q-item-section>
          <q-item-section class="text-bold">
            Services
          </q-item-section>
        </q-item-section>
        <q-item-section class="col-auto">
          <q-btn
            :disable="services.length === 0"
            :color="editing ? 'primary' : ''"
            icon="mdi-sort"
            round
            flat
            size="sm"
            @click="$emit('update:editing', !editing)"
          >
            <q-tooltip>
              Rearrange services
            </q-tooltip>
          </q-btn>
        </q-item-section>
      </q-item>
    </template>

    <template #item="{element}">
      <q-item
        :to="editing ? undefined : `/service/${element.id}`"
        :inset-level="0.2"
        :class="[
          'q-pb-sm',
          editing && 'bordered pointer',
        ]"
        style="min-height: 0px"
      >
        <q-item-section :class="['ellipsis', {'text-italic': editing}]">
          {{ element.title }}
        </q-item-section>
        <template v-if="status(element) !== null">
          <q-item-section class="col-auto q-mr-sm">
            <q-icon
              :name="status(element)?.icon || 'mdi-checkbox-blank-circle'"
              :color="status(element)?.color"
            />
            <q-tooltip>
              {{ status(element)?.desc }}
            </q-tooltip>
          </q-item-section>
        </template>
      </q-item>
    </template>

    <template #footer>
      <q-item
        v-for="({stub, feature}) in suggestions"
        :key="stub.id"
        :inset-level="0.2"
        class="q-pb-sm darkish"
        style="min-height: 0px"
        clickable
        @click="startCreateService(stub)"
      >
        <q-item-section class="col-auto">
          <q-icon name="add" size="xs" />
        </q-item-section>
        <q-item-section class="ellipsis">
          {{ stub.id }}
        </q-item-section>
        <q-item-section class="col-auto text-grey text-italic">
          Click to add
        </q-item-section>
        <q-tooltip>
          Click to create UI service for {{ feature.title }} '{{ stub.id }}'
        </q-tooltip>
      </q-item>
    </template>
  </draggable>
</template>

<style scoped>
.bordered {
  border: 1px solid whitesmoke;
  margin-top: 2px;
}
</style>

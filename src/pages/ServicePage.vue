<script lang="ts">
import { computed, defineComponent } from 'vue';

import { featureStore } from '@/store/features';
import { Service, serviceStore } from '@/store/services';

export default defineComponent({
  name: 'ServicePage',
  props: {
    routeId: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    const serviceId = computed<string>(
      () => props.routeId,
    );

    const service = computed<Service | null>(
      () => serviceStore.serviceById(serviceId.value),
    );

    const pageComponent = computed<string | null>(
      () => service.value !== null
        ? featureStore.serviceById(service.value.type)?.pageComponent ?? null
        : null,
    );

    return {
      serviceId,
      service,
      pageComponent,
    };
  },
});
</script>

<template>
  <component
    :is="pageComponent"
    v-if="pageComponent !== null"
    :service-id="serviceId"
  />
  <q-page v-else class="page-height text-h5 darkened">
    <PageError>
      <span v-if="service !== null">
        Invalid service page for <b>{{ serviceId }}</b>.
      </span>
      <span v-else>
        Service <b>{{ serviceId }}</b> not found.
      </span>
    </PageError>
  </q-page>
</template>

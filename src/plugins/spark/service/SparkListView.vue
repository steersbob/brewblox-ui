<script lang="ts">
import { computed, defineComponent, nextTick, ref } from 'vue';

import { useElementRefs, useGlobals } from '@/composables';
import { createBlockWizard } from '@/plugins/wizardry';
import { BlockType } from '@/shared-types';
import { featureStore, WidgetRole } from '@/store/features';
import { serviceStore } from '@/store/services';
import { createBlockDialog, createDialog } from '@/utils/dialog';
import { capitalized, objectStringSorter } from '@/utils/functional';

import { SparkServiceModule, sparkStore } from '../store';
import { SparkService } from '../types';
import SparkListWidgetWrapper from './SparkListWidgetWrapper.vue';
import { ListRenderAddress } from './types';

type ItemSortFunction = (a: ListRenderAddress, b: ListRenderAddress) => number

const roleIcons: Record<WidgetRole, string> = {
  Display: 'mdi-monitor-dashboard',
  Process: 'mdi-thermometer',
  Control: 'mdi-calculator-variant',
  Output: 'mdi-power-plug',
  Constraint: 'mdi-lock-outline',
  Other: 'mdi-cube',
};

const roleOrder: WidgetRole[] = [
  'Display',
  'Process',
  'Control',
  'Output',
  'Constraint',
  'Other',
];

const allSorters: Mapped<ItemSortFunction> = {
  unsorted: () => 0,
  name: (a, b) => objectStringSorter('id')(a, b),
  type: (a, b): number => {
    const left = a.title.toLowerCase();
    const right = b.title.toLowerCase();
    return left.localeCompare(right);
  },
  role: (a, b): number =>
    roleOrder.indexOf[a.role] - roleOrder.indexOf[b.role],
};


export default defineComponent({
  name: 'SparkListView',
  components: {
    SparkListWidgetWrapper,
  },
  props: {
    serviceId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const { dense } = useGlobals.setup();
    const {
      getElementRef,
      setElementRef,
    } = useElementRefs.setup();

    const validTypes: BlockType[] = sparkStore.specs.map(s => s.id);

    const searchText = ref<string | null>(null);
    const searchExpression = computed<RegExp>(
      () => RegExp(searchText.value ?? '', 'i'),
    );

    const service = computed<SparkService | null>(
      () => serviceStore.serviceById(props.serviceId),
    );

    const sparkModule = computed<SparkServiceModule | null>(
      () => sparkStore.moduleById(props.serviceId),
    );

    const sorting = computed<string>({
      get: () => sparkModule.value?.sessionConfig.sorting ?? 'name',
      set: v => sparkModule.value?.updateSessionConfig({ sorting: v }),
    });

    const sorter = computed<ItemSortFunction>(
      () => allSorters[sorting.value] ?? (() => 0),
    );

    const expanded = computed<string[]>({
      get: () => sparkModule.value?.sessionConfig.expanded ?? [],
      set: v => sparkModule.value?.updateSessionConfig({ expanded: v }),
    });

    const allRenderItems = computed<ListRenderAddress[]>(
      () => {
        const blockItems = sparkStore
          .serviceBlocks(props.serviceId)
          .filter(block => validTypes.includes(block.type))
          .map(block => ({
            serviceId: props.serviceId,
            id: block.id,
            type: block.type,
            name: block.id,
            title: featureStore.widgetTitle(block.type),
            role: featureStore.widgetRole(block.type),
          }))
          .sort(sorter.value)
          ?? [];

        // Override sorting - Device Info should always come first
        const sysIdx = blockItems.findIndex(v => v.type === BlockType.SysInfo);
        if (sysIdx !== -1) {
          blockItems.unshift(...blockItems.splice(sysIdx, 1));
        }

        return blockItems;
      },
    );

    const filteredRenderItems = computed<ListRenderAddress[]>(
      () => allRenderItems
        .value
        .filter(item => `${item.id} ${item.title}`.match(searchExpression.value)),
    );

    const expandedRenderItems = computed<ListRenderAddress[]>(
      () => filteredRenderItems
        .value
        .filter(item => expanded.value.includes(item.id)),
    );

    function scrollTo(id: string): void {
      getElementRef(id)?.scrollIntoView();
    }

    function setExpanded(id: string, enabled: boolean): void {
      const isExpanded = expanded.value.includes(id);
      if (isExpanded !== enabled) {
        const base = expanded.value.filter(v => v !== id);
        expanded.value = enabled
          ? [...base, id]
          : base;
      }
      if (enabled) {
        nextTick(() => scrollTo(id));
      }
    }

    function expandAll(): void {
      expanded.value = filteredRenderItems.value.map(v => v.id);
    }

    function expandNone(): void {
      expanded.value = [];
    }

    function onItemClick(item: ListRenderAddress): void {
      if (dense.value) {
        createBlockDialog(item, { mode: 'Basic' });
      }
      else {
        setExpanded(item.id, true);
      }
    }

    function startCreateBlock(): void {
      createBlockWizard(props.serviceId)
        .onOk(({ block }) => {
          if (block) {
            setExpanded(block.id, true);
          }
        });
    }

    function showSearchKeyboard(): void {
      createDialog({
        component: 'KeyboardDialog',
        componentProps: {
          modelValue: searchText.value,
        },
      })
        .onOk(v => searchText.value = v);
    }

    return {
      capitalized,
      roleIcons,
      allSorters,
      dense,
      setElementRef,
      searchText,
      service,
      sorting,
      expanded,
      filteredRenderItems,
      expandedRenderItems,
      setExpanded,
      expandAll,
      expandNone,
      onItemClick,
      startCreateBlock,
      showSearchKeyboard,
    };
  },
});
</script>

<template>
  <div
    class="q-pa-lg row no-wrap justify-start page-height"
    @dblclick="startCreateBlock"
  >
    <q-scroll-area
      visible
      class="content-column rounded-borders bg-dark"
    >
      <q-list class="q-pr-md" @dblclick.stop.prevent>
        <!-- Selection controls -->
        <q-item class="q-mb-md">
          <q-item-section>
            <q-input v-model="searchText" placeholder="Search blocks" clearable>
              <template #append>
                <KeyboardButton @click="showSearchKeyboard" />
                <q-icon name="search" />
              </template>
            </q-input>
          </q-item-section>
          <q-item-section class="col-auto">
            <q-btn icon="mdi-sort" flat>
              <q-tooltip>Sort blocks</q-tooltip>
              <q-menu>
                <q-list>
                  <ActionItem
                    v-for="(func, name) in allSorters"
                    :key="name"
                    :active="sorting === name"
                    :label="capitalized(name)"
                    @click="sorting = name"
                  />
                </q-list>
              </q-menu>
            </q-btn>
          </q-item-section>
          <q-item-section v-if="!dense" class="col-auto">
            <q-btn flat round icon="mdi-checkbox-multiple-blank-outline" @click="expandNone">
              <q-tooltip>Unselect all</q-tooltip>
            </q-btn>
          </q-item-section>
          <q-item-section v-if="!dense" class="col-auto">
            <q-btn flat round icon="mdi-checkbox-multiple-marked" @click="expandAll">
              <q-tooltip>Select all</q-tooltip>
            </q-btn>
          </q-item-section>
        </q-item>

        <!-- Index list -->
        <q-item
          v-for="val in filteredRenderItems"
          :key="`filtered-${val.id}`"
          class="non-selectable text-white widget-index"
        >
          <q-item-section v-if="!dense" side class="q-px-sm">
            <ToggleButton
              :model-value="expanded.includes(val.id)"
              flat
              @update:model-value="v => setExpanded(val.id, v)"
            />
          </q-item-section>
          <q-item-section>
            <q-item
              clickable
              @click="onItemClick(val)"
            >
              <q-item-section avatar>
                <q-icon :name="roleIcons[val.role]" />
                <q-tooltip>{{ val.role }}</q-tooltip>
              </q-item-section>
              <q-item-section>
                <q-item-label caption class="text-italic darkish">
                  {{ val.title }}
                </q-item-label>
                <div style="font-size: larger">
                  {{ val.name }}
                </div>
              </q-item-section>
            </q-item>
          </q-item-section>
        </q-item>
      </q-list>
    </q-scroll-area>

    <!-- Widget List -->
    <q-scroll-area
      v-if="!dense"
      visible
      class="content-column"
    >
      <q-list class="q-ml-lg q-pr-none" @dblclick.stop.prevent>
        <q-item
          v-for="item in expandedRenderItems"
          :ref="el => setElementRef(item.id, el)"
          :key="`expanded-${serviceId}-${item.id}`"
          class="q-pt-none q-pb-md"
        >
          <q-item-section>
            <SparkListWidgetWrapper :address="item" />
          </q-item-section>
        </q-item>
        <!-- Blank space to always be able to show a widget at the top -->
        <q-item class="page-height" @dblclick="startCreateBlock" />
      </q-list>
    </q-scroll-area>
  </div>
</template>

<style lang="sass" scoped>
.widget-index
  padding: 0

.content-column
  width: 550px
  max-width: 100vw
  height: 100%

.selected-mode
  background-color: $secondary
</style>

import { Plugin } from 'vue';

import { genericBlockFeature } from '@/plugins/spark/generic';
import { BlockType, InactiveObjectBlock } from '@/plugins/spark/types';
import { blockWidgetSelector } from '@/plugins/spark/utils';
import { featureStore, WidgetFeature } from '@/store/features';

import widget from './InactiveObjectWidget.vue';

const typeName = BlockType.InactiveObject;


const plugin: Plugin = {
  install(app) {

    const feature: WidgetFeature<InactiveObjectBlock> = {
      ...genericBlockFeature,
      id: typeName,
      title: 'Inactive Block',
      component: blockWidgetSelector(app, widget, typeName),
      wizard: false,
      widgetSize: {
        cols: 4,
        rows: 2,
      },
    };

    featureStore.addWidgetFeature(feature);
  },
};

export default plugin;

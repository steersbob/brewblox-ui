import { Plugin } from 'vue';

import { eventbus } from '@/eventbus';
import { deserialize } from '@/plugins/spark/parse-object';
import { startup } from '@/startup';
import { featureStore, WatcherFeature, WidgetFeature } from '@/store/features';
import { cref } from '@/utils/component-ref';
import { STATE_TOPIC } from '@/utils/const';

import AutomationWatcher from './AutomationWatcher.vue';
import AutomationWidget from './AutomationWidget.vue';
import { automationStore } from './store';
import { AutomationConfig, AutomationEvent } from './types';

const automationTopic = STATE_TOPIC + '/automation';

const plugin: Plugin = {
  install(app) {

    const widget: WidgetFeature<AutomationConfig> = {
      id: 'Automation',
      title: 'Automation (Deprecated)',
      component: cref(app, AutomationWidget),
      wizard: true,
      widgetSize: {
        cols: 4,
        rows: 5,
      },
      generateConfig: () => ({}),
    };

    const watcher: WatcherFeature = {
      id: 'AutomationWatcher',
      component: cref(app, AutomationWatcher),
      props: {},
    };

    featureStore.addWidgetFeature(widget);
    featureStore.addWatcherFeature(watcher);

    eventbus.subscribe(automationTopic);
    eventbus.addListener(
      automationTopic,
      (_, evt: AutomationEvent) => {
        if (evt.type === 'automation.active') {
          automationStore.setEventData(deserialize(evt.data));
        }
      });

    startup.onStart(() => automationStore.start());
  },
};

export default plugin;

import { ref } from '@/helpers/component-ref';
import { createProvider } from '@/store/providers/actions';
import { createFeature } from '@/store/features/actions';
import features from './features';
import { register } from './store';
import { fetchBlocks } from './store/actions';

import page from './provider/SparkPage.vue';
import wizard from './provider/SparkWizard.vue';

export default ({ store }: PluginArguments) => {
  Object
    .values(features)
    .forEach(feature => createFeature(store, feature));

  createProvider(store, {
    id: 'Spark',
    displayName: 'Spark Controller',
    features: Object.keys(features),
    initializer: register,
    fetcher: fetchBlocks,
    wizard: ref(wizard),
    page: ref(page),
  });
};
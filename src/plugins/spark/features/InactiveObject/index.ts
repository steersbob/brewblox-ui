import { ref } from '@/helpers/component-ref';
import { Feature } from '@/store/features/state';
import GenericBlock from '@/plugins/spark/components/GenericBlock';
import widget from './InactiveObjectWidget.vue';
import form from './InactiveObjectForm.vue';
import { typeName } from './getters';

const feature: Feature = {
  ...GenericBlock,
  id: typeName,
  displayName: 'Inactive Object',
  widget: ref(widget),
  form: ref(form),
  wizard: undefined,
  widgetSize: {
    cols: 3,
    rows: 2,
  },
};

export default feature;

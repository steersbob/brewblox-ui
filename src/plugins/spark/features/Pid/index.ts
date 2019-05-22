import { ref } from '@/helpers/component-ref';
import GenericBlock from '@/plugins/spark/components/GenericBlock';
import { Feature } from '@/store/types';
import { typeName } from './getters';
import form from './PidForm.vue';
import widget from './PidWidget.vue';

const feature: Feature = {
  ...GenericBlock,
  id: typeName,
  displayName: 'PID',
  role: 'Control',
  widget: ref(widget),
  form: ref(form),
  widgetSize: {
    cols: 4,
    rows: 3,
  },
};

export default feature;

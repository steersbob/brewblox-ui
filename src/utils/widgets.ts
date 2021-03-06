import { nanoid } from 'nanoid';

import { dashboardStore } from '@/store/dashboards';
import { featureStore } from '@/store/features';
import { Widget, widgetStore } from '@/store/widgets';

import { createDialog } from './dialog';
import { deepCopy } from './functional';
import notify from './notify';


export function startChangeWidgetTitle(widget: Widget): void {
  const widgetTitle = widget.title;
  createDialog({
    component: 'InputDialog',
    componentProps: {
      modelValue: widgetTitle,
      title: 'Change widget name',
      message: `Choose a new name for <b>${widgetTitle}</b>.`,
      html: true,
      clearable: false,
    },
  })
    .onOk((title: string) => widgetStore.saveWidget({ ...widget, title }));
}

export function startCopyWidget(widget: Widget): void {
  const id = nanoid();
  const selectOptions = dashboardStore
    .dashboards
    .map(dashboard => ({ label: dashboard.title, value: dashboard.id }));

  createDialog({
    component: 'SelectDialog',
    componentProps: {
      modelValue: null,
      title: 'Copy widget',
      message: `To which dashboard do you want to copy <b>${widget.title}</b>?`,
      html: true,
      listSelect: selectOptions.length < 10,
      selectOptions,
    },
  })
    .onOk((dashboard: string) => {
      if (dashboard) {
        widgetStore.appendWidget({
          ...deepCopy(widget),
          id,
          dashboard,
          pinnedPosition: null,
          volatile: undefined,
        });
        notify.done(`Copied <b>${widget.title}</b> to <b>${dashboardStore.dashboardTitle(dashboard)}</b>`);
      }
    });
}

export function startMoveWidget(widget: Widget): void {
  const selectOptions = dashboardStore
    .dashboards
    .filter(dashboard => dashboard.id !== widget.dashboard)
    .map(dashboard => ({ label: dashboard.title, value: dashboard.id }));

  createDialog({
    component: 'SelectDialog',
    componentProps: {
      modelValue: null,
      title: 'Move widget',
      message: `To which dashboard do you want to move <b>${widget.title}</b>?`,
      listSelect: selectOptions.length < 10,
      html: true,
      selectOptions,
    },
  })
    .onOk((dashboard: string) => {
      if (dashboard) {
        widgetStore.saveWidget({ ...widget, dashboard, pinnedPosition: null });
        notify.done(`Moved <b>${widget.title}</b> to <b>${dashboardStore.dashboardTitle(dashboard)}</b>`);
      }
    });
}

export function startRemoveWidget(widget: Widget): void {
  const actions = featureStore.widgetRemoveActions(widget.feature);

  if (actions.length === 0) {
    createDialog({
      component: 'ConfirmDialog',
      componentProps: {
        title: 'Remove widget',
        message: `Are you sure you want to remove <b>${widget.title}</b>?`,
        html: true,
        ok: 'Yes',
        cancel: 'No',
      },
    })
      .onOk(() => widgetStore.removeWidget(widget));
  }
  else {
    // Quasar dialog can't handle objects as value - they will be returned as null
    // As workaround, we use array index as value, and add the "action" key to each option
    const selectOptions = [
      {
        label: 'Remove widget from this dashboard',
        value: 0,
        action: () => widgetStore.removeWidget(widget),
      },
      ...actions.map((opt, idx) => ({
        label: opt.description,
        value: idx + 1,
        action: opt.action,
      })),
    ];
    createDialog({
      component: 'CheckboxDialog',
      componentProps: {
        title: 'Remove widget',
        message: `How do you want to remove widget <b>${widget.title}</b>?`,
        html: true,
        modelValue: [0], // pre-check the default action
        selectOptions,
      },
    })
      .onOk((selected: number[]) => {
        selected.forEach(idx => selectOptions[idx].action(widget));
      });
  }
}

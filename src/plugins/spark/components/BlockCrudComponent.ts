import get from 'lodash/get';
import { Dialog } from 'quasar';
import { Component, Prop } from 'vue-property-decorator';

import { GraphConfig } from '@/components/Graph/types';
import CrudComponent, { Crud } from '@/components/Widget/CrudComponent';
import { showBlockDialog } from '@/helpers/dialog';
import { postfixedDisplayNames } from '@/helpers/units';
import { sparkStore } from '@/plugins/spark/store';

import { blockIdRules } from '../helpers';
import { Block } from '../types';

export interface BlockCrud extends Crud {
  block: Block;
  isStoreBlock: boolean;
  saveBlock: (block: Block) => unknown | Promise<unknown>;
}

@Component
export default class BlockCrudComponent extends CrudComponent {
  private activeDialog: any = null;

  @Prop({ type: Object, required: true })
  public readonly crud!: BlockCrud;

  public get block(): Block {
    return this.crud.block;
  }

  public get isStoreBlock(): boolean {
    return this.crud.isStoreBlock;
  }

  public get blockId(): string {
    return this.block.id;
  }

  public get serviceId(): string {
    return this.block.serviceId;
  }

  public get isDriven(): boolean {
    return sparkStore.drivenChains(this.serviceId)
      .some((chain: string[]) => chain[0] === this.block.id);
  }

  public get constrainers(): string | null {
    const limiting: string[] = sparkStore.limiters(this.serviceId)[this.blockId];
    return limiting ? limiting.join(', ') : null;
  }

  public get hasGraph() {
    return !!get(sparkStore.specs, [this.block.type, 'graphTargets'], null);
  }

  public get renamedTargets(): Record<string, string> {
    const targets = get(sparkStore.specs, [this.block.type, 'graphTargets'], null);
    return !!targets
      ? postfixedDisplayNames(targets, this.block.data)
      : {};
  }

  public get graphCfg(): GraphConfig {
    const blockFmt = (val: string): string => [this.blockId, val].join('/');
    const serviceFmt = (val: string): string => [this.serviceId, this.blockId, val].join('/');

    return {
      // persisted in config
      params: this.widget.config.queryParams || { duration: '10m' },
      axes: this.widget.config.graphAxes || {},
      // constants
      layout: {
        title: this.widget.title,
      },
      targets: [
        {
          measurement: this.serviceId,
          fields: Object.keys(this.renamedTargets)
            .map(k => blockFmt(k)),
        },
      ],
      renames: Object.entries(this.renamedTargets)
        .reduce((acc, [k, v]) => ({ ...acc, [serviceFmt(k)]: v }), {}),
    };
  }

  public set graphCfg(config: GraphConfig) {
    this.saveConfig({
      ...this.widget.config,
      queryParams: { ...config.params },
      graphAxes: { ...config.axes },
    });
  }

  public async saveBlock(block: Block = this.block) {
    await this.crud.saveBlock(block);
  }

  public async removeBlock() {
    if (this.isStoreBlock) {
      await sparkStore.removeBlock([this.serviceId, this.block]);
      this.closeDialog();
    }
  }

  public async refreshBlock() {
    if (this.isStoreBlock) {
      await sparkStore.fetchBlock([this.serviceId, this.block])
        .catch(() => { });
    }
  }

  public async changeBlockId(newId: string) {
    if (this.isStoreBlock) {
      await sparkStore.renameBlock([this.serviceId, this.blockId, newId])
        .catch(() => { });
    } else {
      await this.saveBlock({ ...this.block, id: newId });
    }
  }

  public async switchBlock(blockId: string) {
    await this.saveConfig({ ...this.widget.config, blockId });
  }

  public openModal(opts: { formProps?: any; graphProps?: any } = {}): void {
    const { formProps, graphProps } = opts;
    this.activeDialog = Dialog.create({
      component: 'FormDialog',
      root: this.$root,
      getCrud: () => ({ ...this.crud, closeDialog: this.closeDialog }),
      getProps: () => formProps,
      getGraphProps: () => graphProps,
    });
  }

  public closeDialog() {
    if (this.activeDialog) {
      this.activeDialog.hide();
      this.activeDialog = null;
    }
    this.closeDialog();
  }

  public showOtherBlock(block: Block, props: any = {}) {
    showBlockDialog(block, props);
  }

  public startChangeBlockId() {
    let blockId = this.blockId;
    Dialog.create({
      component: 'InputDialog',
      title: 'Change Block name',
      message: `Choose a new name for '${this.blockId}'`,
      rules: blockIdRules(this.serviceId),
      value: blockId,
    })
      .onOk(async (newId: string) => {
        await this.changeBlockId(newId);
        this.closeDialog();
      });
  }

  public startSwitchBlock() {
    Dialog.create({
      component: 'BlockDialog',
      title: 'Choose a Block',
      message: 'You can change the Block that will be displayed by this widget',
      filter: block => block.type === this.block.type,
      root: this.$root,
      serviceId: this.block.serviceId,
    })
      .onOk(block => this.switchBlock(block.id));
  }

  public startBlockInfo() {
    Dialog.create({
      component: 'BlockInfoDialog',
      block: this.block,
      root: this.$root,
    });
  }

  public startRemoveBlock() {
    Dialog.create({
      title: 'Remove Block',
      message: `Are you sure you want to remove ${this.block.id}?`,
      cancel: true,
      dark: true,
      persistent: true,
    })
      .onOk(this.removeBlock);
  }
}

import Vue from 'vue';
import { Component, Emit, Prop } from 'vue-property-decorator';

@Component
export default class ValEdit extends Vue {
  @Prop({ type: String, required: true })
  public readonly serviceId!: string;

  @Prop({ type: String, required: true })
  public readonly blockId!: string;

  @Prop({ type: Boolean, default: false })
  public readonly editable!: boolean;

  @Prop({ required: true })
  public readonly value!: any;

  @Emit('input')
  public saveField(val: any): any {
    return val;
  }

  public get field(): any {
    return this.value;
  }

  public set field(val: any) {
    this.saveField(val);
  }
}

import { ChannelConfig } from './types';

export const typeName = 'Spark';

export const configName = (val: ChannelConfig): string => ChannelConfig[val];

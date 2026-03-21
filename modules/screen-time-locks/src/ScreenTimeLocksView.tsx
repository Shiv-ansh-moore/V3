import { requireNativeView } from 'expo';
import * as React from 'react';

import { ScreenTimeLocksViewProps } from './ScreenTimeLocks.types';

const NativeView: React.ComponentType<ScreenTimeLocksViewProps> =
  requireNativeView('ScreenTimeLocks');

export default function ScreenTimeLocksView(props: ScreenTimeLocksViewProps) {
  return <NativeView {...props} />;
}

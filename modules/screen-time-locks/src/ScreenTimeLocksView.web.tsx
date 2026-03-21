import * as React from 'react';

import { ScreenTimeLocksViewProps } from './ScreenTimeLocks.types';

export default function ScreenTimeLocksView(props: ScreenTimeLocksViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}

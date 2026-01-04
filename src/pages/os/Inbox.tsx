import React, { forwardRef } from 'react';
import InboxUnified from '@/components/admin/InboxUnified';

const OSInbox = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref} className="p-6">
      <InboxUnified />
    </div>
  );
});

OSInbox.displayName = 'OSInbox';

export default OSInbox;

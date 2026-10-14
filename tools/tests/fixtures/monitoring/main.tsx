import React from 'react';
import { createRoot } from 'react-dom/client';
import { DeviceMonitor } from '../../../../src/modules/iot/devices/DeviceMonitor';
createRoot(document.getElementById('root')!).render(<DeviceMonitor />);

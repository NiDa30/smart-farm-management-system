import React from 'react';
import { createRoot } from 'react-dom/client';
import { IoTEventLogger } from '../../../../src/modules/iot/events/IoTEventLogger';
createRoot(document.getElementById('root')!).render(<IoTEventLogger />);

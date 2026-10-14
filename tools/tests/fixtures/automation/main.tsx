import React from 'react';
import { createRoot } from 'react-dom/client';
import { AutomationManager } from '../../../../src/modules/iot/automation/AutomationManager';

createRoot(document.getElementById('root')!).render(<AutomationManager />);

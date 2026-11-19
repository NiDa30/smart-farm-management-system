import React from 'react';
import { createRoot } from 'react-dom/client';
import { ActuatorPanel } from '../../../../src/modules/iot/actuators/ActuatorPanel';
createRoot(document.getElementById('root')!).render(<ActuatorPanel />);

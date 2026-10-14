import React from 'react';
import {createRoot} from 'react-dom/client';
import {WaterEnergyMonitor} from '../../../../src/modules/iot/resources/WaterEnergyMonitor';
createRoot(document.getElementById('root')!).render(<WaterEnergyMonitor/>);

import "cockpit-dark-theme";
//import "@patternfly/patternfly/patternfly-base.scss";
import '@patternfly/react-core/dist/styles/base.css';

import { createRoot } from 'react-dom/client';
import { Application } from './app';

//import "patternfly/patternfly-5-overrides.scss";

const container = document.getElementById('app');
if (!container)
  throw new Error('Headscale application mount point is missing');

createRoot(container).render(<Application />);


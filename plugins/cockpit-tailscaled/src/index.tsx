import "cockpit-dark-theme";
import '@patternfly/react-core/dist/styles/base.css';

import { createRoot } from 'react-dom/client';

import './app.scss';
import { Application } from './app';

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("app");
  if (container) {
    createRoot(container).render(<Application />);
  }
});

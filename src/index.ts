import "./style.scss";
import "./toc/style.scss";
import "./search/style.scss";
import "./header/style.scss";
import "./highlight/style.scss";

import mountTableOfContents from "./toc/";
import mountSearch from "./search/";
import mountHeader from "./header";
import mountHighlight from "./highlight/";
import mountPrint from "./print/";

document.addEventListener("DOMContentLoaded", () => {
  const components = {
    toc: mountTableOfContents,
    search: mountSearch,
    header: mountHeader,
    highlight: mountHighlight,
    print: mountPrint,
  };

  Object.entries(components).forEach(([name, mount]) => {
    try {
      mount();
    } catch (err) {
      console.error(`failed to mount ${name} component`);
    }
  });
});

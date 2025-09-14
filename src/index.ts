import "./style.scss";
import "./pdf.scss";
import "./layout.scss";
import "./print.scss";
import "./toc/style.scss";
import "./search/style.scss";
import "./header/style.scss";
import "./highlight/style.scss";
import "./life/style.scss";
import "./top/style.scss";
import "./anchor/style.scss";
import "./footnotes/style.scss";

import mountTableOfContents from "./toc";
import mountSearch from "./search";
import mountHeader from "./header";
import mountHighlight from "./highlight";
import mountPrint from "./print";
import mountLife from "./life";
import mountTop from "./top";
import mountAnchor from "./anchor";
import mountFootnotes from "./footnotes";

function scheduleTask(fn: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(fn);
  } else {
    return setTimeout(fn, 0);
  }
}

const COMPONENTS = {
  toc: mountTableOfContents,
  search: mountSearch,
  header: mountHeader,
  highlight: mountHighlight,
  print: mountPrint,
  life: mountLife,
  top: mountTop,
  anchor: mountAnchor,
  footnotes: mountFootnotes,
};

document.addEventListener("DOMContentLoaded", async () => {
  const mountPromises = Object.entries(COMPONENTS).map(([name, mount]) => {
    return new Promise<void>((resolve) => {
      scheduleTask(async () => {
        try {
          await Promise.resolve(mount());

          if (window.IS_DEV) {
            console.log(`Mounted ${name} component`);
          }
        } catch (err: any) {
          if (window.IS_DEV) {
            console.error(`Failed to mount ${name} component: ${err?.message}`);
            console.error(err);
          }
        } finally {
          resolve();
        }
      });
    });
  });

  await Promise.all(mountPromises);

  if (window.IS_DEV) {
    console.log("All components mounted");
  }
});

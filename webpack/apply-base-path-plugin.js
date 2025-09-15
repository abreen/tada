const { createApplyBasePath } = require("./util");
const { makeLogger } = require("./log");

const log = makeLogger(__filename, "debug");

module.exports = function externalLinks(md, siteVariables) {
  const applyBasePath = createApplyBasePath(siteVariables);

  function checkAndApplyBasePath(token) {
    if (token.type === "link_open") {
      const href = token.attrGet("href");

      if (href.startsWith("/")) {
        const afterApply = applyBasePath(href);
        log.debug`${href} -> ${afterApply}`;
        token.attrSet("href", afterApply);
      }
    }

    token.children?.map(checkAndApplyBasePath);
  }

  md.core.ruler.push("apply_base_path", (state) => {
    state.tokens.map(checkAndApplyBasePath);
  });
};

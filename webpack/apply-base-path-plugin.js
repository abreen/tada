const { createApplyBasePath } = require("../utils");

module.exports = function externalLinks(md, siteVariables) {
  const applyBasePath = createApplyBasePath(siteVariables);

  function checkAndApplyBasePath(token) {
    if (token.type === "link_open") {
      const href = token.attrGet("href");

      if (href.startsWith("/")) {
        token.attrSet("href", applyBasePath(href));
      }
    }

    token.children?.map(checkAndApplyBasePath);
  }

  md.core.ruler.push("apply_base_path", (state) => {
    state.tokens.map(checkAndApplyBasePath);
  });
};

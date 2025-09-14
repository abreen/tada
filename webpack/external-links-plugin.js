module.exports = function externalLinks(md, siteVariables) {
  function addClass(token) {
    if (token.type === "link_open") {
      const href = token.attrGet("href");

      if (href.match(/^https?:\/\/.*$/)) {
        const url = new URL(href);
        if (!siteVariables.internalDomains.includes(url.host)) {
          const className = token.attrGet("class");
          if (className) {
            token.attrSet("class", className + " external");
          } else {
            token.attrSet("class", "external");
          }

          token.attrSet("target", "_blank");
        }
      }
    }

    token.children?.map(addClass);
  }

  md.core.ruler.push("external_links", (state) => {
    state.tokens.map(addClass);
  });
};

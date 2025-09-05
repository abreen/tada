import hljs from "highlight.js/lib/core";
import java from "highlight.js/lib/languages/java";
hljs.registerLanguage("java", java);

export default () => {
  const codeBlocks = document.querySelectorAll("pre");
  codeBlocks.forEach((el) => {
    hljs.highlightElement(el);
  });

  return () => {};
};

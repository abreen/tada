title: Markdown Example
author: Alex Breen
avatar: alex
description: An example page showing Markdown features.

This example demonstrates the available Markdown features.

## Footnotes

Here's an example footnote[^1] whose definition is given at the end of the
Markdown document. To scroll to the footnote, click the footnote number. To
return to the footnote reference, press the return button.

## External links

When you add an [external link](http://google.com)---that is, a link starting
with `http://` or `https://` with a domain **not listed in the
`internalDomains` site variable**, it will get special styling and an
automatically applied `target="_blank"` attribute.

## Code highlighting

Here's a Java code block:

```java
public class App {
  public static void main(String[] args) {
    System.out.println("Hello world!");
  }
}
```

Only Java is supported by default, but you can configure more languages
by modifying `src/highlight/index.ts`. This is powered by
[highlight.js](https://highlightjs.org/).

## Expand/collapse

Here's a `<details>` element:

<<< details Title for details element

Here's what's inside the details element!

<<<

This is achieved with the following Markdown:

```markdown
<<< details Title for details element

Here's what's inside the details element!

<<<
```

## Alerts

Here's an alert, with the `warning` style:

!!! warning Important

Do not open until after Christmas!

!!!

This is achieved with the following Markdown:

```markdown
!!! warning Important

Do not open until after Christmas!

!!!
```

Here's the `note` style for alerts:

!!! note On chickens

Count them *after* they hatch.

!!!

## Sections

Here's a section:

::: section The title for the section goes here

The body of the section goes here.

Here's how an alert looks inside the section:

!!! warning

This is a warning

!!!

:::

The title for the section becomes an `<h2>` element.
This is achieved with the following Markdown:

```markdown
::: section The title for the section goes here

The body of the section goes here.

:::
```

## Styled lists

By adding additional HTML elements and CSS classes, we can style
the list numbers and bullets separately from the text. The
default style sheet uses `var(--theme-color)`. See `src/style.scss`.

Here's an ordered list:

1. First item
2. Second item
3. Third item

And here's an unordered list:

- First item
- Second item
- Third item

## Tables

Here's a table:

| First Header  | Second Header |
| ------------- | ------------- |
| Content Cell  | Content Cell  |
| Content Cell  | Content Cell  |

## Blockquote

Here's a blockquote:

> Praesent a neque eu tortor imperdiet lacinia. Cras id vehicula urna,
> non placerat sem.

## Thematic break (`<hr>`)

Use three or more hyphens or asterisks to add an `<hr>` element, which
adds visual separation and a large amount of padding:

---

Here's the content after the thematic break.


[^1]: An example page is a page with examples. Got it?
[^2]: In hac habitasse platea dictumst. Ut aliquet nisi a arcu accumsan congue.

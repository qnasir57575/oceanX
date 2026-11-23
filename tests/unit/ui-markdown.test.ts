/** Markdown rendering: sanitisation and heading-level mapping. */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "@/components/ui/markdown";

const render = (md: string, baseLevel?: 2 | 3 | 4) => renderToStaticMarkup(createElement(Markdown, { baseLevel }, md));

describe("Markdown", () => {
  it("never renders raw HTML or script", () => {
    const html = render('Hello <script>alert(1)</script> <img src=x onerror="alert(1)"> **bold**');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("strips javascript: links", () => {
    const html = render("[click](javascript:alert(1))");
    expect(html).not.toMatch(/href="javascript:/i);
  });

  it("opens external links in a new tab with rel=noopener", () => {
    const html = render("[site](https://example.org)");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("(opens in a new tab)");
  });

  it("maps the top heading to h2 by default without skipping levels", () => {
    expect(render("## About\n\n### Detail")).toMatch(/<h2[^>]*>About<\/h2>[\s\S]*<h3[^>]*>Detail<\/h3>/);
    expect(render("# Title\n\n## Section")).toMatch(/<h2[^>]*>Title<\/h2>[\s\S]*<h3[^>]*>Section<\/h3>/);
    expect(render("No headings here")).not.toMatch(/<h[1-6]/);
  });

  it("respects baseLevel", () => {
    expect(render("## Summary", 3)).toMatch(/<h3[^>]*>Summary<\/h3>/);
  });

  it("renders nothing for empty input", () => {
    expect(renderToStaticMarkup(createElement(Markdown, null, null))).toBe("");
  });
});

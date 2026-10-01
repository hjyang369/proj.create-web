export type SitePreviewPage = {
  pageOrder: number;
  html: string;
  css: string;
};

function sanitizePreviewHtml(html: string): string {
  return html
    .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*script\b[^>]*>/gi, "");
}

function sanitizePreviewCss(css: string): string {
  return css.replace(/<\/style/gi, "").replace(/<\s*script/gi, "");
}

function rewriteUploadUrls(source: string, assetOrigin: string): string {
  const origin = assetOrigin.replace(/\/$/, "");
  return source.replace(/(^|["'(\s])\/uploads\//g, `$1${origin}/uploads/`);
}

export function buildSitePreviewDocument(
  pages: SitePreviewPage[],
  assetOrigin?: string,
): string {
  const ordered = [...pages].sort((left, right) => left.pageOrder - right.pageOrder);
  const css = ordered
    .map((page) => {
      const safeCss = sanitizePreviewCss(page.css);
      return assetOrigin ? rewriteUploadUrls(safeCss, assetOrigin) : safeCss;
    })
    .join("\n");
  const html = ordered
    .map((page) => {
      const safeHtml = sanitizePreviewHtml(page.html);
      return assetOrigin ? rewriteUploadUrls(safeHtml, assetOrigin) : safeHtml;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${css}
</style>
</head>
<body>
${html}
</body>
</html>`;
}

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

function rewritePreviewSectionLinks(html: string): string {
  return html.replace(
    /\bhref\s*=\s*(["'])(?!https?:|mailto:|tel:)(?:\.\/|\/)?[^"'#]*?\.html(#[^"']*)?\1/gi,
    (_match, quote: string, hash: string | undefined) =>
      `href=${quote}${hash ?? "#"}${quote}`,
  );
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
      const safeHtml = rewritePreviewSectionLinks(sanitizePreviewHtml(page.html));
      return assetOrigin ? rewriteUploadUrls(safeHtml, assetOrigin) : safeHtml;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<base href="about:srcdoc">
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

/** iframe 내 섹션 클릭 감지용 스크립트 (allow-scripts sandbox 필요) */
const CLICK_DETECTOR_SCRIPT = [
  "<script>",
  "(function(){",
  "var editing=true;",
  "document.documentElement.classList.add('crep-editing');",
  "var style=document.createElement('style');",
  "style.textContent='html.crep-editing [data-crep-s] .crep-sel{outline:2px solid rgba(0,0,0,0.6);outline-offset:1px;cursor:pointer}html.crep-editing [data-crep-s] *:hover{outline:1px dashed rgba(0,0,0,0.25);outline-offset:1px;cursor:pointer}';",
  "document.head.appendChild(style);",
  "window.addEventListener('message',function(event){",
  "if(event.source!==window.parent) return;",
  "var data=event.data;",
  "if(!data||data.type!=='crep-set-mode') return;",
  "editing=!!data.editing;",
  "if(editing){document.documentElement.classList.add('crep-editing');return;}",
  "document.documentElement.classList.remove('crep-editing');",
  "var marked=document.querySelector('.crep-sel');",
  "if(marked) marked.classList.remove('crep-sel');",
  "});",
  // 각 페이지 래퍼의 자식 섹션에 인덱스 속성 부여
  "var pages=document.querySelectorAll('[data-crep-page]');",
  "for(var p=0;p<pages.length;p++){",
  "var sections=pages[p].children;",
  "for(var i=0;i<sections.length;i++){",
  "sections[i].setAttribute('data-crep-s',String(i));",
  "sections[i].setAttribute('data-crep-page',pages[p].getAttribute('data-crep-page'));",
  "}}",
  "document.addEventListener('click',function(e){",
  "if(!editing)return;",
  "var el=e.target;",
  // 텍스트 노드 등이면 부모 엘리먼트로
  "if(!el||!el.tagName) el=el.parentElement;",
  "if(!el||el===document.body||el===document.documentElement) return;",
  // 이전 선택 해제
  "var prev=document.querySelector('.crep-sel');",
  "if(prev) prev.classList.remove('crep-sel');",
  "el.classList.add('crep-sel');",
  // 부모 섹션 찾기 (pageOrder, sectionIndex)
  "var pageOrder=0,sectionIndex=0,ancestor=el;",
  "while(ancestor&&ancestor!==document.body){",
  "if(ancestor.hasAttribute&&ancestor.hasAttribute('data-crep-s')&&ancestor.hasAttribute('data-crep-page')){",
  "pageOrder=parseInt(ancestor.getAttribute('data-crep-page'),10);",
  "sectionIndex=parseInt(ancestor.getAttribute('data-crep-s'),10);",
  "break;}",
  "ancestor=ancestor.parentElement;}",
  // 요소의 outerHTML (data-crep 속성 제외)
  "var clone=el.cloneNode(true);",
  "clone.removeAttribute('data-crep-s');clone.removeAttribute('data-crep-page');clone.classList.remove('crep-sel');",
  "var elemHtml=clone.outerHTML||'';",
  "window.parent.postMessage({type:'crep-click',",
  "pageOrder:pageOrder,sectionIndex:sectionIndex,",
  "tagName:el.tagName.toLowerCase(),",
  "elementHtml:elemHtml.slice(0,2000),",
  "preview:(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,80)",
  "},'*');",
  "e.preventDefault();",
  "e.stopPropagation();",
  "},true);",
  "})();",
  "<" + "/script>",
].join("\n");

export type SitePreviewPageWithOrder = SitePreviewPage & { pageOrder: number };

/**
 * 편집 모드용 미리보기 문서를 생성한다.
 * iframe sandbox="allow-scripts"가 필요하다.
 * 각 섹션에 data-crep-s, data-crep-page 속성이 추가되어
 * 편집 모드에서 클릭 시 부모 창으로 postMessage를 보낸다.
 * 부모 창이 { type: "crep-set-mode", editing } 을 보내면
 * 보기 모드에서는 클릭을 가로채지 않는다.
 */
export function buildEditablePreviewDocument(
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
      const safeHtml = rewritePreviewSectionLinks(sanitizePreviewHtml(page.html));
      const withOrigin = assetOrigin ? rewriteUploadUrls(safeHtml, assetOrigin) : safeHtml;
      // data-crep-page 속성을 각 최상위 태그에 추가하기 위해 래핑
      return `<div data-crep-page="${page.pageOrder}" style="display:contents">${withOrigin}</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<base href="about:srcdoc">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${css}
</style>
</head>
<body>
${html}
${CLICK_DETECTOR_SCRIPT}
</body>
</html>`;
}

import {
  keepAllowedActions,
  SITE_INTERACTION_SCRIPT,
} from "./site-interactions";

export type SitePreviewPage = {
  pageOrder: number;
  html: string;
  css: string;
};

function sanitizePreviewHtml(html: string): string {
  return keepAllowedActions(
    html
      .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
      .replace(/<\s*script\b[^>]*>/gi, "")
      .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(
        /(\s(?:href|src)\s*=\s*)(["'])\s*javascript:[^"']*\2/gi,
        "$1$2#$2",
      ),
  );
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

/** 편집 화면이 번호를 매기는 범위. 완전한 문서는 body 안만 남긴다. */
function previewBodyHtml(html: string): string {
  const bodyOpen = html.search(/<body\b/i);
  if (bodyOpen < 0) return html;
  const openEnd = html.indexOf(">", bodyOpen);
  const bodyClose = html.toLowerCase().lastIndexOf("</body>");
  if (openEnd < 0 || bodyClose < openEnd) return html;
  return html.slice(openEnd + 1, bodyClose);
}

function rewriteUploadUrls(source: string, assetOrigin: string): string {
  const origin = assetOrigin.replace(/\/$/, "");
  return source.replace(/(^|["'(\s])\/uploads\//g, `$1${origin}/uploads/`);
}

/**
 * 미리보기 주소창에 보여줄 경로.
 * 첫 페이지는 `/`, 그 외는 `/admin`처럼 페이지 종류를 경로로 쓴다.
 */
export function previewPathForPages(
  pages: { pageType: string; pageOrder: number }[],
  pageOrder: number | null,
): string {
  if (pages.length === 0) return "/";

  const ordered = [...pages].sort(
    (left, right) => left.pageOrder - right.pageOrder,
  );
  const home = ordered[0];
  const page =
    ordered.find((item) => item.pageOrder === pageOrder) ?? home;
  if (!home || page.pageOrder === home.pageOrder) return "/";

  const slug = page.pageType
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
  return slug ? `/${slug}` : "/";
}

/** 주소창 드롭다운. 첫 페이지는 home page, 나머지는 /admin 같은 경로다. */
export function previewPageChoices(
  pages: { pageType: string; pageOrder: number }[],
): { pageOrder: number; label: string }[] {
  return [...pages]
    .sort((left, right) => left.pageOrder - right.pageOrder)
    .map((page) => {
      const path = previewPathForPages(pages, page.pageOrder);
      return {
        pageOrder: page.pageOrder,
        label: path === "/" ? "home page" : path,
      };
    });
}

/** 직접 편집한 링크 값을 미리보기용으로 바꾼다. (사이트 안 .html 링크 → 앵커) */
export function toPreviewHref(href: string): string {
  const match = href.match(
    /^(?!https?:|mailto:|tel:)(?:\.\/|\/)?[^"'#]*?\.html(#.*)?$/i,
  );
  return match ? (match[1] ?? "#") : href;
}

/** 직접 편집한 이미지 주소를 미리보기용으로 바꾼다. (/uploads → 백엔드 주소) */
export function toPreviewAssetUrl(src: string, assetOrigin: string): string {
  return src.startsWith("/uploads/")
    ? `${assetOrigin.replace(/\/$/, "")}${src}`
    : src;
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
${SITE_INTERACTION_SCRIPT}
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
  "style.textContent='html.crep-editing [data-crep-s] .crep-sel,html.crep-editing [data-crep-s].crep-sel{outline:2px solid rgba(0,0,0,0.6);outline-offset:1px;cursor:pointer}html.crep-editing [data-crep-s] *:hover{outline:1px dashed rgba(0,0,0,0.25);outline-offset:1px;cursor:pointer}';",
  "document.head.appendChild(style);",
  "window.addEventListener('message',function(event){",
  "if(event.source!==window.parent) return;",
  "var data=event.data;",
  "if(!data||data.type!=='crep-set-mode') return;",
  "editing=!!data.editing;",
  "if(editing){document.documentElement.classList.add('crep-editing');return;}",
  "document.documentElement.classList.remove('crep-editing');",
  "var marked=document.querySelectorAll('.crep-sel');",
  "for(var m=0;m<marked.length;m++)marked[m].classList.remove('crep-sel');",
  "});",
  // 각 페이지 래퍼의 자식 섹션에 인덱스 속성 부여, 그 안의 자식에도 inner 인덱스 부여
  "var roots={};",
  "var pages=document.querySelectorAll('[data-crep-page]');",
  "for(var p=0;p<pages.length;p++){",
  "roots[pages[p].getAttribute('data-crep-page')]=pages[p];",
  "var sections=pages[p].children;",
  "for(var i=0;i<sections.length;i++){",
  "sections[i].setAttribute('data-crep-s',String(i));",
  "sections[i].setAttribute('data-crep-page',pages[p].getAttribute('data-crep-page'));",
  "var inner=sections[i].children;",
  "for(var j=0;j<inner.length;j++){inner[j].setAttribute('data-crep-inner',String(j));}",
  "}}",
  "document.addEventListener('click',function(e){",
  "if(!editing)return;",
  "var el=e.target;",
  // 텍스트 노드 등이면 부모 엘리먼트로
  "if(!el||!el.tagName) el=el.parentElement;",
  "if(!el||el===document.body||el===document.documentElement) return;",
  // 이전 선택 해제
  "var prev=document.querySelectorAll('.crep-sel');",
  "for(var s=0;s<prev.length;s++)prev[s].classList.remove('crep-sel');",
  "el.classList.add('crep-sel');",
  // 부모 섹션 찾기 (pageOrder, sectionIndex, innerSectionIndex)
  "var pageOrder=0,sectionIndex=0,innerSectionIndex=-1,ancestor=el;",
  "while(ancestor&&ancestor!==document.body){",
  "if(ancestor.hasAttribute&&ancestor.hasAttribute('data-crep-s')&&ancestor.hasAttribute('data-crep-page')){",
  "pageOrder=parseInt(ancestor.getAttribute('data-crep-page'),10);",
  "sectionIndex=parseInt(ancestor.getAttribute('data-crep-s'),10);",
  "break;}",
  "if(ancestor.hasAttribute&&ancestor.hasAttribute('data-crep-inner')&&innerSectionIndex<0){",
  "innerSectionIndex=parseInt(ancestor.getAttribute('data-crep-inner'),10);}",
  "ancestor=ancestor.parentElement;}",
  // 요소의 outerHTML (data-crep 속성 제외)
  "var clone=el.cloneNode(true);",
  "clone.removeAttribute('data-crep-s');clone.removeAttribute('data-crep-page');clone.classList.remove('crep-sel');",
  "var elemHtml=clone.outerHTML||'';",
  "window.parent.postMessage({type:'crep-click',",
  "pageOrder:pageOrder,sectionIndex:sectionIndex,innerSectionIndex:innerSectionIndex,",
  "tagName:el.tagName.toLowerCase(),",
  "elementHtml:elemHtml.slice(0,2000),",
  "preview:(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,80)",
  "},'*');",
  "e.preventDefault();",
  "e.stopPropagation();",
  "},true);",
  // ---- 우클릭 직접 편집 ----
  // 위치(path) = 페이지 래퍼 아래 형제 순서. script는 세지 않는다. (부모와 같은 규칙)
  "function kids(el){var out=[];for(var i=0;i<el.children.length;i++){if(el.children[i].tagName!=='SCRIPT')out.push(el.children[i]);}return out;}",
  "function rootOf(el){var cur=el;while(cur&&cur!==document.body){if(cur.parentElement===document.body&&cur.hasAttribute('data-crep-page'))return cur;cur=cur.parentElement;}return null;}",
  "function pathOf(el,root){var path=[],cur=el;while(cur&&cur!==root){var par=cur.parentElement;if(!par)return null;path.unshift(kids(par).indexOf(cur));cur=par;}return cur===root?path:null;}",
  "function elByPath(root,path){var cur=root;for(var i=0;i<path.length;i++){cur=kids(cur)[path[i]];if(!cur)return null;}return cur;}",
  // 글자를 바꿀 자리: 자식 태그가 없으면 'whole', 있으면 글자 조각이 딱 하나일 때만 그 조각
  "function textPiece(el){if(kids(el).length===0)return 'whole';var found=null,count=0;for(var i=0;i<el.childNodes.length;i++){var n=el.childNodes[i];if(n.nodeType===3&&n.nodeValue.trim()!==''){count++;found=n;}}return count===1?found:null;}",
  "var TEXT_TAGS={H1:1,H2:1,H3:1,H4:1,H5:1,H6:1,P:1,SPAN:1,LI:1,BUTTON:1,LABEL:1,STRONG:1,EM:1,SMALL:1,BLOCKQUOTE:1,TD:1,TH:1,DT:1,DD:1,FIGCAPTION:1};",
  // img가 a 안에 있어도 img를 우선한다. 그 외에는 a, 글자 요소, 글자만 가진 요소 순서.
  "function solePicture(el){var list=kids(el);return list.length===1&&list[0].tagName==='IMG'?list[0]:null;}",
  "function pickTarget(el){",
  "if(el.tagName==='IMG')return el;",
  "if(el.tagName==='DIV')return el;",
  "var link=el.closest('a');if(link)return link;",
  "var cur=el;",
  "while(cur&&cur!==document.body){",
  "if(TEXT_TAGS[cur.tagName])return cur;",
  "if(cur.children.length===0&&(cur.textContent||'').trim()!=='')return cur;",
  "cur=cur.parentElement;}",
  "return el;}",
  "function toHex(color){var canvas=document.createElement('canvas');var ctx=canvas.getContext('2d');if(!ctx)return '';ctx.fillStyle='#000000';try{ctx.fillStyle=color;}catch(err){return '';}var out=String(ctx.fillStyle);return /^#[0-9a-f]{6}$/i.test(out)?out.toLowerCase():'';}",
  "function roundPx(size){var m=String(size).match(/^([\\d.]+)px$/);if(!m)return '';var n=Math.round(Number(m[1]));return n>=1&&n<=400?n+'px':'';}",
  "function roundWeight(weight){var name=String(weight);if(name==='normal')return '400';if(name==='bold')return '700';var n=Number(name);if(!isFinite(n))return '';var snapped=Math.round(n/100)*100;if(snapped<100)snapped=100;if(snapped>900)snapped=900;return String(snapped);}",
  "function backgroundHex(color){var value=String(color).replace(/\\s+/g,'').toLowerCase();if(value==='transparent'||value==='rgba(0,0,0,0)'||/\\/0\\)$/.test(value))return '';return toHex(color);}",
  "function paintedImage(el){var value=getComputedStyle(el).backgroundImage||'';return /url\\(/i.test(value)?value:'';}",
  "function closestDiv(el,root){var cur=el;while(cur&&cur!==document.body){if(cur.tagName==='DIV'&&cur!==root)return cur;if(cur===root)break;cur=cur.parentElement;}return null;}",
  "function paintedOwner(el,root){var cur=el;while(cur&&cur!==document.body){if(paintedImage(cur))return cur;if(cur===root)break;cur=cur.parentElement;}return null;}",
  "function backgroundOwner(el,root){if(el.tagName==='IMG')return el;var box=closestDiv(el,root);if(box)return box;var cur=el;while(cur&&cur!==document.body){if(paintedImage(cur))return cur;if(cur===root)break;cur=cur.parentElement;}return el;}",
  "document.addEventListener('contextmenu',function(e){",
  "if(!editing)return;",
  "e.preventDefault();",
  "e.stopPropagation();",
  "var el=e.target;",
  "if(!el||!el.tagName) el=el.parentElement;",
  "if(!el||el===document.body||el===document.documentElement) return;",
  "var target=pickTarget(el);",
  "var root=rootOf(target);",
  "if(!root) return;",
  "var path=pathOf(target,root);",
  "if(!path||path.length===0) return;",
  "var prev=document.querySelectorAll('.crep-sel');",
  "for(var s=0;s<prev.length;s++)prev[s].classList.remove('crep-sel');",
  "target.classList.add('crep-sel');",
  "var look=getComputedStyle(target);",
  "var fontSize=roundPx(look.fontSize);",
  "var color=toHex(look.color);",
  "var fontWeight=roundWeight(look.fontWeight);",
  "var owner=backgroundOwner(target,root);",
  "var backgroundPath=pathOf(owner,root)||path;",
  "var shown=paintedImage(owner)?owner:(paintedOwner(target,root)||owner);",
  "var ownerLook=getComputedStyle(owner);",
  "var backgroundColor=backgroundHex(ownerLook.backgroundColor);",
  "var backgroundImage=paintedImage(owner);",
  "if(!backgroundImage){var picture=solePicture(owner);if(picture)backgroundImage=picture.currentSrc||picture.getAttribute('src')||'';}",
  "if(!backgroundImage)backgroundImage=paintedImage(shown);",
  "var styleAttr=target.getAttribute('style')||'';",
  "var backgroundStyle=owner.getAttribute('style')||'';",
  "if(owner!==target)owner.classList.add('crep-sel');",
  "window.parent.postMessage({type:'crep-contextmenu',",
  "pageOrder:parseInt(root.getAttribute('data-crep-page'),10),",
  "path:path,backgroundPath:backgroundPath,tagName:target.tagName.toLowerCase(),backgroundTag:owner.tagName.toLowerCase(),",
  "fontSize:fontSize,color:color,fontWeight:fontWeight,backgroundColor:backgroundColor,backgroundImage:backgroundImage,style:styleAttr,backgroundStyle:backgroundStyle},'*');",
  "},true);",
  // 부모가 보낸 수정값을 그 위치의 요소 하나에만 바로 반영 (미리보기용)
  "window.addEventListener('message',function(event){",
  "if(event.source!==window.parent) return;",
  "var data=event.data;",
  "if(!data||data.type!=='crep-patch'||!Array.isArray(data.path)) return;",
  "var root=roots[String(data.pageOrder)];",
  "if(!root) return;",
  "var el=elByPath(root,data.path);",
  "if(!el) return;",
  "if(typeof data.text==='string'){var piece=textPiece(el);if(piece==='whole')el.textContent=data.text;else if(piece)piece.nodeValue=data.text;}",
  "if(typeof data.href==='string'&&!/^\\s*(javascript|data|vbscript):/i.test(data.href))el.setAttribute('href',data.href);",
  "if(typeof data.src==='string'&&!/^\\s*(javascript|data|vbscript):/i.test(data.src)){el.setAttribute('src',data.src);el.removeAttribute('srcset');}",
  "if(typeof data.alt==='string')el.setAttribute('alt',data.alt);",
  "if(typeof data.style==='string'){if(data.style==='')el.removeAttribute('style');else el.setAttribute('style',data.style);}",
  "else{",
  "if(typeof data.fontSize==='string'){if(data.fontSize==='')el.style.fontSize='';else{var size=data.fontSize.match(/^(\\d+)px$/);var n=size?Number(size[1]):0;if(n>=1&&n<=400)el.style.fontSize=n+'px';}}",
  "if(typeof data.color==='string'&&(data.color===''||/^#[0-9a-fA-F]{6}$/.test(data.color)))el.style.color=data.color;",
  "if(typeof data.fontWeight==='string'&&(data.fontWeight===''||/^(100|200|300|400|500|600|700|800|900)$/.test(data.fontWeight)))el.style.fontWeight=data.fontWeight;",
  "if(typeof data.backgroundColor==='string'&&(data.backgroundColor===''||/^#[0-9a-fA-F]{6}$/.test(data.backgroundColor)))el.style.backgroundColor=data.backgroundColor;",
  "if(typeof data.backgroundImage==='string'){",
  "var picture=solePicture(el);",
  "if(picture&&!paintedImage(el)){",
  "if(data.backgroundImage===''){picture.removeAttribute('src');picture.removeAttribute('srcset');picture.style.display='none';}",
  "else if(!/[\\s\"'()]/.test(data.backgroundImage)&&/^(https?:\\/\\/|\\/uploads\\/)/.test(data.backgroundImage)){",
  "picture.setAttribute('src',data.backgroundImage);picture.removeAttribute('srcset');picture.style.display='';}",
  "}else if(data.backgroundImage===''){el.style.backgroundImage='';el.style.backgroundSize='';el.style.backgroundPosition='';}",
  "else if(!/[\\s\"'()]/.test(data.backgroundImage)&&/^(https?:\\/\\/|\\/uploads\\/)/.test(data.backgroundImage)){",
  "el.style.backgroundImage='url(\"'+data.backgroundImage+'\")';",
  "el.style.backgroundSize='cover';el.style.backgroundPosition='center';}",
  "}",
  "}",
  "});",
  // 주소창용. 화면 위쪽에 걸린 페이지를 편집 여부와 상관없이 부모에게 알린다.
  "function reportPage(){",
  "if(window.innerHeight<1) return;",
  "var nodes=document.querySelectorAll('[data-crep-s][data-crep-page]');",
  "if(!nodes.length) return;",
  "var seen={},order=[];",
  "for(var i=0;i<nodes.length;i++){",
  "var id=nodes[i].getAttribute('data-crep-page');",
  "var rect=nodes[i].getBoundingClientRect();",
  "if(!seen[id]){seen[id]={top:rect.top};order.push(id);}",
  "else if(rect.top<seen[id].top){seen[id].top=rect.top;}",
  "}",
  "var focus=Math.min(96,window.innerHeight*0.2);",
  "var current=order[0];",
  "for(var j=0;j<order.length;j++){if(seen[order[j]].top<=focus)current=order[j];}",
  "var pageOrder=parseInt(current,10);",
  "if(pageOrder===shownPage) return;",
  "shownPage=pageOrder;",
  "window.parent.postMessage({type:'crep-page',pageOrder:pageOrder},'*');",
  "}",
  "var shownPage=-1;",
  "var pageTimer=0;",
  "window.addEventListener('scroll',function(){",
  "if(pageTimer) return;",
  "pageTimer=setTimeout(function(){pageTimer=0;reportPage();},80);",
  "},true);",
  "reportPage();",
  "window.addEventListener('message',function(event){",
  "if(event.source!==window.parent) return;",
  "var data=event.data;",
  "if(!data||data.type!=='crep-show-page') return;",
  "var id=String(data.pageOrder);",
  "var targets=document.querySelectorAll('[data-crep-s][data-crep-page]');",
  "for(var n=0;n<targets.length;n++){",
  "if(targets[n].getAttribute('data-crep-page')!==id) continue;",
  "targets[n].scrollIntoView({block:'start'});",
  "shownPage=-1;",
  "reportPage();",
  "return;",
  "}",
  "});",
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
      // head의 meta, title은 브라우저가 칸의 자식으로 남겨 헤더 번호를 뒤로 민다.
      // 서버는 body 안만 세므로, 편집 화면에도 body 안만 넣는다.
      const sectionHtml = previewBodyHtml(withOrigin);
      return `<div data-crep-page="${page.pageOrder}" style="display:contents">${sectionHtml}</div>`;
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
${SITE_INTERACTION_SCRIPT}
</body>
</html>`;
}

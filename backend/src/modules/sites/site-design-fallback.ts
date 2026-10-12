import type { GeneratedSitePage } from "./site-generation-response.js";
import type { HeroLayout, SiteDesignSpec } from "./site-design-spec.js";
import { heroTemplateFor } from "./section-templates.js";
import type { CreateSiteRecord } from "./sites.store.js";

const CTA_LABELS: Record<CreateSiteRecord["purpose"], string> = {
  company_intro: "소개 보기",
  investment: "자료 보기",
  sales: "상담하기",
  recruitment: "채용 보기",
  promotion: "살펴보기",
  inquiry: "상담 문의",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/[\s"'<>]/.test(url) || /^javascript:/i.test(url)) return null;
  return url;
}

const PHOTO_HEROES = new Set<HeroLayout>([
  "fullscreen-photo",
  "split-editorial",
  "asymmetric-photo",
  "overlapping-images",
  "product-showcase",
]);

function heroPhoto(hero: HeroLayout, input: CreateSiteRecord): string | null {
  if (!PHOTO_HEROES.has(hero)) return null;
  return safeUrl(input.photos[0]?.url);
}

function fillHero(design: SiteDesignSpec, input: CreateSiteRecord): string {
  const template = heroTemplateFor(design.layout.hero);
  const title = input.oneLineIntro.trim() || input.name;
  const lead = input.description?.trim() || input.businessType?.trim() || input.name;
  const kicker = input.businessType?.trim() || input.name;
  const cta = CTA_LABELS[input.purpose];
  let html = template.html
    .replaceAll("핵심 문장", escapeHtml(title))
    .replaceAll("아주 큰 제목", escapeHtml(title))
    .replaceAll("짧은 설명", escapeHtml(lead))
    .replaceAll("업종", escapeHtml(kicker))
    .replaceAll("제품", escapeHtml(kicker))
    .replaceAll("상담 문의", escapeHtml(cta))
    .replaceAll("살펴보기", escapeHtml(cta));

  const heroImage = heroPhoto(design.layout.hero, input);
  const secondImage = safeUrl(input.photos[1]?.url);
  if (secondImage) {
    html = html.replaceAll("HERO_IMAGE_2", escapeHtml(secondImage));
  } else {
    html = html.replace(/<img\b[^>]*src="HERO_IMAGE_2"[^>]*>/g, "");
  }
  if (heroImage) {
    html = html.replaceAll("HERO_IMAGE", escapeHtml(heroImage));
  } else {
    html = html.replace(/<img\b[^>]*src="HERO_IMAGE"[^>]*>/g, "");
  }
  return html;
}

const CORNER_RADIUS = { sharp: 0, subtle: 4, rounded: 12 } as const;

function cssFor(design: SiteDesignSpec, hasHeroImage: boolean): string {
  const template = heroTemplateFor(design.layout.hero);
  const heroCss = template.cssNotes.replace(/[가-힣].*$/u, "").trim();
  const imageOverride = hasHeroImage
    ? ""
    : ".hero-fullscreen__copy{color:var(--text)}";
  const radius = CORNER_RADIUS[design.layout.cornerStyle];

  return `:root{--accent:${design.palette.accent};--background:${design.palette.background};--surface:${design.palette.surface};--text:${design.palette.text};--muted:${design.palette.muted};--heading:${design.typography.headingFont};--body:${design.typography.bodyFont};--radius:${radius}px;--header-height:64px}
html{scroll-behavior:smooth}
body{margin:0;background:var(--background);color:var(--text);font-family:var(--body);font-size:17px;line-height:1.6}
h1,h2{font-family:var(--heading);font-weight:500;letter-spacing:-0.03em}
a{color:inherit}
.skip{position:absolute;left:-999px}
.skip:focus{left:16px;top:16px}
.site-header{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;height:var(--header-height);padding:0 24px;background:var(--background)}
.logo{font-weight:600;text-decoration:none}
.crep-nav__toggle{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)}
.crep-nav__panel{display:flex;gap:20px}
.crep-nav__panel a{text-decoration:none}
.wrap{width:min(1200px,calc(100% - 48px));margin:0 auto}
section{padding:96px 0}
.hero a,.cta{display:inline-block;margin-top:24px;padding:12px 20px;background:var(--accent);color:#fff;text-decoration:none;border-radius:var(--radius)}
.lead{max-width:40rem;color:var(--muted)}
.site-footer{padding:24px;color:var(--muted);font-size:14px}
${heroCss}
${imageOverride}
@media(max-width:800px){.crep-nav__panel{display:none}.crep-nav__toggle:checked ~ .crep-nav__panel{display:grid}}`;
}

function documentFor(
  input: CreateSiteRecord,
  design: SiteDesignSpec,
  body: string,
): string {
  const title = escapeHtml(input.name);
  const description = escapeHtml(input.oneLineIntro);
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><meta name="description" content="${description}"></head><body><a class="skip" href="#main">본문으로 이동</a><header class="site-header"><a class="logo" href="#main">${title}</a><div class="crep-nav"><input class="crep-nav__toggle" type="checkbox" id="crep-nav-toggle"><label class="crep-nav__button" for="crep-nav-toggle">메뉴</label><nav class="crep-nav__panel"><div><a href="#about">소개</a><a href="#services">서비스</a><a href="#contact">문의</a></div></nav></div></header><main id="main">${body}</main><footer class="site-footer"><p>© ${title}</p></footer></body></html>`;
}

function contactBlock(input: CreateSiteRecord): string {
  const lines = [
    input.address ? `<p>${escapeHtml(input.address)}</p>` : "",
    input.phone ? `<p><a href="tel:${escapeHtml(input.phone)}">${escapeHtml(input.phone)}</a></p>` : "",
    input.email
      ? `<p><a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a></p>`
      : "",
  ].join("");
  if (!lines) return "";
  return `<section id="contact" data-component-id="contact-1" data-component-type="contact"><div class="wrap"><h2>문의</h2>${lines}</div></section>`;
}

export function buildPagesFromDesign(
  input: CreateSiteRecord,
  design: SiteDesignSpec,
): GeneratedSitePage[] {
  const hero = fillHero(design, input);
  const about = `<section id="about" data-component-id="about-1" data-component-type="about"><div class="wrap"><h2>${escapeHtml(input.name)}</h2><p class="lead">${escapeHtml(input.description?.trim() || input.oneLineIntro)}</p></div></section>`;
  const services = `<section id="services" data-component-id="services-1" data-component-type="services"><div class="wrap"><h2>서비스</h2><p class="lead">${escapeHtml(input.oneLineIntro)}</p></div></section>`;
  const cta = `<section id="cta" data-component-id="cta-1" data-component-type="cta"><div class="wrap"><h2>${escapeHtml(input.oneLineIntro)}</h2><a class="cta" href="#contact">${escapeHtml(CTA_LABELS[input.purpose])}</a></div></section>`;
  const home = documentFor(
    input,
    design,
    `${hero}${about}${services}${contactBlock(input)}${cta}`,
  );
  const css = cssFor(design, heroPhoto(design.layout.hero, input) != null);
  const pageCount = Math.max(1, input.pageCount);
  const pages: GeneratedSitePage[] = [
    { pageType: "home", pageOrder: 1, html: home, css },
  ];

  for (let order = 2; order <= pageCount; order += 1) {
    const detail = documentFor(
      input,
      design,
      `<section data-component-id="detail-${order}" data-component-type="detail"><div class="wrap"><h1>${escapeHtml(input.name)}</h1><p class="lead">${escapeHtml(input.description?.trim() || input.oneLineIntro)}</p></div></section>`,
    );
    pages.push({
      pageType: "detail",
      pageOrder: order,
      html: detail,
      css: "",
    });
  }

  return pages;
}

import type { HeroLayout } from "./site-design-spec.js";

export type HeroTemplate = {
  id: string;
  html: string;
  cssNotes: string;
};

export const DESIGN_RULES = `[디자인 규칙]
콘텐츠 폭은 1120px에서 1280px입니다.
데스크톱 Hero 제목은 48px에서 80px, 본문은 16px에서 18px입니다.
섹션 사이 여백은 데스크톱에서 80px에서 144px입니다.
사용자가 고른 메인 컬러는 버튼, 링크, 작은 라벨에만 씁니다. 배경, 카드, 본문 글자 전체에 칠하지 않습니다.
제목 폰트와 본문 폰트는 각각 한 계열만 씁니다.
모든 섹션을 둥근 카드로 만들지 않습니다.
그림자는 아주 약하게, 필요한 곳에만 씁니다.`;

const TEMPLATES: Record<HeroLayout, HeroTemplate> = {
  "fullscreen-photo": {
    id: "hero-fullscreen-photo",
    html: `<section class="hero hero-fullscreen" data-component-id="hero-1" data-component-type="hero">
  <img class="hero-fullscreen__image" src="HERO_IMAGE" alt="대표 사진">
  <div class="hero-fullscreen__copy">
    <h1>핵심 문장</h1>
    <a class="hero-fullscreen__cta" href="#services">살펴보기</a>
  </div>
</section>`,
    cssNotes:
      ".hero-fullscreen{position:relative;min-height:80svh;display:flex;align-items:flex-end} .hero-fullscreen__image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover} .hero-fullscreen__copy{position:relative;z-index:1;max-width:40rem;padding:80px 48px;color:#fff}",
  },
  "split-editorial": {
    id: "hero-split-editorial",
    html: `<section class="hero hero-split" data-component-id="hero-1" data-component-type="hero">
  <div class="hero-split__copy">
    <p class="hero-split__kicker">업종</p>
    <h1>핵심 문장</h1>
    <p class="hero-split__lead">짧은 설명</p>
    <a class="hero-split__cta" href="#services">살펴보기</a>
  </div>
  <figure class="hero-split__media"><img src="HERO_IMAGE" alt="대표 사진"></figure>
</section>`,
    cssNotes:
      ".hero-split{display:grid;grid-template-columns:minmax(0,0.85fr) minmax(0,1.15fr);min-height:80svh;align-items:end} .hero-split__copy{max-width:36rem;padding:80px 48px} .hero-split h1{font-size:clamp(48px,6vw,80px);line-height:1.05;font-weight:500} .hero-split__media img{width:100%;height:100%;object-fit:cover} @media(max-width:800px){.hero-split{grid-template-columns:1fr}.hero-split__media{min-height:280px}}",
  },
  "asymmetric-photo": {
    id: "hero-asymmetric-photo",
    html: `<section class="hero hero-asymmetric" data-component-id="hero-1" data-component-type="hero">
  <h1 class="hero-asymmetric__title">아주 큰 제목</h1>
  <div class="hero-asymmetric__row">
    <p>짧은 설명</p>
    <figure class="hero-asymmetric__media"><img src="HERO_IMAGE" alt="대표 사진"></figure>
  </div>
</section>`,
    cssNotes:
      ".hero-asymmetric{padding:96px 48px} .hero-asymmetric__title{font-size:clamp(56px,8vw,80px);line-height:0.95;max-width:12ch} .hero-asymmetric__row{display:grid;grid-template-columns:minmax(0,0.7fr) minmax(0,1.3fr);gap:48px;align-items:end} .hero-asymmetric__media img{width:72%;margin-left:auto;aspect-ratio:4/5;object-fit:cover} @media(max-width:800px){.hero-asymmetric__row{grid-template-columns:1fr}.hero-asymmetric__media img{width:100%}}",
  },
  "typography-first": {
    id: "hero-typography-first",
    html: `<section class="hero hero-type" data-component-id="hero-1" data-component-type="hero">
  <h1 class="hero-type__title">아주 큰 제목</h1>
  <p class="hero-type__lead">짧은 설명</p>
  <a class="hero-type__cta" href="#services">살펴보기</a>
</section>`,
    cssNotes:
      ".hero-type{min-height:80svh;display:flex;flex-direction:column;justify-content:flex-end;padding:96px 48px} .hero-type__title{font-size:clamp(64px,12vw,120px);line-height:0.9;max-width:10ch;font-weight:500} .hero-type__lead{max-width:28rem}",
  },
  "centered-statement": {
    id: "hero-centered-statement",
    html: `<section class="hero hero-statement" data-component-id="hero-1" data-component-type="hero">
  <p class="hero-statement__kicker">업종</p>
  <h1>핵심 문장</h1>
  <a class="hero-statement__cta" href="#services">살펴보기</a>
</section>`,
    cssNotes:
      ".hero-statement{min-height:80svh;display:flex;flex-direction:column;justify-content:flex-end;padding:96px 24px} .hero-statement h1{font-size:clamp(48px,7vw,88px);max-width:14ch;line-height:0.95} 히어로 바로 아래에 같은 크기 카드 3개를 붙이지 마세요.",
  },
  "overlapping-images": {
    id: "hero-overlapping-images",
    html: `<section class="hero hero-overlap" data-component-id="hero-1" data-component-type="hero">
  <div class="hero-overlap__copy">
    <h1>핵심 문장</h1>
    <p>짧은 설명</p>
    <a class="hero-overlap__cta" href="#services">살펴보기</a>
  </div>
  <div class="hero-overlap__stage">
    <img class="hero-overlap__back" src="HERO_IMAGE" alt="대표 사진">
    <img class="hero-overlap__front" src="HERO_IMAGE_2" alt="보조 사진">
  </div>
</section>`,
    cssNotes:
      ".hero-overlap{display:grid;grid-template-columns:minmax(0,0.8fr) minmax(0,1.2fr);gap:32px;align-items:center;padding:80px 48px} .hero-overlap__stage{position:relative;min-height:420px} .hero-overlap__back{width:70%;aspect-ratio:4/5;object-fit:cover} .hero-overlap__front{position:absolute;right:0;bottom:0;width:48%;aspect-ratio:1;object-fit:cover} @media(max-width:800px){.hero-overlap{grid-template-columns:1fr}}",
  },
  "product-showcase": {
    id: "hero-product-showcase",
    html: `<section class="hero hero-product" data-component-id="hero-1" data-component-type="hero">
  <div class="hero-product__copy">
    <p class="hero-product__kicker">제품</p>
    <h1>핵심 문장</h1>
    <p>짧은 설명</p>
    <a class="hero-product__cta" href="#services">살펴보기</a>
  </div>
  <div class="hero-product__stage"><img src="HERO_IMAGE" alt="제품 화면"></div>
</section>`,
    cssNotes:
      ".hero-product{display:grid;grid-template-columns:minmax(0,0.8fr) minmax(0,1.2fr);gap:48px;align-items:center;min-height:80svh;padding:80px 48px} .hero-product__stage{background:#fff;border:1px solid rgba(0,0,0,0.08);padding:16px} .hero-product__stage img{width:100%;display:block} @media(max-width:800px){.hero-product{grid-template-columns:1fr}} 사진이 없으면 stage를 빈 프레임으로 두고 이미지 URL을 만들지 마세요.",
  },
  "minimal-graphic": {
    id: "hero-minimal-graphic",
    html: `<section class="hero hero-graphic" data-component-id="hero-1" data-component-type="hero">
  <div class="hero-graphic__panel" aria-hidden="true"></div>
  <div class="hero-graphic__copy">
    <h1>핵심 문장</h1>
    <p>짧은 설명</p>
    <a class="hero-graphic__cta" href="#services">살펴보기</a>
  </div>
</section>`,
    cssNotes:
      ".hero-graphic{display:grid;grid-template-columns:minmax(0,0.35fr) minmax(0,1fr);min-height:80svh} .hero-graphic__panel{background:var(--accent)} .hero-graphic__copy{display:flex;flex-direction:column;justify-content:flex-end;padding:80px 48px} .hero-graphic h1{font-size:clamp(48px,8vw,88px);line-height:0.95;max-width:12ch} @media(max-width:800px){.hero-graphic{grid-template-columns:1fr}.hero-graphic__panel{min-height:96px}}",
  },
};

export function heroTemplateFor(layout: HeroLayout): HeroTemplate {
  return TEMPLATES[layout];
}

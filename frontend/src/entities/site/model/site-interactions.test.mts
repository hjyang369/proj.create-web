import assert from "node:assert/strict";
import { describe, it } from "node:test";
import vm from "node:vm";
import { SITE_INTERACTION_SCRIPT } from "./site-interactions.ts";

type Attrs = Record<string, string>;

class El {
  tagName: string;
  id = "";
  hidden = false;
  nodeType = 1;
  attrs: Attrs = {};
  dataset: Record<string, string> = {};
  children: El[] = [];
  parentElement: El | null = null;
  scrolled: unknown = null;
  played = 0;

  constructor(tag: string) {
    this.tagName = tag.toUpperCase();
  }

  matches(selector: string): boolean {
    const action = selector.match(/^\[data-action="([^"]+)"\]$/);
    if (action) return this.attrs["data-action"] === action[1];
    const attr = selector.match(/^\[([^\]]+)\]$/);
    if (attr) return Object.prototype.hasOwnProperty.call(this.attrs, attr[1]);
    return this.tagName === selector.toUpperCase();
  }

  closest(selector: string): El | null {
    let current: El | null = this;
    while (current) {
      if (current.matches(selector)) return current;
      current = current.parentElement;
    }
    return null;
  }

  querySelectorAll(selector: string): El[] {
    const found: El[] = [];
    const walk = (node: El) => {
      for (const child of node.children) {
        if (child.matches(selector)) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  }

  querySelector(selector: string): El | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  contains(node: El | null): boolean {
    let current = node;
    while (current) {
      if (current === this) return true;
      current = current.parentElement;
    }
    return false;
  }

  setAttribute(name: string, value: string) {
    this.attrs[name] = value;
    if (name.startsWith("data-")) this.dataset[dataKey(name)] = value;
  }

  getAttribute(name: string) {
    return this.attrs[name] ?? null;
  }

  hasAttribute(name: string) {
    return Object.prototype.hasOwnProperty.call(this.attrs, name);
  }

  removeAttribute(name: string) {
    delete this.attrs[name];
    if (name.startsWith("data-")) delete this.dataset[dataKey(name)];
  }

  scrollIntoView(options: unknown) {
    this.scrolled = options;
  }

  play() {
    this.played += 1;
    return Promise.resolve();
  }
}

function dataKey(name: string) {
  return name.slice(5).replace(/-([a-z])/g, (_match, letter: string) =>
    letter.toUpperCase(),
  );
}

function applyAttrs(el: El, raw: string) {
  const pattern =
    /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  for (const match of raw.matchAll(pattern)) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    el.attrs[name] = value;
    if (name === "id") el.id = value;
    if (name === "hidden") el.hidden = true;
    if (name.startsWith("data-")) el.dataset[dataKey(name)] = value;
  }
}

function parseFragment(html: string): El {
  const root = new El("div");
  const stack = [root];
  const voids = new Set(["img", "input", "br", "hr", "source"]);
  const pattern =
    /<!--[\s\S]*?-->|<\/([a-zA-Z0-9:-]+)>|<([a-zA-Z0-9:-]+)([^>]*)\/?>/g;
  for (const match of html.matchAll(pattern)) {
    if (match[0].startsWith("<!--")) continue;
    if (match[1]) {
      const name = match[1].toUpperCase();
      while (stack.length > 1 && stack.at(-1)?.tagName !== name) stack.pop();
      if (stack.length > 1) stack.pop();
      continue;
    }
    const tag = match[2].toLowerCase();
    const el = new El(tag);
    applyAttrs(el, match[3] ?? "");
    const parent = stack.at(-1)!;
    el.parentElement = parent;
    parent.children.push(el);
    if (!match[0].endsWith("/>") && !voids.has(tag)) stack.push(el);
  }
  return root;
}

function mount(html: string) {
  const root = parseFragment(html);
  const listeners: Record<string, Array<(event: Record<string, unknown>) => void>> =
    {};
  let copied = "";
  let evaluated = false;
  const document = {
    body: root,
    addEventListener(type: string, fn: (event: Record<string, unknown>) => void) {
      (listeners[type] ??= []).push(fn);
    },
    getElementById(id: string) {
      const walk = (node: El): El | null => {
        if (node.id === id) return node;
        for (const child of node.children) {
          const found = walk(child);
          if (found) return found;
        }
        return null;
      };
      return walk(root);
    },
    querySelectorAll(selector: string) {
      return root.querySelectorAll(selector);
    },
  };
  const context = vm.createContext({
    document,
    navigator: {
      clipboard: {
        writeText(value: string) {
          copied = value;
          return Promise.resolve();
        },
      },
    },
    eval() {
      evaluated = true;
    },
  });
  const source = SITE_INTERACTION_SCRIPT.replace(/^<script>\n/, "").replace(
    /\n<\/script>$/,
    "",
  );
  vm.runInContext(source, context);

  function emit(type: string, event: Record<string, unknown>) {
    for (const fn of listeners[type] ?? []) fn(event);
  }

  return {
    document,
    copied: () => copied,
    evaluated: () => evaluated,
    click(el: El) {
      emit("click", {
        target: el,
        preventDefault() {
          this.prevented = true;
        },
        prevented: false,
      });
    },
    keydown(key: string) {
      emit("keydown", { key });
    },
  };
}

describe("사이트 동작 스크립트", () => {
  it("모달 data-action은 실행하지 않고, 목록 밖 값도 실행하지 않는다", () => {
    const page = mount(`
      <button id="open" type="button" data-action="modal.open" data-target="product-modal"><span id="label">상세보기</span></button>
      <div id="product-modal" hidden>내용</div>
      <button id="bad" type="button" data-action="alert(document.cookie)">나쁜 버튼</button>
    `);

    page.click(page.document.getElementById("label")!);
    assert.equal(page.document.getElementById("product-modal")!.hidden, true);
    page.click(page.document.getElementById("bad")!);
    assert.equal(page.evaluated(), false);
  });

  it("같은 탭 묶음의 선택한 화면만 보여 준다", () => {
    const page = mount(`
      <div data-tabs>
        <button id="intro" type="button" data-action="tabs.select" data-target="tab-intro">소개</button>
        <button id="price" type="button" data-action="tabs.select" data-target="tab-price">가격</button>
        <section id="tab-intro" data-tab-panel>소개</section>
        <section id="tab-price" data-tab-panel hidden>가격</section>
      </div>
      <div data-tabs>
        <section id="other" data-tab-panel>다른 묶음</section>
      </div>
    `);

    page.click(page.document.getElementById("price")!);

    assert.equal(page.document.getElementById("tab-intro")!.hidden, true);
    assert.equal(page.document.getElementById("tab-price")!.hidden, false);
    assert.equal(page.document.getElementById("other")!.hidden, false);
    assert.equal(
      page.document.getElementById("price")!.getAttribute("aria-selected"),
      "true",
    );
    assert.equal(
      page.document.getElementById("intro")!.getAttribute("aria-selected"),
      "false",
    );
  });

  it("캐러셀은 다음 사진으로 넘기고 마지막 다음은 처음으로 돌아온다", () => {
    const page = mount(`
      <div id="gallery" data-carousel>
        <div data-carousel-slide id="s1">1</div>
        <div data-carousel-slide id="s2" hidden>2</div>
        <div data-carousel-slide id="s3" hidden>3</div>
      </div>
      <button id="next" type="button" data-action="carousel.next" data-target="gallery">다음</button>
      <button id="prev" type="button" data-action="carousel.prev" data-target="gallery">이전</button>
    `);

    page.click(page.document.getElementById("next")!);
    assert.equal(page.document.getElementById("s1")!.hidden, true);
    assert.equal(page.document.getElementById("s2")!.hidden, false);

    page.click(page.document.getElementById("next")!);
    page.click(page.document.getElementById("next")!);
    assert.equal(page.document.getElementById("s1")!.hidden, false);
    assert.equal(page.document.getElementById("s3")!.hidden, true);

    page.click(page.document.getElementById("prev")!);
    assert.equal(page.document.getElementById("s3")!.hidden, false);
    assert.equal(page.document.getElementById("s1")!.hidden, true);
  });

  it("글자 복사와 영상 재생만 스크립트로 처리한다", async () => {
    const page = mount(`
      <button id="copy" type="button" data-action="clipboard.copy" data-value="hello@example.com">복사</button>
      <button id="menu" type="button" data-action="menu.toggle" data-target="mobile-nav">메뉴</button>
      <nav id="mobile-nav" hidden>내비게이션</nav>
      <button id="play" type="button" data-action="video.play" data-target="clip">재생</button>
      <video id="clip"></video>
    `);

    page.click(page.document.getElementById("copy")!);
    await Promise.resolve();
    assert.equal(page.copied(), "hello@example.com");
    assert.equal(
      page.document.getElementById("copy")!.getAttribute("data-copied"),
      "true",
    );

    page.click(page.document.getElementById("menu")!);
    assert.equal(page.document.getElementById("mobile-nav")!.hidden, true);

    page.click(page.document.getElementById("play")!);
    assert.equal(page.document.getElementById("clip")!.played, 1);
    assert.equal(page.evaluated(), false);
  });
});

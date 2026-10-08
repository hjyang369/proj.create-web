import { describe, expect, it } from "vitest";
import { keepAllowedActions } from "./interaction-actions.js";

describe("keepAllowedActions", () => {
  it("허용된 data-action만 남긴다", () => {
    const html = [
      '<button type="button" data-action="modal.open" data-target="m">열기</button>',
      '<button type="button" data-action="element.toggle" data-target="more">더보기</button>',
      '<button type="button" data-action="tabs.select" data-target="tab-price">가격</button>',
      '<button type="button" data-action="accordion.toggle" data-target="faq-1">질문</button>',
      '<button type="button" data-action="carousel.next" data-target="gallery">다음</button>',
      '<button type="button" data-action="carousel.prev" data-target="gallery">이전</button>',
      '<button type="button" data-action="scroll.to" data-target="services">이동</button>',
      '<button type="button" data-action=\'clipboard.copy\' data-value="hello@example.com">복사</button>',
      '<button type="button" data-action="dropdown.toggle" data-target="menu">메뉴</button>',
      '<button type="button" data-action="menu.toggle" data-target="nav">햄버거</button>',
      '<button type="button" data-action="video.play" data-target="clip">재생</button>',
      '<button type="button" data-action="alert(document.cookie)">나쁜 버튼</button>',
      '<button type="button" data-action="eval(1)">또 나쁜 버튼</button>',
    ].join("");

    const safe = keepAllowedActions(html);

    expect(safe).toContain('data-action="tabs.select"');
    expect(safe).toContain('data-action="carousel.next"');
    expect(safe).toContain('data-action="carousel.prev"');
    expect(safe).toContain("data-action='clipboard.copy'");
    expect(safe).toContain('data-action="video.play"');
    expect(safe).not.toContain('data-action="modal.open"');
    expect(safe).not.toContain('data-action="element.toggle"');
    expect(safe).not.toContain('data-action="accordion.toggle"');
    expect(safe).not.toContain('data-action="scroll.to"');
    expect(safe).not.toContain('data-action="dropdown.toggle"');
    expect(safe).not.toContain('data-action="menu.toggle"');
    expect(safe).toContain("나쁜 버튼");
    expect(safe).toContain("또 나쁜 버튼");
    expect(safe).not.toContain("alert(document.cookie)");
    expect(safe).not.toContain('data-action="eval(1)"');
  });
});

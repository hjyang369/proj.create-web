/** 백엔드 `interaction-actions.ts`의 동작 이름과 같아야 한다. */
const SITE_ACTIONS = [
  "tabs.select",
  "carousel.next",
  "carousel.prev",
  "clipboard.copy",
  "video.play",
] as const;

const ALLOWED_ACTIONS = new Set<string>(SITE_ACTIONS);

export function keepAllowedActions(html: string): string {
  return html.replace(
    /\sdata-action\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi,
    (
      full,
      doubleQuoted: string | undefined,
      singleQuoted: string | undefined,
      bare: string | undefined,
    ) => {
      const value = (doubleQuoted ?? singleQuoted ?? bare ?? "").trim();
      return ALLOWED_ACTIONS.has(value) ? full : "";
    },
  );
}

/**
 * AI HTML이 아니라 서비스가 미리보기에 넣는 동작 스크립트.
 * 탭, 사진 넘기기, 글자 복사, 영상 재생만 처리한다.
 * 펼치기, 메뉴, 모달, 이동은 HTML과 CSS가 처리하므로 여기 없다.
 * eval은 쓰지 않는다.
 */
export const SITE_INTERACTION_SCRIPT = `<script>
(function () {
  function byId(id) {
    if (!id) return null;
    return document.getElementById(id);
  }

  function moveSlide(trigger, delta) {
    var root = byId(trigger.dataset.target);
    if (!root || !root.querySelectorAll) return;
    var slides = root.querySelectorAll("[data-carousel-slide]");
    if (!slides.length) return;
    var current = 0;
    for (var i = 0; i < slides.length; i++) {
      if (!slides[i].hidden) {
        current = i;
        break;
      }
    }
    var next = (current + delta) % slides.length;
    if (next < 0) next += slides.length;
    for (var j = 0; j < slides.length; j++) {
      slides[j].hidden = j !== next;
    }
  }

  var actions = {
    "tabs.select": function (el) {
      var group = el.closest("[data-tabs]");
      if (!group) return;
      var targetId = el.dataset.target;
      var panels = group.querySelectorAll("[data-tab-panel]");
      for (var i = 0; i < panels.length; i++) {
        panels[i].hidden = panels[i].id !== targetId;
      }
      var tabs = group.querySelectorAll('[data-action="tabs.select"]');
      for (var j = 0; j < tabs.length; j++) {
        tabs[j].setAttribute("aria-selected", tabs[j] === el ? "true" : "false");
      }
    },
    "carousel.next": function (el) {
      moveSlide(el, 1);
    },
    "carousel.prev": function (el) {
      moveSlide(el, -1);
    },
    "clipboard.copy": function (el) {
      var clipboard = navigator.clipboard;
      if (!clipboard || !clipboard.writeText) return;
      clipboard.writeText(el.dataset.value || "").then(function () {
        el.setAttribute("data-copied", "true");
      }, function () {});
    },
    "video.play": function (el) {
      var node = byId(el.dataset.target);
      if (!node) return;
      var video = node.tagName === "VIDEO" ? node : node.querySelector("video");
      if (!video || !video.play) return;
      var pending = video.play();
      if (pending && pending.catch) pending.catch(function () {});
    }
  };

  document.addEventListener("click", function (event) {
    var node = event.target;
    if (node && node.nodeType === 3) node = node.parentElement;
    var trigger = node && node.closest ? node.closest("[data-action]") : null;
    if (!trigger) return;
    var handler = actions[trigger.dataset.action];
    if (!handler) return;
    if (event.preventDefault) event.preventDefault();
    handler(trigger);
  });
})();
</script>`;

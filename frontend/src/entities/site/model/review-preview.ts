export const REVIEW_PREVIEW_LENGTH = 40;

export type ReviewVisibility = "partial" | "full";

/** 로그인 전에는 리뷰 앞부분만 돌려준다. 전체 공개로 로그인한 경우에만 전문이다. */
export function visibleReviewText(
  full: string,
  visibility: ReviewVisibility,
  loggedIn: boolean,
): string {
  if (visibility === "full" && loggedIn) {
    return full;
  }
  const trimmed = full.trim();
  if (trimmed.length <= REVIEW_PREVIEW_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, REVIEW_PREVIEW_LENGTH)}…`;
}

/** 전체 공개이고 아직 로그인하지 않았을 때만 리뷰마다 로그인 버튼을 보여 준다. */
export function reviewLoginVisible(
  visibility: ReviewVisibility,
  loggedIn: boolean,
): boolean {
  return visibility === "full" && !loggedIn;
}

/**
 * 미리보기 iframe에 넣는 리뷰 표시 스크립트.
 * iframe은 부모의 로그인 저장소를 읽지 못하므로, 부모가 crep-review-session으로 알려 준다.
 */
export function reviewPreviewScript(
  visibility: ReviewVisibility | null,
): string {
  if (visibility !== "partial" && visibility !== "full") {
    return "";
  }

  return `<script>
(function () {
  var visibility = ${JSON.stringify(visibility)};
  var limit = ${REVIEW_PREVIEW_LENGTH};
  var loggedIn = false;

  function showText(full) {
    if (visibility === "full" && loggedIn) return full;
    var trimmed = String(full).replace(/^\\s+|\\s+$/g, "");
    if (trimmed.length <= limit) return trimmed;
    return trimmed.slice(0, limit) + "…";
  }

  function apply() {
    var nodes = document.querySelectorAll("[data-review-content]");
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!node.hasAttribute("data-review-full")) {
        node.setAttribute("data-review-full", node.textContent || "");
      }
      node.textContent = showText(node.getAttribute("data-review-full") || "");
    }
    var links = document.querySelectorAll("[data-review-login]");
    var showLogin = visibility === "full" && !loggedIn;
    for (var j = 0; j < links.length; j++) {
      links[j].hidden = !showLogin;
    }
  }

  window.crepApplyReviews = apply;
  apply();
  window.addEventListener("message", function (event) {
    if (event.source !== window.parent) return;
    var data = event.data;
    if (!data || data.type !== "crep-review-session") return;
    loggedIn = !!data.loggedIn;
    apply();
  });
})();
</script>`;
}

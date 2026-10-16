-- 리뷰를 골랐을 때 일부 공개(partial) 또는 전체 공개(full)를 저장한다.
-- 리뷰를 끄면 NULL이다.

ALTER TABLE site_inputs
  ADD COLUMN review_visibility ENUM('partial', 'full') NULL;

-- site_inputs: extra_contact 삭제, extra_request 추가, atmosphere를 6개 값으로 제한
-- 6개 밖 분위기는 enum으로 바꿀 수 없으므로 NULL로 비운 뒤 컬럼 타입을 바꾼다.

UPDATE site_inputs
SET atmosphere = NULL
WHERE atmosphere IS NOT NULL
  AND atmosphere NOT IN (
    'warm',
    'professional',
    'modern',
    'cute',
    'elegant',
    'bold'
  );

ALTER TABLE site_inputs
  DROP COLUMN extra_contact,
  ADD COLUMN extra_request TEXT NULL,
  MODIFY COLUMN atmosphere ENUM(
    'warm',
    'professional',
    'modern',
    'cute',
    'elegant',
    'bold'
  ) NULL;

-- sites: 배포 중인 버전과 편집 중인 버전을 site_edit_history 행으로 가리킨다.
-- 비어 있으면 각각 아직 배포 전, 저장된 버전을 연 적 없음이다.

ALTER TABLE sites
  ADD COLUMN published_history_id BIGINT NULL,
  ADD COLUMN editing_history_id BIGINT NULL,
  ADD CONSTRAINT sites_published_history_id_fk
    FOREIGN KEY (published_history_id) REFERENCES site_edit_history (id),
  ADD CONSTRAINT sites_editing_history_id_fk
    FOREIGN KEY (editing_history_id) REFERENCES site_edit_history (id);

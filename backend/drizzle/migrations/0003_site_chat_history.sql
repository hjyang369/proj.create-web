-- 편집 화면의 채팅 목록. 저장 버전(site_edit_history)과 따로 둔다.

CREATE TABLE site_chat_history (
  id BIGINT NOT NULL AUTO_INCREMENT,
  site_id BIGINT NOT NULL,
  type ENUM('ai-edit', 'regenerate') NOT NULL,
  label TEXT NOT NULL,
  page_order INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY site_chat_history_site_id_id_idx (site_id, id),
  CONSTRAINT site_chat_history_site_id_fk
    FOREIGN KEY (site_id) REFERENCES sites (id)
);

-- 게시판 이름과 글. 소개 페이지 HTML과 따로 저장한다.

ALTER TABLE site_inputs
  ADD COLUMN board_configs JSON NULL;

CREATE TABLE site_boards (
  id BIGINT NOT NULL AUTO_INCREMENT,
  site_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  board_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY site_boards_site_id_slug_uniq (site_id, slug),
  KEY site_boards_site_id_order_idx (site_id, board_order),
  CONSTRAINT site_boards_site_id_fk
    FOREIGN KEY (site_id) REFERENCES sites (id)
);

CREATE TABLE site_posts (
  id BIGINT NOT NULL AUTO_INCREMENT,
  board_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY site_posts_board_id_id_idx (board_id, id),
  CONSTRAINT site_posts_board_id_fk
    FOREIGN KEY (board_id) REFERENCES site_boards (id)
);

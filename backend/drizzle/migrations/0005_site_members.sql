-- 사이트 방문자 회원. 같은 이메일도 사이트마다 따로 저장한다.

CREATE TABLE site_members (
  id BIGINT NOT NULL AUTO_INCREMENT,
  site_id BIGINT NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY site_members_site_id_email_uniq (site_id, email),
  CONSTRAINT site_members_site_id_fk
    FOREIGN KEY (site_id) REFERENCES sites (id)
);

-- Seed initial terms version
-- Replace content_hash and url with actual values in production

INSERT INTO terms_versions (id, title, content_hash, url, is_active)
VALUES (
  'v1-2024-01-01',
  'Rentbox.ee tööriistade renditingimused',
  'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
  'https://rentbox.ee/terms/renditingimused.pdf',
  TRUE
)
ON CONFLICT(id) DO NOTHING;

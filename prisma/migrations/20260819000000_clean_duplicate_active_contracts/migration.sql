-- Nettoyer les contrats actifs en double par etablissement.
-- On garde le contrat le plus recent (par start_date puis created_at).
-- Les autres sont archives (status = 'RENEWED', deleted_at = NOW()).
-- Leurs vehicules sont reaffectes au contrat garde.

WITH kept AS (
  SELECT DISTINCT ON (establishment_id) id AS kept_id, establishment_id
  FROM contracts
  WHERE deleted_at IS NULL
  ORDER BY establishment_id, start_date DESC, created_at DESC
),
archived AS (
  UPDATE contracts c
  SET status = 'RENEWED', deleted_at = NOW(), updated_at = NOW()
  WHERE c.deleted_at IS NULL
    AND c.id NOT IN (SELECT kept_id FROM kept)
  RETURNING c.id AS archived_id, c.establishment_id
)
UPDATE vehicles v
SET contract_id = k.kept_id, updated_at = NOW()
FROM archived a
JOIN kept k ON k.establishment_id = a.establishment_id
WHERE v.deleted_at IS NULL
  AND v.contract_id = a.archived_id;

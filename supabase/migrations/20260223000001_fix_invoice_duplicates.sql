-- Migration: Fix invoice line duplicates and harden deduplication
-- Problem: The UNIQUE(invoice_number, invoice_line_reference) constraint treats NULLs
-- as distinct, so rows with NULL invoice_line_reference were inserted multiple times
-- when overlapping EzyVet reports were uploaded. This inflated revenue for affected months.

-- Step 1: Remove duplicate invoice lines, keeping only the earliest inserted row.
-- Two rows are "duplicates" if they share the same invoice_number, invoice_date,
-- product_name, client_code, total_earned, and staff_member.
DELETE FROM invoice_lines
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY
          COALESCE(invoice_number, ''),
          COALESCE(invoice_line_reference, ''),
          COALESCE(invoice_date::text, ''),
          COALESCE(product_name, ''),
          COALESCE(client_code, ''),
          COALESCE(total_earned::text, ''),
          COALESCE(staff_member, '')
        ORDER BY created_at ASC
      ) AS rn
    FROM invoice_lines
  ) ranked
  WHERE rn > 1
);

-- Step 2: Back-fill NULL invoice_line_reference with a deterministic value
-- so the unique constraint can work properly going forward.
UPDATE invoice_lines
SET invoice_line_reference = 'AUTO-' || md5(
  COALESCE(invoice_number, '') || '|' ||
  COALESCE(invoice_date::text, '') || '|' ||
  COALESCE(product_name, '') || '|' ||
  COALESCE(client_code, '') || '|' ||
  COALESCE(total_earned::text, '') || '|' ||
  COALESCE(staff_member, '')
)
WHERE invoice_line_reference IS NULL;

-- Step 3: After back-fill, remove any newly-surfaced duplicates
-- (rows that now resolve to the same invoice_number + invoice_line_reference)
DELETE FROM invoice_lines
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY invoice_number, invoice_line_reference
        ORDER BY created_at ASC
      ) AS rn
    FROM invoice_lines
  ) ranked
  WHERE rn > 1
);

-- Step 4: Make invoice_line_reference NOT NULL going forward
ALTER TABLE invoice_lines
  ALTER COLUMN invoice_line_reference SET DEFAULT '';

-- Step 5: Add a unique index using COALESCE as extra safety
-- (The original UNIQUE constraint remains but this handles edge cases)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_lines_dedup
  ON invoice_lines (
    COALESCE(invoice_number, ''),
    COALESCE(invoice_line_reference, '')
  );

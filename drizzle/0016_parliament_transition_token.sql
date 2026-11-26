-- Give each atomic parliamentary stage transition a unique write token.
-- Existing parliament records and their visible content remain unchanged.
ALTER TABLE parliament_items ADD COLUMN transition_token TEXT NOT NULL DEFAULT '';

-- ============================================================
-- chat_attachments: tracks uploaded images in chat context
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_attachments_uploader ON chat_attachments(uploader_user_id);
CREATE INDEX idx_chat_attachments_created ON chat_attachments(created_at);

ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;

-- Users can SELECT their own attachments (for thumbnail rendering)
CREATE POLICY "users_select_own_attachments" ON chat_attachments
  FOR SELECT USING (auth.uid() = uploader_user_id);

-- ============================================================
-- image_extractions: stores Azure vision analysis results
-- ============================================================
CREATE TABLE IF NOT EXISTS image_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id UUID NOT NULL REFERENCES chat_attachments(id) ON DELETE CASCADE,
  extracted_text TEXT NOT NULL,
  subject TEXT,
  confidence REAL,
  diagram_description TEXT,
  raw_json JSONB,
  model_used TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_image_extractions_attachment ON image_extractions(attachment_id);

ALTER TABLE image_extractions ENABLE ROW LEVEL SECURITY;

-- Users can SELECT extractions for their own attachments
CREATE POLICY "users_select_own_extractions" ON image_extractions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_attachments ca
      WHERE ca.id = image_extractions.attachment_id
        AND ca.uploader_user_id = auth.uid()
    )
  );

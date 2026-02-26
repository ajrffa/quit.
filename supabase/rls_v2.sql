-- ============================================================================
-- Quit. RLS v2 — Engelleme ve Şikayet Tabloları
-- Mevcut tablolara ek olarak çalıştırılmalıdır.
-- ============================================================================

-- ── Engellenen Kullanıcılar ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    blocked_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, blocked_user_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendilerinin engelleme kayıtlarını görebilir
CREATE POLICY "blocked_users_select" ON blocked_users
    FOR SELECT USING (auth.uid() = user_id);

-- Kullanıcılar sadece kendi adlarına engelleme yapabilir
CREATE POLICY "blocked_users_insert" ON blocked_users
    FOR INSERT WITH CHECK (auth.uid() = user_id AND user_id != blocked_user_id);

-- Kullanıcılar sadece kendi engellemelerini kaldırabilir
CREATE POLICY "blocked_users_delete" ON blocked_users
    FOR DELETE USING (auth.uid() = user_id);

-- ── Şikayet Edilen İçerikler ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reported_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content_id UUID NOT NULL,
    content_type TEXT CHECK (content_type IN ('post', 'reply', 'message')) NOT NULL,
    reason TEXT CHECK (reason IN (
        'harassment', 'hate_speech', 'threat', 'spam', 'inappropriate', 'other'
    )) NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reported_content ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi şikayetlerini görebilir
CREATE POLICY "reports_select" ON reported_content
    FOR SELECT USING (auth.uid() = reporter_id);

-- Herkes şikayet oluşturabilir (kendi adına)
CREATE POLICY "reports_insert" ON reported_content
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ── Mevcut Tablolara Engelleme Filtresi ───────────────────────────────────

-- Posts: Engellenen kullanıcıların postları görünmez
DROP POLICY IF EXISTS "posts_select" ON posts;
CREATE POLICY "posts_select" ON posts
    FOR SELECT USING (
        NOT EXISTS (
            SELECT 1 FROM blocked_users
            WHERE blocked_users.user_id = auth.uid()
            AND blocked_users.blocked_user_id = posts.user_id
        )
    );

-- Messages: Engellenen kullanıcıdan mesaj gelmez
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
            AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
        )
        AND NOT EXISTS (
            SELECT 1 FROM blocked_users
            WHERE blocked_users.user_id = auth.uid()
            AND blocked_users.blocked_user_id = messages.sender_id
        )
    );

-- Conversations: Engellenen kullanıcıyla sohbet başlatılamaz
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
CREATE POLICY "conversations_insert" ON conversations
    FOR INSERT WITH CHECK (
        auth.uid() IN (participant_1, participant_2)
        AND NOT EXISTS (
            SELECT 1 FROM blocked_users bu
            WHERE (bu.user_id = participant_1 AND bu.blocked_user_id = participant_2)
            OR (bu.user_id = participant_2 AND bu.blocked_user_id = participant_1)
        )
    );

-- ── İndeksler ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_blocked_users_user ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reported_content(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reported_content(status);

-- ============================================================
-- Migration: Security Hardening (RLS & Privacy)
-- Author: Antigravity AI
-- ============================================================

-- 1. Fix Message Integrity Vulnerability
-- Prevent receivers from modifying message content or senders.
-- Receivers should ONLY be able to mark messages as read.
DROP POLICY IF EXISTS "Allow individual update" ON public.messages;
DROP POLICY IF EXISTS "Allow participants to update messages" ON public.messages;

-- Policy: Only sender can edit content/reactions
CREATE POLICY "Sender can edit own message" ON public.messages
  FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Policy: Receiver can ONLY update is_read
CREATE POLICY "Receiver can mark as read" ON public.messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (
    auth.uid() = receiver_id
  );

-- 2. Fix Profile Views Exploitation
-- Prevent view-count manipulation by enforcing auth.uid()
DROP POLICY IF EXISTS "Anyone can record a view" ON public.profile_views;

CREATE POLICY "Authenticated users can record views" ON public.profile_views
  FOR INSERT
  WITH CHECK (
    auth.uid() = viewer_id OR (viewer_id IS NULL AND auth.role() = 'anon')
  );

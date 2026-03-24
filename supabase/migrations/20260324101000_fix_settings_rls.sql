-- New Migration to fix talent_growth_data policies for settings synchronization
-- Added March 24, 2026

-- 1. Allow Users to Create their own settings/growth data
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'talent_growth_data' 
        AND policyname = 'Users can insert their own settings'
    ) THEN
        CREATE POLICY "Users can insert their own settings" ON public.talent_growth_data
            FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- 2. Allow Users to Update their own settings/growth data
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'talent_growth_data' 
        AND policyname = 'Users can update their own settings'
    ) THEN
        CREATE POLICY "Users can update their own settings" ON public.talent_growth_data
            FOR UPDATE USING (user_id = auth.uid());
    END IF;
END $$;

-- 3. Allow Users to Delete their own settings/growth data
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'talent_growth_data' 
        AND policyname = 'Users can delete their own settings'
    ) THEN
        CREATE POLICY "Users can delete their own settings" ON public.talent_growth_data
            FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

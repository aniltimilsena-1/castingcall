-- Ensure unique constraint on applications table to prevent duplicate submissions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'applications_project_id_applicant_id_key'
    ) THEN
        ALTER TABLE public.applications 
        ADD CONSTRAINT applications_project_id_applicant_id_key UNIQUE (project_id, applicant_id);
    END IF;
END $$;

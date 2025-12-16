-- =====================================================
-- Migration 046: Fix RLS Policy Auth UID References
-- =====================================================
-- CRITICAL FIX: All policies were using profiles.id = auth.uid()
-- but auth.uid() returns the AUTH user id which maps to profiles.auth_user_id
-- NOT profiles.id (which is a separate UUID)
-- =====================================================

-- ============================================
-- FIX 1: employee_compensation table
-- ============================================
DROP POLICY IF EXISTS "Admins Full Access" ON public.employee_compensation;
DROP POLICY IF EXISTS "Users View Own" ON public.employee_compensation;

-- Admins can do everything
CREATE POLICY "Admins Full Access" ON public.employee_compensation
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.auth_user_id = auth.uid() 
        AND profiles.role IN ('admin', 'super_admin')
    )
);

-- Users can view their own compensation
CREATE POLICY "Users View Own" ON public.employee_compensation
FOR SELECT USING (
    employee_id IN (
        SELECT e.id FROM public.employees e
        JOIN public.profiles p ON e.profile_id = p.id
        WHERE p.auth_user_id = auth.uid()
    )
);

-- ============================================
-- FIX 2: course_sections table (if exists)
-- ============================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_sections' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Admin Full Access" ON public.course_sections;
        DROP POLICY IF EXISTS "Authenticated View" ON public.course_sections;
        
        EXECUTE 'CREATE POLICY "Admin Full Access" ON public.course_sections
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.auth_user_id = auth.uid() AND profiles.role = ''admin''
            )
        )';
        
        EXECUTE 'CREATE POLICY "Authenticated View" ON public.course_sections
        FOR SELECT USING (auth.role() = ''authenticated'')';
    END IF;
END $$;

-- ============================================
-- FIX 3: course_lessons table (if exists)
-- ============================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_lessons' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Admin Full Access" ON public.course_lessons;
        DROP POLICY IF EXISTS "Authenticated View" ON public.course_lessons;
        
        EXECUTE 'CREATE POLICY "Admin Full Access" ON public.course_lessons
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.auth_user_id = auth.uid() AND profiles.role = ''admin''
            )
        )';
        
        EXECUTE 'CREATE POLICY "Authenticated View" ON public.course_lessons
        FOR SELECT USING (auth.role() = ''authenticated'')';
    END IF;
END $$;

-- ============================================
-- FIX 4: lesson_content table (if exists)
-- ============================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lesson_content' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Admin Full Access" ON public.lesson_content;
        DROP POLICY IF EXISTS "Authenticated View" ON public.lesson_content;
        
        EXECUTE 'CREATE POLICY "Admin Full Access" ON public.lesson_content
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.auth_user_id = auth.uid() AND profiles.role = ''admin''
            )
        )';
        
        EXECUTE 'CREATE POLICY "Authenticated View" ON public.lesson_content
        FOR SELECT USING (auth.role() = ''authenticated'')';
    END IF;
END $$;

-- ============================================
-- FIX 5: lesson_quizzes table (if exists)
-- ============================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lesson_quizzes' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Admin Full Access" ON public.lesson_quizzes;
        DROP POLICY IF EXISTS "Authenticated View" ON public.lesson_quizzes;
        
        EXECUTE 'CREATE POLICY "Admin Full Access" ON public.lesson_quizzes
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.auth_user_id = auth.uid() AND profiles.role = ''admin''
            )
        )';
        
        EXECUTE 'CREATE POLICY "Authenticated View" ON public.lesson_quizzes
        FOR SELECT USING (auth.role() = ''authenticated'')';
    END IF;
END $$;

-- ============================================
-- FIX 6: course_skill_awards table (if exists)
-- ============================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_skill_awards') THEN
        DROP POLICY IF EXISTS "Admin Full Access" ON public.course_skill_awards;
        DROP POLICY IF EXISTS "Authenticated View" ON public.course_skill_awards;
        
        EXECUTE 'CREATE POLICY "Admin Full Access" ON public.course_skill_awards
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.auth_user_id = auth.uid() AND profiles.role = ''admin''
            )
        )';
        
        EXECUTE 'CREATE POLICY "Authenticated View" ON public.course_skill_awards
        FOR SELECT USING (auth.role() = ''authenticated'')';
    END IF;
END $$;

-- ============================================
-- FIX 7: compensation_history table (if exists)
-- ============================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compensation_history') THEN
        DROP POLICY IF EXISTS "Admins Full Access" ON public.compensation_history;
        DROP POLICY IF EXISTS "Users View Own" ON public.compensation_history;
        
        EXECUTE 'CREATE POLICY "Admins Full Access" ON public.compensation_history
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.auth_user_id = auth.uid() 
                AND profiles.role IN (''admin'', ''super_admin'')
            )
        )';
        
        EXECUTE 'CREATE POLICY "Users View Own" ON public.compensation_history
        FOR SELECT USING (
            employee_id IN (
                SELECT e.id FROM public.employees e
                JOIN public.profiles p ON e.profile_id = p.id
                WHERE p.auth_user_id = auth.uid()
            )
        )';
    END IF;
END $$;

-- =============================================
-- SMART WASTE MONITORING SYSTEM
-- Database Schema for Supabase
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =============================================
-- USERS TABLE (extends Supabase auth.users)
-- =============================================
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('user', 'worker', 'admin')),
    department TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- WASTE BINS TABLE
-- =============================================
CREATE TABLE public.bins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bin_code TEXT UNIQUE NOT NULL,
    location_name TEXT NOT NULL,
    department TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    capacity_liters INTEGER DEFAULT 100,
    current_fill_percentage DOUBLE PRECISION DEFAULT 0,
    current_severity TEXT DEFAULT 'low' CHECK (current_severity IN ('low', 'medium', 'high', 'predicted_overflow')),
    last_cleaned_at TIMESTAMP WITH TIME ZONE,
    last_reported_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- WASTE REPORTS TABLE
-- =============================================
CREATE TABLE public.waste_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bin_id UUID REFERENCES public.bins(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL,
    fill_percentage DOUBLE PRECISION NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    waste_type TEXT,
    ai_confidence DOUBLE PRECISION,
    ai_analysis_json JSONB,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CLEANING TASKS TABLE
-- =============================================
CREATE TABLE public.cleaning_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bin_id UUID REFERENCES public.bins(id) ON DELETE CASCADE,
    assigned_worker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    report_id UUID REFERENCES public.waste_reports(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    priority INTEGER DEFAULT 1,
    is_predicted BOOLEAN DEFAULT FALSE,
    predicted_overflow_time TIMESTAMP WITH TIME ZONE,
    assigned_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_image_url TEXT,
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ROUTE OPTIMIZATION TABLE
-- =============================================
CREATE TABLE public.optimized_routes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    worker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_ids UUID[] NOT NULL,
    bin_sequence UUID[] NOT NULL,
    total_distance_meters DOUBLE PRECISION,
    estimated_time_minutes INTEGER,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- PREDICTIVE ANALYTICS TABLE
-- =============================================
CREATE TABLE public.waste_predictions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bin_id UUID REFERENCES public.bins(id) ON DELETE CASCADE,
    current_fill_percentage DOUBLE PRECISION NOT NULL,
    predicted_fill_percentage DOUBLE PRECISION NOT NULL,
    fill_rate_per_hour DOUBLE PRECISION NOT NULL,
    predicted_overflow_time TIMESTAMP WITH TIME ZONE,
    confidence_score DOUBLE PRECISION,
    data_points_used INTEGER,
    prediction_accurate BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ANALYTICS & METRICS TABLE
-- =============================================
CREATE TABLE public.analytics_summary (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL,
    total_reports INTEGER DEFAULT 0,
    total_cleanings INTEGER DEFAULT 0,
    avg_response_time_minutes DOUBLE PRECISION,
    department TEXT,
    high_severity_count INTEGER DEFAULT 0,
    overflow_prevented_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, department)
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimized_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_summary ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - PROFILES
-- =============================================
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- =============================================
-- RLS POLICIES - BINS
-- =============================================
CREATE POLICY "Bins are viewable by everyone"
    ON public.bins FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert bins"
    ON public.bins FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can update bins"
    ON public.bins FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================
-- RLS POLICIES - WASTE REPORTS
-- =============================================
CREATE POLICY "Reports are viewable by everyone"
    ON public.waste_reports FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert reports"
    ON public.waste_reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

-- =============================================
-- RLS POLICIES - CLEANING TASKS
-- =============================================
CREATE POLICY "Tasks are viewable by workers and admins"
    ON public.cleaning_tasks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('worker', 'admin')
        ) OR assigned_worker_id = auth.uid()
    );

CREATE POLICY "Admins can insert tasks"
    ON public.cleaning_tasks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Workers can update assigned tasks"
    ON public.cleaning_tasks FOR UPDATE
    USING (
        assigned_worker_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================
-- RLS POLICIES - ROUTES
-- =============================================
CREATE POLICY "Routes viewable by assigned worker and admins"
    ON public.optimized_routes FOR SELECT
    USING (
        worker_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================
-- RLS POLICIES - PREDICTIONS
-- =============================================
CREATE POLICY "Predictions viewable by everyone"
    ON public.waste_predictions FOR SELECT
    USING (true);

-- =============================================
-- RLS POLICIES - ANALYTICS
-- =============================================
CREATE POLICY "Analytics viewable by admins"
    ON public.analytics_summary FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bins_updated_at BEFORE UPDATE ON public.bins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.cleaning_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update bin status after report
CREATE OR REPLACE FUNCTION update_bin_after_report()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.bins
    SET
        current_fill_percentage = NEW.fill_percentage,
        current_severity = NEW.severity,
        last_reported_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.bin_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_waste_report_insert
    AFTER INSERT ON public.waste_reports
    FOR EACH ROW EXECUTE FUNCTION update_bin_after_report();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_bins_severity ON public.bins(current_severity);
CREATE INDEX idx_bins_location ON public.bins(latitude, longitude);
CREATE INDEX idx_reports_bin_id ON public.waste_reports(bin_id);
CREATE INDEX idx_reports_created_at ON public.waste_reports(created_at DESC);
CREATE INDEX idx_tasks_status ON public.cleaning_tasks(status);
CREATE INDEX idx_tasks_worker_id ON public.cleaning_tasks(assigned_worker_id);
CREATE INDEX idx_predictions_bin_id ON public.waste_predictions(bin_id);
CREATE INDEX idx_analytics_date ON public.analytics_summary(date DESC);

-- =============================================
-- SEED DATA - Sample Campus Bins
-- =============================================
INSERT INTO public.bins (bin_code, location_name, department, latitude, longitude, capacity_liters) VALUES
('BIN-CS-01', 'Computer Science Department - Main Entrance', 'Computer Science', 19.0330, 73.0297, 100),
('BIN-CS-02', 'Computer Science Department - Lab Area', 'Computer Science', 19.0332, 73.0298, 100),
('BIN-MECH-01', 'Mechanical Engineering - Workshop', 'Mechanical', 19.0328, 73.0295, 150),
('BIN-CIVIL-01', 'Civil Engineering - Main Block', 'Civil', 19.0335, 73.0300, 100),
('BIN-LIB-01', 'Library - Ground Floor', 'Library', 19.0333, 73.0299, 80),
('BIN-LIB-02', 'Library - First Floor', 'Library', 19.0333, 73.0299, 80),
('BIN-CAFE-01', 'Main Cafeteria - Inside', 'Cafeteria', 19.0329, 73.0296, 200),
('BIN-CAFE-02', 'Cafeteria - Outside Seating', 'Cafeteria', 19.0329, 73.0295, 150),
('BIN-SPORTS-01', 'Sports Complex - Main Gate', 'Sports', 19.0325, 73.0293, 100),
('BIN-HOSTEL-01', 'Boys Hostel - Common Area', 'Hostel', 19.0337, 73.0302, 150),
('BIN-HOSTEL-02', 'Girls Hostel - Common Area', 'Hostel', 19.0338, 73.0303, 150),
('BIN-ADMIN-01', 'Administration Block', 'Administration', 19.0331, 73.0297, 80);

-- =============================================
-- END OF SCHEMA
-- =============================================

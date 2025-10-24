-- SnipShift 2.0 Database Setup Script
-- Run this script to set up the complete database schema

-- Create database (run this as superuser)
-- CREATE DATABASE snipshift_dev;
-- CREATE DATABASE snipshift_test;

-- Connect to snipshift_dev database and run the following:

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    display_name VARCHAR(255),
    roles TEXT[] NOT NULL DEFAULT '{}',
    current_role VARCHAR(50),
    google_id VARCHAR(255) UNIQUE,
    profile_image TEXT,
    provider VARCHAR(50) DEFAULT 'email',
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    skills_required TEXT[] NOT NULL DEFAULT '{}',
    pay_rate DECIMAL(10,2) NOT NULL,
    pay_type VARCHAR(50) NOT NULL,
    location JSONB NOT NULL,
    date TIMESTAMP NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    status VARCHAR(50) DEFAULT 'OPEN',
    hub_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'PENDING',
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, professional_id)
);

-- Create social_posts table
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    image_url TEXT,
    post_type VARCHAR(50) NOT NULL,
    event_date TIMESTAMP,
    discount_code VARCHAR(50),
    discount_percentage INTEGER,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create training_content table
CREATE TABLE IF NOT EXISTS training_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    video_url TEXT,
    price DECIMAL(10,2),
    duration VARCHAR(50) NOT NULL,
    level VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(participant1_id, participant2_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_jobs_hub_id ON jobs(hub_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(date);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_professional_id ON applications(professional_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_author_id ON social_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_training_content_instructor_id ON training_content(instructor_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON social_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_training_content_updated_at BEFORE UPDATE ON training_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for development
INSERT INTO users (email, display_name, roles, current_role, is_verified, provider) VALUES
('admin@snipshift.com', 'Admin User', ARRAY['hub', 'professional'], 'hub', true, 'email'),
('professional@snipshift.com', 'Professional User', ARRAY['professional'], 'professional', true, 'email'),
('client@snipshift.com', 'Client User', ARRAY['client'], 'client', true, 'email')
ON CONFLICT (email) DO NOTHING;

-- Insert sample job
INSERT INTO jobs (title, description, skills_required, pay_rate, pay_type, location, date, start_time, end_time, hub_id) VALUES
('Hair Styling Session', 'Looking for an experienced hair stylist for a client session', ARRAY['haircut', 'styling'], 75.00, 'hourly', '{"city": "New York", "state": "NY", "country": "USA"}', CURRENT_TIMESTAMP + INTERVAL '1 day', '09:00', '17:00', (SELECT id FROM users WHERE email = 'admin@snipshift.com'))
ON CONFLICT DO NOTHING;

-- Insert sample social post
INSERT INTO social_posts (content, post_type, author_id) VALUES
('Welcome to SnipShift 2.0! The future of beauty industry networking is here.', 'announcement', (SELECT id FROM users WHERE email = 'admin@snipshift.com'))
ON CONFLICT DO NOTHING;

-- Insert sample training content
INSERT INTO training_content (title, description, content_type, duration, level, category, instructor_id) VALUES
('Advanced Hair Cutting Techniques', 'Learn the latest hair cutting techniques from industry experts', 'video', '2 hours', 'intermediate', 'haircutting', (SELECT id FROM users WHERE email = 'admin@snipshift.com'))
ON CONFLICT DO NOTHING;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO snipshift_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO snipshift_user;

COMMIT;

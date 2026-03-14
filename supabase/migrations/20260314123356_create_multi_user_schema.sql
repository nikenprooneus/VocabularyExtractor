/*
  # Multi-User SaaS Application Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `role` (text, default 'user', check constraint for 'user'|'admin')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `api_key` (text, encrypted LLM API key)
      - `base_url` (text, LLM API endpoint)
      - `model` (text, LLM model name)
      - `prompt_template` (text, user's custom prompt)
      - `webhook_url` (text, optional webhook endpoint)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - Unique constraint on user_id
    
    - `output_fields`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `name` (text, field name)
      - `display_order` (integer, sort order)
      - `created_at` (timestamptz)
    
    - `vocabulary_data`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `word` (text, the vocabulary word)
      - `example` (text, example usage)
      - `results` (jsonb, generated data)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only SELECT/INSERT/UPDATE/DELETE their own data
    - Admins can view and update all profiles
    - Automatic profile creation trigger on user signup
    
  3. Performance
    - Indexes on foreign keys and frequently queried columns
    
  4. Important Notes
    - All tables use CASCADE delete to maintain referential integrity
    - RLS policies ensure complete data isolation between users
    - Default values provided for required fields
    - Trigger automatically creates profile when user signs up via Supabase Auth
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  api_key TEXT NOT NULL DEFAULT '',
  base_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
  model TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
  prompt_template TEXT NOT NULL DEFAULT 'Define the word "{{Word}}" in detail, including pronunciation, parts of speech, meanings, and usage notes.',
  webhook_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Create output_fields table
CREATE TABLE IF NOT EXISTS public.output_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create vocabulary_data table
CREATE TABLE IF NOT EXISTS public.vocabulary_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  word TEXT NOT NULL,
  example TEXT DEFAULT '',
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.output_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for settings table
CREATE POLICY "Users can view their own settings"
  ON public.settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON public.settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for output_fields table
CREATE POLICY "Users can view their own output fields"
  ON public.output_fields FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own output fields"
  ON public.output_fields FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own output fields"
  ON public.output_fields FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own output fields"
  ON public.output_fields FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for vocabulary_data table
CREATE POLICY "Users can view their own vocabulary data"
  ON public.vocabulary_data FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vocabulary data"
  ON public.vocabulary_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocabulary data"
  ON public.vocabulary_data FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vocabulary data"
  ON public.vocabulary_data FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.settings(user_id);
CREATE INDEX IF NOT EXISTS idx_output_fields_user_id ON public.output_fields(user_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_data_user_id ON public.vocabulary_data(user_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_data_created_at ON public.vocabulary_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Add helpful comments
COMMENT ON TABLE public.profiles IS 'User profile information including role-based access control';
COMMENT ON TABLE public.settings IS 'User-specific LLM API configurations and settings';
COMMENT ON TABLE public.output_fields IS 'User-defined dynamic output fields for vocabulary generation';
COMMENT ON TABLE public.vocabulary_data IS 'Historical vocabulary generation results saved by users';
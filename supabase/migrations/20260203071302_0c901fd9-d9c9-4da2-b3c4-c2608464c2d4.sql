-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Create yarn_folders table
CREATE TABLE public.yarn_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.yarn_folders(id) ON DELETE CASCADE,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on yarn_folders
ALTER TABLE public.yarn_folders ENABLE ROW LEVEL SECURITY;

-- Folder policies
CREATE POLICY "Users can view their own folders"
  ON public.yarn_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
  ON public.yarn_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON public.yarn_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON public.yarn_folders FOR DELETE
  USING (auth.uid() = user_id);

-- Create yarn weight enum
CREATE TYPE public.yarn_weight AS ENUM ('lace', 'fingering', 'sport', 'dk', 'worsted', 'aran', 'bulky', 'super_bulky');

-- Create yarn status enum
CREATE TYPE public.yarn_status AS ENUM ('new', 'in_use', 'scraps', 'finished', 'wishlist');

-- Create yarn_entries table
CREATE TABLE public.yarn_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.yarn_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  brand TEXT,
  color_code TEXT,
  fiber_content TEXT,
  weight public.yarn_weight,
  status public.yarn_status DEFAULT 'new',
  -- Gauge data
  stitches_per_10cm NUMERIC(5,2),
  rows_per_10cm NUMERIC(5,2),
  -- Post-wash data
  post_wash_width_cm NUMERIC(5,2),
  post_wash_height_cm NUMERIC(5,2),
  -- Yarn specs
  meters_per_ball NUMERIC(7,2),
  grams_per_ball NUMERIC(6,2),
  -- Inventory
  balls_in_stock INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on yarn_entries
ALTER TABLE public.yarn_entries ENABLE ROW LEVEL SECURITY;

-- Yarn entry policies
CREATE POLICY "Users can view their own yarn entries"
  ON public.yarn_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own yarn entries"
  ON public.yarn_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own yarn entries"
  ON public.yarn_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own yarn entries"
  ON public.yarn_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Create project_specs table for saving calculated projects
CREATE TABLE public.project_specs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  yarn_entry_id UUID REFERENCES public.yarn_entries(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  -- Target dimensions
  target_width_cm NUMERIC(7,2),
  target_height_cm NUMERIC(7,2),
  -- Calculated requirements
  total_stitches INTEGER,
  total_rows INTEGER,
  adjusted_stitches INTEGER,
  adjusted_rows INTEGER,
  -- Yarn requirements
  total_meters_needed NUMERIC(10,2),
  total_grams_needed NUMERIC(8,2),
  balls_needed INTEGER,
  -- Shrinkage factors applied
  width_shrinkage_factor NUMERIC(5,4),
  height_shrinkage_factor NUMERIC(5,4),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project_specs
ALTER TABLE public.project_specs ENABLE ROW LEVEL SECURITY;

-- Project specs policies
CREATE POLICY "Users can view their own project specs"
  ON public.project_specs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own project specs"
  ON public.project_specs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own project specs"
  ON public.project_specs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own project specs"
  ON public.project_specs FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to profiles
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Apply trigger to yarn_entries
CREATE TRIGGER on_yarn_entries_updated
  BEFORE UPDATE ON public.yarn_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
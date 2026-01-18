-- Add mac_address column to hardware_assets table
ALTER TABLE public.hardware_assets 
ADD COLUMN mac_address text;
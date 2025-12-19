-- =====================================================
-- Fix Marketing Partner Enums
-- Add missing enum values that are used in the frontend
-- =====================================================

-- Add 'influencer' to marketing_partner_type enum
ALTER TYPE marketing_partner_type ADD VALUE IF NOT EXISTS 'influencer';

-- Add 'completed' to marketing_partner_status enum  
ALTER TYPE marketing_partner_status ADD VALUE IF NOT EXISTS 'completed';

-- Migration: Skills Taxonomy Part 2 - Additional Categories
-- Continues from 156_comprehensive_skills_taxonomy.sql

-- Recreate function for this migration
CREATE OR REPLACE FUNCTION upsert_skill_with_levels(
  p_name TEXT,
  p_category TEXT,
  p_levels JSONB
) RETURNS UUID AS $$
DECLARE
  v_skill_id UUID;
BEGIN
  SELECT id INTO v_skill_id 
  FROM public.skill_library 
  WHERE name = p_name AND category = p_category;
  
  IF v_skill_id IS NOT NULL THEN
    UPDATE public.skill_library 
    SET level_descriptions = p_levels,
        updated_at = NOW()
    WHERE id = v_skill_id;
  ELSE
    INSERT INTO public.skill_library (name, category, level_descriptions, is_active)
    VALUES (p_name, p_category, p_levels, true)
    RETURNING id INTO v_skill_id;
  END IF;
  
  RETURN v_skill_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FACILITIES SKILLS
-- =====================================================

SELECT upsert_skill_with_levels('Biohazard Waste', 'Facilities Skills', '{"0": "Untrained.", "1": "Bags.", "2": "Labels.", "3": "Stores.", "4": "Manifests.", "5": "Compliance lead."}'::jsonb);

SELECT upsert_skill_with_levels('Emergency Protocols – Fire/Evac', 'Facilities Skills', '{"0": "Untrained.", "1": "Knows exits.", "2": "Guides.", "3": "Leads floor.", "4": "Drills.", "5": "Safety officer."}'::jsonb);

SELECT upsert_skill_with_levels('Equipment Maintenance', 'Facilities Skills', '{"0": "Untrained.", "1": "Clean.", "2": "Basic PM.", "3": "Troubleshoot.", "4": "Repairs.", "5": "Vendor mgmt."}'::jsonb);

SELECT upsert_skill_with_levels('HVAC Awareness', 'Facilities Skills', '{"0": "Untrained.", "1": "Thermostat.", "2": "Filter changes.", "3": "Logs.", "4": "Vendor coord.", "5": "Facility mgr."}'::jsonb);

SELECT upsert_skill_with_levels('Infection Control', 'Facilities Skills', '{"0": "Untrained.", "1": "Hand hygiene.", "2": "Isolation setup.", "3": "PPE selection.", "4": "Protocol design.", "5": "IC lead."}'::jsonb);

SELECT upsert_skill_with_levels('OSHA Standards', 'Facilities Skills', '{"0": "Untrained.", "1": "Aware.", "2": "Follows.", "3": "Teaches.", "4": "Audits.", "5": "Safety Dir."}'::jsonb);

SELECT upsert_skill_with_levels('Sanitation Protocols', 'Facilities Skills', '{"0": "Untrained.", "1": "Cleans.", "2": "Disinfects.", "3": "Validates.", "4": "Standards.", "5": "IC lead."}'::jsonb);

SELECT upsert_skill_with_levels('Sharp Disposal', 'Facilities Skills', '{"0": "Untrained.", "1": "Uses box.", "2": "Changes box.", "3": "Disposal.", "4": "Compliance.", "5": "Safety lead."}'::jsonb);

SELECT upsert_skill_with_levels('Sterilization Techniques', 'Facilities Skills', '{"0": "Untrained.", "1": "Wraps.", "2": "Loads.", "3": "Runs cycle.", "4": "Spore tests.", "5": "IC/Surgery lead."}'::jsonb);

SELECT upsert_skill_with_levels('Supply Chain', 'Facilities Skills', '{"0": "Untrained.", "1": "Unboxes.", "2": "Stocks.", "3": "Orders.", "4": "Budget.", "5": "Vendor mgr."}'::jsonb);

SELECT upsert_skill_with_levels('Waste Segregation', 'Facilities Skills', '{"0": "Untrained.", "1": "Color sort.", "2": "Consistency.", "3": "Teaches.", "4": "Audits.", "5": "Compliance lead."}'::jsonb);

-- =====================================================
-- IMAGING
-- =====================================================

SELECT upsert_skill_with_levels('Computed Tomography (CT)', 'Imaging', '{"0": "Untrained.", "1": "Observes.", "2": "Patient prep.", "3": "Scan acquisition.", "4": "Contrast protocols.", "5": "CT tech."}'::jsonb);

SELECT upsert_skill_with_levels('Contrast Study Imaging', 'Imaging', '{"0": "Untrained.", "1": "Prep.", "2": "Setup.", "3": "Timing series.", "4": "Complications.", "5": "Specialist."}'::jsonb);

SELECT upsert_skill_with_levels('Digital Radiography', 'Imaging', '{"0": "Untrained.", "1": "Input.", "2": "Standard views.", "3": "Perfect technique.", "4": "Complex.", "5": "Teaches."}'::jsonb);

SELECT upsert_skill_with_levels('Fluoroscopy', 'Imaging', '{"0": "Untrained.", "1": "Observes.", "2": "Patient position.", "3": "Assists.", "4": "Radiation safety.", "5": "Lead."}'::jsonb);

SELECT upsert_skill_with_levels('MRI Basics', 'Imaging', '{"0": "Untrained.", "1": "Safety.", "2": "Patient screening.", "3": "Positioning.", "4": "Monitoring.", "5": "MRI tech."}'::jsonb);

SELECT upsert_skill_with_levels('PACS/Image Archiving', 'Imaging', '{"0": "Untrained.", "1": "View.", "2": "Send.", "3": "Archive.", "4": "System admin.", "5": "IT."}'::jsonb);

SELECT upsert_skill_with_levels('Radiograph Interpretation', 'Imaging', '{"0": "Untrained.", "1": "Quality check.", "2": "Normal vs abnormal.", "3": "Suggest findings.", "4": "Advanced pathology.", "5": "Radiologist aide."}'::jsonb);

SELECT upsert_skill_with_levels('Specialty Radiograph Views', 'Imaging', '{"0": "Untrained.", "1": "Standard.", "2": "Dental.", "3": "VD/Lateral/Skyline.", "4": "Exotic/Ortho.", "5": "Master."}'::jsonb);

SELECT upsert_skill_with_levels('Teleradiology Submission', 'Imaging', '{"0": "Untrained.", "1": "Uploads.", "2": "History.", "3": "Communication.", "4": "Triage urgency.", "5": "Relationship mgmt."}'::jsonb);

SELECT upsert_skill_with_levels('Ultrasound Imaging', 'Imaging', '{"0": "Untrained.", "1": "Prep.", "2": "Basic views.", "3": "Organ ID.", "4": "AFAST/TFAST.", "5": "Sonographer."}'::jsonb);

-- =====================================================
-- INVENTORY SKILLS
-- =====================================================

SELECT upsert_skill_with_levels('Controlled Substance Logging', 'Inventory Skills', '{"0": "Untrained.", "1": "Sign-out.", "2": "Daily log.", "3": "Reconciliation.", "4": "DEA compliance.", "5": "Inventory lead."}'::jsonb);

SELECT upsert_skill_with_levels('Equipment Purchase', 'Inventory Skills', '{"0": "Untrained.", "1": "Suggests.", "2": "Research.", "3": "Proposals.", "4": "Negotiation.", "5": "Budget mgr."}'::jsonb);

SELECT upsert_skill_with_levels('Expiration Management', 'Inventory Skills', '{"0": "Untrained.", "1": "Checks.", "2": "Rotates.", "3": "Logs.", "4": "System design.", "5": "Compliance."}'::jsonb);

SELECT upsert_skill_with_levels('Inventory Receiving', 'Inventory Skills', '{"0": "Untrained.", "1": "Unbox.", "2": "Check list.", "3": "Verify invoice.", "4": "Discrepancy mgmt.", "5": "Receiving lead."}'::jsonb);

SELECT upsert_skill_with_levels('Par Level Maintenance', 'Inventory Skills', '{"0": "Untrained.", "1": "Counts.", "2": "Reports low.", "3": "Adjusts pars.", "4": "Analytics.", "5": "Inventory mgr."}'::jsonb);

SELECT upsert_skill_with_levels('Product Returns', 'Inventory Skills', '{"0": "Untrained.", "1": "Identifies.", "2": "Packages.", "3": "Processes.", "4": "Vendor credits.", "5": "Inventory lead."}'::jsonb);

SELECT upsert_skill_with_levels('Stock Rotation', 'Inventory Skills', '{"0": "Untrained.", "1": "FIFO aware.", "2": "Implements.", "3": "Teaches.", "4": "Audits.", "5": "Process lead."}'::jsonb);

SELECT upsert_skill_with_levels('Vendor Relationship Management', 'Inventory Skills', '{"0": "Untrained.", "1": "Places orders.", "2": "Follows up.", "3": "Negotiates.", "4": "Contracts.", "5": "Vendor Director."}'::jsonb);

-- =====================================================
-- PHARMACY SKILLS
-- =====================================================

SELECT upsert_skill_with_levels('Client Med Dispensing', 'Pharmacy Skills', '{"0": "Untrained.", "1": "Fills Rx.", "2": "Labels.", "3": "Counsels.", "4": "Complex Rx.", "5": "Pharmacist aide."}'::jsonb);

SELECT upsert_skill_with_levels('Compounding', 'Pharmacy Skills', '{"0": "Untrained.", "1": "Flavoring.", "2": "Simple suspensions.", "3": "Transdermal.", "4": "Sterile compounding.", "5": "Compounding lead."}'::jsonb);

SELECT upsert_skill_with_levels('Controlled Drug Protocols', 'Pharmacy Skills', '{"0": "Untrained.", "1": "Sign-out.", "2": "Verify.", "3": "Inventory.", "4": "DEA compliance.", "5": "DEA Officer."}'::jsonb);

SELECT upsert_skill_with_levels('Drug Calculation', 'Pharmacy Skills', '{"0": "Untrained.", "1": "Calculator.", "2": "Per kg doses.", "3": "CRIs/Dilutions.", "4": "Complex Rx.", "5": "Teaches calc."}'::jsonb);

SELECT upsert_skill_with_levels('Drug Identification', 'Pharmacy Skills', '{"0": "Untrained.", "1": "Brand names.", "2": "Generic/Class.", "3": "Indications.", "4": "Interactions.", "5": "Pharmacology."}'::jsonb);

SELECT upsert_skill_with_levels('Drug Interactions', 'Pharmacy Skills', '{"0": "Untrained.", "1": "Aware.", "2": "Common interactions.", "3": "Checks polypharmacy.", "4": "Complex cases.", "5": "Pharmacist."}'::jsonb);

SELECT upsert_skill_with_levels('IV Drug Preparation', 'Pharmacy Skills', '{"0": "Untrained.", "1": "Diluent.", "2": "Reconstitution.", "3": "CRI bags.", "4": "Sterile technique.", "5": "Pharmacy lead."}'::jsonb);

SELECT upsert_skill_with_levels('Pharmacology Knowledge', 'Pharmacy Skills', '{"0": "Untrained.", "1": "Drug names.", "2": "Doses.", "3": "MOA.", "4": "Kinetics.", "5": "Vet level."}'::jsonb);

SELECT upsert_skill_with_levels('Prescription Label Accuracy', 'Pharmacy Skills', '{"0": "Untrained.", "1": "Reads.", "2": "Writes.", "3": "Double-checks.", "4": "Error prevention.", "5": "QA."}'::jsonb);

SELECT upsert_skill_with_levels('Refrigerated Drug Handling', 'Pharmacy Skills', '{"0": "Untrained.", "1": "Stores.", "2": "Temp monitoring.", "3": "Cold chain.", "4": "Excursion logs.", "5": "Compliance lead."}'::jsonb);

-- =====================================================
-- SURGERY
-- =====================================================

SELECT upsert_skill_with_levels('Autoclave Operation', 'Surgery', '{"0": "Untrained.", "1": "Loads.", "2": "Runs cycle.", "3": "Troubleshoot.", "4": "Maintenance.", "5": "Sterile processing lead."}'::jsonb);

SELECT upsert_skill_with_levels('Closure Techniques', 'Surgery', '{"0": "Untrained.", "1": "Observes.", "2": "Simple interrupted.", "3": "Multiple patterns.", "4": "Multi-layer.", "5": "Surgeon."}'::jsonb);

SELECT upsert_skill_with_levels('Gowning & Gloving', 'Surgery', '{"0": "Untrained.", "1": "Open glove.", "2": "Closed glove.", "3": "Gowns self.", "4": "Gowns surgeon.", "5": "Teaches technique."}'::jsonb);

SELECT upsert_skill_with_levels('Instrument Identification', 'Surgery', '{"0": "Untrained.", "1": "Basic 10.", "2": "GP pack.", "3": "Specialty packs.", "4": "Rare instruments.", "5": "Inventory mgr."}'::jsonb);

SELECT upsert_skill_with_levels('Instrument Maintenance', 'Surgery', '{"0": "Untrained.", "1": "Rinse.", "2": "Ultrasonic.", "3": "Lube/Box lock care.", "4": "Sharpening.", "5": "Equipment mgr."}'::jsonb);

SELECT upsert_skill_with_levels('Laser Surgery', 'Surgery', '{"0": "Untrained.", "1": "Safety.", "2": "Setup.", "3": "Assists.", "4": "Independent use.", "5": "Teaches technique."}'::jsonb);

SELECT upsert_skill_with_levels('Laparoscopy Assist', 'Surgery', '{"0": "Untrained.", "1": "Setup.", "2": "Camera assist.", "3": "Instrument pass.", "4": "Troubleshoot.", "5": "Specialty team."}'::jsonb);

SELECT upsert_skill_with_levels('Minor Surgical Procedures', 'Surgery', '{"0": "Untrained.", "1": "Observes.", "2": "Assists.", "3": "Mass removal (simple).", "4": "Castration/Spay.", "5": "Surgeon."}'::jsonb);

SELECT upsert_skill_with_levels('Orthopedic Pack Prep', 'Surgery', '{"0": "Untrained.", "1": "Identifies.", "2": "Wraps.", "3": "Organizes.", "4": "Custom packs.", "5": "Ortho lead."}'::jsonb);

SELECT upsert_skill_with_levels('Patient Prep', 'Surgery', '{"0": "Untrained.", "1": "Shave.", "2": "Scrub technique.", "3": "Final prep.", "4": "Difficult areas.", "5": "Prep trainer."}'::jsonb);

SELECT upsert_skill_with_levels('Sterile Field Maintenance', 'Surgery', '{"0": "Untrained.", "1": "Understands concept.", "2": "Avoids breaks.", "3": "Recognizes breaks.", "4": "Corrects breaks.", "5": "Audits technique."}'::jsonb);

SELECT upsert_skill_with_levels('Surgical Assisting', 'Surgery', '{"0": "Untrained.", "1": "Table setup.", "2": "Hands instruments.", "3": "Anticipates needs.", "4": "Complex surgery.", "5": "Lead tech."}'::jsonb);

SELECT upsert_skill_with_levels('Surgical Monitoring', 'Surgery', '{"0": "Untrained.", "1": "Records.", "2": "Identifies alerts.", "3": "Adjusts anesthesia.", "4": "Manages crisis.", "5": "Anesthesia lead."}'::jsonb);

SELECT upsert_skill_with_levels('Suturing', 'Surgery', '{"0": "Untrained.", "1": "Holds.", "2": "Simple pattern.", "3": "Multiple patterns.", "4": "Intradermal.", "5": "Teaches technique."}'::jsonb);

SELECT upsert_skill_with_levels('Tissue Handling', 'Surgery', '{"0": "Untrained.", "1": "Observes.", "2": "Gentle touch.", "3": "Retraction.", "4": "Complex anatomy.", "5": "Surgeon."}'::jsonb);

-- =====================================================
-- TECHNOLOGY SKILLS
-- =====================================================

SELECT upsert_skill_with_levels('Basic Office Software', 'Technology Skills', '{"0": "Untrained.", "1": "Opens files.", "2": "Word/Sheets.", "3": "Formulas.", "4": "Templates.", "5": "Admin."}'::jsonb);

SELECT upsert_skill_with_levels('Cybersecurity Basics', 'Technology Skills', '{"0": "Untrained.", "1": "Password hygiene.", "2": "Phishing aware.", "3": "Reports incidents.", "4": "Policy follower.", "5": "Security champion."}'::jsonb);

SELECT upsert_skill_with_levels('Digital Communication', 'Technology Skills', '{"0": "Untrained.", "1": "Email.", "2": "Slack/Teams.", "3": "Video calls.", "4": "Presentation.", "5": "Comms lead."}'::jsonb);

SELECT upsert_skill_with_levels('Hardware Troubleshooting', 'Technology Skills', '{"0": "Untrained.", "1": "Restart.", "2": "Cable check.", "3": "Driver update.", "4": "Repair.", "5": "IT."}'::jsonb);

SELECT upsert_skill_with_levels('Network Basics', 'Technology Skills', '{"0": "Untrained.", "1": "WiFi connect.", "2": "Troubleshoot.", "3": "Printer setup.", "4": "Admin.", "5": "IT."}'::jsonb);

SELECT upsert_skill_with_levels('PIMS Navigation', 'Technology Skills', '{"0": "Untrained.", "1": "Basic tasks.", "2": "Daily workflow.", "3": "Reports.", "4": "Superuser.", "5": "System trainer."}'::jsonb);

SELECT upsert_skill_with_levels('Telemedicine Platforms', 'Technology Skills', '{"0": "Untrained.", "1": "Joins call.", "2": "Runs visit.", "3": "Troubleshoot.", "4": "Admin.", "5": "Platform lead."}'::jsonb);

-- =====================================================
-- WELLNESS
-- =====================================================

SELECT upsert_skill_with_levels('Anal Sac Expression', 'Wellness', '{"0": "Untrained.", "1": "Anatomy.", "2": "External.", "3": "Internal.", "4": "Impacted glands.", "5": "Teaches technique."}'::jsonb);

SELECT upsert_skill_with_levels('Body Condition Scoring', 'Wellness', '{"0": "Untrained.", "1": "Knows scale.", "2": "Scores.", "3": "Counsels.", "4": "Weight plan.", "5": "Nutrition lead."}'::jsonb);

SELECT upsert_skill_with_levels('Client Counseling – Lifestyle', 'Wellness', '{"0": "Untrained.", "1": "Brochures.", "2": "Basic advice.", "3": "Tailored plan.", "4": "Behavior change.", "5": "Wellness coach."}'::jsonb);

SELECT upsert_skill_with_levels('Geriatric Care', 'Wellness', '{"0": "Untrained.", "1": "Gentle handling.", "2": "Comfort care.", "3": "Senior protocols.", "4": "Complex seniors.", "5": "Senior care lead."}'::jsonb);

SELECT upsert_skill_with_levels('Heartworm Testing', 'Wellness', '{"0": "Untrained.", "1": "Runs snap.", "2": "Explains results.", "3": "Protocol compliance.", "4": "Positive management.", "5": "Prevention lead."}'::jsonb);

SELECT upsert_skill_with_levels('Microchip Implantation', 'Wellness', '{"0": "Untrained.", "1": "Scans.", "2": "Assists.", "3": "Implants.", "4": "Registration.", "5": "Microchip lead."}'::jsonb);

SELECT upsert_skill_with_levels('Nutritional Counseling', 'Wellness', '{"0": "Untrained.", "1": "Product aware.", "2": "Recommends.", "3": "Tailors plan.", "4": "Therapeutic diets.", "5": "Nutrition expert."}'::jsonb);

SELECT upsert_skill_with_levels('Pediatric Care', 'Wellness', '{"0": "Untrained.", "1": "Gentle handling.", "2": "Vaccine protocols.", "3": "Development.", "4": "Pediatric emergencies.", "5": "Puppy/kitten lead."}'::jsonb);

SELECT upsert_skill_with_levels('Preventive Care Protocols', 'Wellness', '{"0": "Untrained.", "1": "Explains.", "2": "Implements.", "3": "Compliance tracking.", "4": "Protocol design.", "5": "Wellness Dir."}'::jsonb);

SELECT upsert_skill_with_levels('Vaccination Counseling', 'Wellness', '{"0": "Untrained.", "1": "Names.", "2": "Schedules.", "3": "Risk explanation.", "4": "Custom protocols.", "5": "Immunology lead."}'::jsonb);

SELECT upsert_skill_with_levels('Weight Management', 'Wellness', '{"0": "Untrained.", "1": "Weighs.", "2": "Tracks.", "3": "Counsels.", "4": "Programs.", "5": "Nutrition lead."}'::jsonb);

-- =====================================================
-- SPECIALTY MEDICINE
-- =====================================================

SELECT upsert_skill_with_levels('Cardiology Basics', 'Specialty Medicine', '{"0": "Untrained.", "1": "Auscultates.", "2": "Identifies murmurs.", "3": "ECG/Echo prep.", "4": "Cardiac meds.", "5": "Cardio focus."}'::jsonb);

SELECT upsert_skill_with_levels('Dermatology Basics', 'Specialty Medicine', '{"0": "Untrained.", "1": "Skin scrape.", "2": "Cytology.", "3": "Common diseases.", "4": "Allergy protocols.", "5": "Derm focus."}'::jsonb);

SELECT upsert_skill_with_levels('Endocrinology Basics', 'Specialty Medicine', '{"0": "Untrained.", "1": "Glucose checks.", "2": "Curves.", "3": "Disease monitoring.", "4": "Complex cases.", "5": "Endo focus."}'::jsonb);

SELECT upsert_skill_with_levels('Gastroenterology Basics', 'Specialty Medicine', '{"0": "Untrained.", "1": "Diet history.", "2": "Fecal analysis.", "3": "GI protocols.", "4": "IBD management.", "5": "GI focus."}'::jsonb);

SELECT upsert_skill_with_levels('Neurology Basics', 'Specialty Medicine', '{"0": "Untrained.", "1": "Gait watch.", "2": "Reflex check.", "3": "Localization.", "4": "Seizure management.", "5": "Neuro focus."}'::jsonb);

SELECT upsert_skill_with_levels('Oncology Basics', 'Specialty Medicine', '{"0": "Untrained.", "1": "Sample collection.", "2": "Chemo safety.", "3": "Protocol assist.", "4": "Client support.", "5": "Onco focus."}'::jsonb);

SELECT upsert_skill_with_levels('Ophthalmology Basics', 'Specialty Medicine', '{"0": "Untrained.", "1": "Eye exam setup.", "2": "Schirmer/Fluor.", "3": "Tonometry.", "4": "Eye meds.", "5": "Ophtho focus."}'::jsonb);

SELECT upsert_skill_with_levels('Rehabilitation Basics', 'Specialty Medicine', '{"0": "Untrained.", "1": "ROM exercises.", "2": "Underwater treadmill.", "3": "Laser therapy.", "4": "Full rehab plan.", "5": "Rehab tech."}'::jsonb);

-- =====================================================
-- FINANCIAL SKILLS
-- =====================================================

SELECT upsert_skill_with_levels('Accounts Receivable', 'Financial Skills', '{"0": "Untrained.", "1": "Statement mailing.", "2": "Collections calls.", "3": "AR management.", "4": "Write-off decisions.", "5": "Finance mgr."}'::jsonb);

SELECT upsert_skill_with_levels('Budget Management', 'Financial Skills', '{"0": "Untrained.", "1": "Expense awareness.", "2": "Category tracking.", "3": "Budget creation.", "4": "Variance analysis.", "5": "Finance Dir."}'::jsonb);

SELECT upsert_skill_with_levels('End-of-Day Reconciliation', 'Financial Skills', '{"0": "Untrained.", "1": "Counts drawer.", "2": "Balances.", "3": "Deposits.", "4": "Discrepancy resolution.", "5": "Finance lead."}'::jsonb);

SELECT upsert_skill_with_levels('Financial Reporting', 'Financial Skills', '{"0": "Untrained.", "1": "Reads reports.", "2": "Pulls data.", "3": "Analysis.", "4": "Presents to leadership.", "5": "CFO level."}'::jsonb);

SELECT upsert_skill_with_levels('Payment Processing', 'Financial Skills', '{"0": "Untrained.", "1": "Cash/Card.", "2": "Payment plans.", "3": "Financing apps.", "4": "Disputes.", "5": "Billing lead."}'::jsonb);

SELECT upsert_skill_with_levels('Revenue Cycle Management', 'Financial Skills', '{"0": "Untrained.", "1": "Charge entry.", "2": "Missed charges.", "3": "Full cycle.", "4": "Optimization.", "5": "Revenue Dir."}'::jsonb);

-- Clean up function
DROP FUNCTION IF EXISTS upsert_skill_with_levels(TEXT, TEXT, JSONB);

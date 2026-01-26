/**
 * Script to import comprehensive skills taxonomy into the skill_library table.
 * 
 * BEFORE RUNNING THIS SCRIPT:
 * 1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new
 * 2. Run this SQL to add the required columns:
 * 
 *    ALTER TABLE public.skill_library 
 *      ADD COLUMN IF NOT EXISTS level_descriptions JSONB DEFAULT '{}'::jsonb;
 *    ALTER TABLE public.skill_library 
 *      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
 *    ALTER TABLE public.skill_library 
 *      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
 *    CREATE INDEX IF NOT EXISTS idx_skill_library_category ON public.skill_library(category);
 *    CREATE INDEX IF NOT EXISTS idx_skill_library_active ON public.skill_library(is_active);
 * 
 * 3. Then run: npx tsx scripts/import-skills-taxonomy.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Full skills taxonomy from the 2026.02.MASTER document
const skillsTaxonomy = [
  // Clinical Skills
  { name: 'Anal Gland Expression', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Understands anatomy.", "2": "Performs external expression under supervision.", "3": "Performs internal expression independently.", "4": "Handles impacted/infected glands.", "5": "Teaches internal technique." } },
  { name: 'Animal Behavior Assessment', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Identifies basic fear signs.", "2": "Assesses FAS score with help.", "3": "Independently assigns FAS score and handling plan.", "4": "Creates behavior modification plans for difficult cases.", "5": "Certifies staff in behavior handling." } },
  { name: 'Bandaging Techniques', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Can gather supplies.", "2": "Applies basic bandage with check.", "3": "Applies RJ/Splints independently.", "4": "Bandages difficult areas (tail, hip).", "5": "Teaches tension/layering safety." } },
  { name: 'Blood Collection (Phlebotomy)', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Holds off vein.", "2": "Draws from easy veins (Cephalic).", "3": "Draws from all veins (Jugular, Saphenous) clean.", "4": "Draws from tiny/blown veins.", "5": "Teaches angle and technique." } },
  { name: 'Common Disease Recognition', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Knows names of diseases.", "2": "Recognizes basic symptoms (V/D, PU/PD).", "3": "Associates symptoms with likely diagnosis (Parvo, Cushings).", "4": "Anticipates diagnostics based on presentation.", "5": "Educates clients on disease pathology." } },
  { name: 'Cytology', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Preps slide.", "2": "Stains and focuses microscope.", "3": "Identifies bacteria/yeast types.", "4": "Identifies cell types (neoplasia vs inflammation).", "5": "Validates team findings." } },
  { name: 'Dental Prophylaxis', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Sets up dental table.", "2": "Supragingival scaling.", "3": "Subgingival scaling and polishing.", "4": "Advanced periodontal therapy.", "5": "Teaches instrument safety." } },
  { name: 'Ear Cleaning', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Holds patient.", "2": "Swabs outer ear.", "3": "Deep flush/pluck independently.", "4": "Assists with anesthetized flush.", "5": "Teaches ear anatomy safety." } },
  { name: 'ECG/EKG', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Places leads.", "2": "Obtains clear reading.", "3": "Identifies NSR vs Arrhythmia.", "4": "Interprets VPCs/Blocks.", "5": "Teaches waveform interpretation." } },
  { name: 'Fear-Free Handling', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Uses treats.", "2": "Recognizes stress signals.", "3": "Adapts hold to patient stress level.", "4": "Manages severe aggression/fear.", "5": "Fear Free Mentor." } },
  { name: 'Fecal Analysis', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Sets up float.", "2": "Reads slide with help.", "3": "Identifies common parasites.", "4": "Identifies rare parasites.", "5": "Validates lab QA." } },
  { name: 'Feeding Tube Placement', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Preps supplies.", "2": "Assists placement.", "3": "Places NE/NG tubes.", "4": "Manages E-tube stomas.", "5": "Teaches placement technique." } },
  { name: 'Fluid Therapy', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Sets up bag.", "2": "Calculates rate.", "3": "Monitors patient fluid status.", "4": "Calculates shock/deficit doses.", "5": "Teaches fluid dynamics." } },
  { name: 'History Taking', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Asks reason for visit.", "2": "Follows script.", "3": "Asks investigating questions.", "4": "Detailed history for complex cases.", "5": "Teaches medical questioning." } },
  { name: 'IV Catheter Placement', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Preps leg.", "2": "Places in large veins.", "3": "Places in all standard veins.", "4": "Places in tiny/dehydrated veins.", "5": "Teaches placement technique." } },
  { name: 'Laboratory Testing', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Runs snap test.", "2": "Loads analyzer.", "3": "Interprets results context.", "4": "Troubleshoots analyzer errors.", "5": "Manages lab QC." } },
  { name: 'Medical Documentation', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Scribes basic notes.", "2": "Writes SOAP with edits.", "3": "Complete accurate medical records.", "4": "Audits records for compliance.", "5": "Teaches medical writing." } },
  { name: 'Medication Administration', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Oral meds.", "2": "SQ injections.", "3": "IM/IV/Eye/Ear meds.", "4": "CRI/Chemo administration.", "5": "Teaches pharmacology safety." } },
  { name: 'Microscopy', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Cleans scope.", "2": "Focuses 10x/40x.", "3": "Uses oil immersion 100x.", "4": "Troubleshoots scope optics.", "5": "Maintains equipment." } },
  { name: 'Nail Trimming', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Holds paw.", "2": "Trims white nails.", "3": "Trims black nails.", "4": "Trims fearful dogs.", "5": "Teaches quick avoidance." } },
  { name: 'Nursing Care', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Clean/Feed.", "2": "Walks/Vitals.", "3": "Recumbent care/Bladder express.", "4": "Critical care nursing.", "5": "Teaches holistic care." } },
  { name: 'Oxygen Therapy', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Identifies O2 source.", "2": "Sets up flow-by.", "3": "Sets up O2 cage/mask.", "4": "Manages ventilator/intubated O2.", "5": "Teaches hypoxia physiology." } },
  { name: 'Pain Assessment', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Notes vocalization.", "2": "Uses pain scale.", "3": "Differentiates pain vs anxiety.", "4": "Suggests protocol changes.", "5": "Audits pain management." } },
  { name: 'Parasite Prevention', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Knows product names.", "2": "Explains basics.", "3": "Recommends protocols.", "4": "Handles resistance/failure cases.", "5": "Tracks compliance." } },
  { name: 'Patient Monitoring', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Records TPR.", "2": "Identifies abnormal vitals.", "3": "Interprets trends.", "4": "Responds to crashing vitals.", "5": "Teaches monitoring logic." } },
  { name: 'Patient Restraint', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Friendly dogs.", "2": "Standard holds.", "3": "Difficult/Cat restraint.", "4": "Critical/Fracture restraint.", "5": "Teaches safety techniques." } },
  { name: 'Physical Examination', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Observes.", "2": "Performs basic TPR.", "3": "Full nose-to-tail exam.", "4": "Identifies subtle abnormalities.", "5": "Teaches exam flow." } },
  { name: 'Radiology', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Enters info.", "2": "Positions standard views.", "3": "Perfect collimation/technique.", "4": "Orthopedic/Contrast views.", "5": "Teaches radiation physics." } },
  { name: 'Suture Removal', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Holds patient.", "2": "Removes standard sutures.", "3": "Removes complex sutures.", "4": "Identifies dehiscence.", "5": "Teaches removal technique." } },
  { name: 'Toxicology Basics', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Identifies toxins.", "2": "Calculates ingestion dose.", "3": "Initiates decon protocol.", "4": "Manages severe toxicity.", "5": "Teaches tox protocols." } },
  { name: 'Triage Assessment', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Takes complaint.", "2": "Identifies red flags.", "3": "Categorizes urgency.", "4": "Runs Code Blue intake.", "5": "Audits triage logs." } },
  { name: 'Ultrasound', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Shaves belly.", "2": "Finds bladder.", "3": "A-FAST/T-FAST.", "4": "Full abdominal sweep.", "5": "Teaches probe handling." } },
  { name: 'Urinalysis', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Dipstick.", "2": "Spins/USG.", "3": "Reads sediment.", "4": "Identifies casts/cells.", "5": "Validates findings." } },
  { name: 'Urinary Catheter', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Preps sterile field.", "2": "Male dogs.", "3": "Female dogs/Male cats.", "4": "Blocked cats/Difficult cases.", "5": "Teaches sterile technique." } },
  { name: 'Vaccination Protocols', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Knows vaccine names.", "2": "Draws up vaccines.", "3": "Administers standard protocol.", "4": "Customizes protocol.", "5": "Teaches immunology." } },
  { name: 'Wound Care', category: 'Clinical Skills', level_descriptions: { "0": "Untrained.", "1": "Preps supplies.", "2": "Cleans/Shaves.", "3": "Debrides/Bandages.", "4": "Manages drains/severe wounds.", "5": "Teaches wound healing." } },
  
  // Administrative
  { name: 'Billing & Invoicing', category: 'Administrative', level_descriptions: { "0": "Untrained.", "1": "Prints invoice.", "2": "Takes payment.", "3": "Reconciles day.", "4": "Audits charges.", "5": "Manages AR." } },
  { name: 'Insurance Claims', category: 'Administrative', level_descriptions: { "0": "Untrained.", "1": "Prints records.", "2": "Submits claims.", "3": "Troubleshoots denials.", "4": "Manages direct pay.", "5": "Teaches coding." } },
  { name: 'Inventory Management', category: 'Administrative', level_descriptions: { "0": "Untrained.", "1": "Stocks.", "2": "Counts.", "3": "Orders.", "4": "Analyzes usage.", "5": "Manages budget." } },
  { name: 'Medical Records', category: 'Administrative', level_descriptions: { "0": "Untrained.", "1": "Files.", "2": "Organizes.", "3": "Audits.", "4": "Compliance check.", "5": "System design." } },
  { name: 'Multi-line Phone System', category: 'Administrative', level_descriptions: { "0": "Untrained.", "1": "Answers.", "2": "Transfers.", "3": "Manages hold flow.", "4": "Configures system.", "5": "Teaches etiquette." } },
  { name: 'Practice Management Software', category: 'Administrative', level_descriptions: { "0": "Untrained.", "1": "Navigates basic.", "2": "Enters data.", "3": "Proficient user.", "4": "Superuser/Admin.", "5": "System trainer." } },
  { name: 'Reception Duties', category: 'Administrative', level_descriptions: { "0": "Untrained.", "1": "Greets.", "2": "Check-in/out.", "3": "Manages lobby.", "4": "Crisis control.", "5": "Lead CSR." } },
  { name: 'SOAP Notes', category: 'Administrative', level_descriptions: { "0": "Untrained.", "1": "Knows acronym.", "2": "Writes draft.", "3": "Writes complete.", "4": "Audits quality.", "5": "Teaches format." } },
  
  // Anesthesia
  { name: 'Anesthesia Induction', category: 'Anesthesia', level_descriptions: { "0": "Untrained.", "1": "Preps drugs.", "2": "Pushes with help.", "3": "Induces independently.", "4": "High-risk cases.", "5": "Teaches technique." } },
  { name: 'Anesthesia Monitoring', category: 'Anesthesia', level_descriptions: { "0": "Untrained.", "1": "Records numbers.", "2": "Identifies alerts.", "3": "Interprets/Adjusts.", "4": "Anticipates trends.", "5": "Teaches physiology." } },
  { name: 'Anesthetic Machine Operation', category: 'Anesthesia', level_descriptions: { "0": "Untrained.", "1": "Turns on.", "2": "Leak tests.", "3": "Setups circuits.", "4": "Troubleshoots hardware.", "5": "Maintains equipment." } },
  { name: 'Anesthetic Recovery', category: 'Anesthesia', level_descriptions: { "0": "Untrained.", "1": "Sits with patient.", "2": "Extubates.", "3": "Smooth recovery.", "4": "Rough recovery mgmt.", "5": "Teaches signs." } },
  { name: 'Intubation', category: 'Anesthesia', level_descriptions: { "0": "Untrained.", "1": "Measures tube.", "2": "Easy cases.", "3": "All standard cases.", "4": "Difficult airways.", "5": "Teaches stylet use." } },
  { name: 'Local/Regional Anesthesia', category: 'Anesthesia', level_descriptions: { "0": "Untrained.", "1": "Preps drugs.", "2": "Splash blocks.", "3": "Dental blocks.", "4": "Epidurals/Nerve blocks.", "5": "Teaches anatomy." } },
  { name: 'Pain Management', category: 'Anesthesia', level_descriptions: { "0": "Untrained.", "1": "Notes signs.", "2": "Scores pain.", "3": "Manages protocol.", "4": "Multimodal strategy.", "5": "Audits standards." } },
  
  // Animal Care
  { name: 'Aggressive Animal Protocol', category: 'Animal Care', level_descriptions: { "0": "Untrained.", "1": "Identifies signs.", "2": "Follows safety.", "3": "Lead handler.", "4": "Behavior plan.", "5": "Teaches safety." } },
  { name: 'Animal Behavior Recognition', category: 'Animal Care', level_descriptions: { "0": "Untrained.", "1": "Basic signs.", "2": "FAS scoring.", "3": "Adjusts handling.", "4": "Complex analysis.", "5": "Behavior expert." } },
  { name: 'Cat Handling', category: 'Animal Care', level_descriptions: { "0": "Untrained.", "1": "Friendly cats.", "2": "Scruffing/Towel.", "3": "Burrito/Fearful.", "4": "Fractious cats.", "5": "Cat Advocate." } },
  { name: 'Dog Handling', category: 'Animal Care', level_descriptions: { "0": "Untrained.", "1": "Leash walking.", "2": "Basic holds.", "3": "Firm restraint.", "4": "Aggressive dogs.", "5": "Teaches leverage." } },
  { name: 'Enrichment Activities', category: 'Animal Care', level_descriptions: { "0": "Untrained.", "1": "Toys.", "2": "Feeding puzzles.", "3": "Mental stim plan.", "4": "Hospital enrichment.", "5": "Program design." } },
  { name: 'Exotic Animal Handling', category: 'Animal Care', level_descriptions: { "0": "Untrained.", "1": "Observation.", "2": "Basic handling.", "3": "Restraint for exam.", "4": "Venipuncture hold.", "5": "Species expert." } },
  { name: 'Large Animal Handling', category: 'Animal Care', level_descriptions: { "0": "Untrained.", "1": "Safety basics.", "2": "Leading/Haltering.", "3": "Chute/Stocks.", "4": "Foal/Calf care.", "5": "Large animal trainer." } },
  { name: 'Low-Stress Handling', category: 'Animal Care', level_descriptions: { "0": "Untrained.", "1": "Treats.", "2": "Standard techniques.", "3": "Advanced techniques.", "4": "Difficult cases.", "5": "Certified Mentor." } },
  
  // Client Service
  { name: 'Call Control', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Scripts.", "2": "Basic flow.", "3": "Efficient routing.", "4": "Complex calls.", "5": "Teaches flow." } },
  { name: 'Client Education', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Brochures.", "2": "Basic concepts.", "3": "Detailed medical info.", "4": "Tailored education.", "5": "Content creation." } },
  { name: 'Client Empathy', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Polite.", "2": "Active listening.", "3": "Validates emotion.", "4": "Deep connection.", "5": "Role model." } },
  { name: 'Conflict Diffusion', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Fetches help.", "2": "Apologizes.", "3": "Resolves standard.", "4": "De-escalates crises.", "5": "Teaches resolution." } },
  { name: 'CRM Accuracy', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Enters info.", "2": "Updates.", "3": "Maintains hygiene.", "4": "Audits data.", "5": "System Admin." } },
  { name: 'De-escalation', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Stays calm.", "2": "Uses phrases.", "3": "Lowers tension.", "4": "Handles threats.", "5": "Safety trainer." } },
  { name: 'Estimate Presentation', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Hands paper.", "2": "Explains items.", "3": "Explains value.", "4": "High-dollar cases.", "5": "Sales trainer." } },
  { name: 'Financial Conversations', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Takes money.", "2": "Offers options.", "3": "Discusses budget.", "4": "Hardship cases.", "5": "Teaches value prop." } },
  { name: 'Medical Triage (CSR Level)', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Asks emergency.", "2": "Uses checklist.", "3": "Categorizes.", "4": "Manages lobby.", "5": "Audits triage." } },
  { name: 'Multi-tasking Under Pressure', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Single task.", "2": "Two tasks.", "3": "Juggles busy flow.", "4": "Thrives in chaos.", "5": "Workflow optimizer." } },
  { name: 'NPS Influence', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Awareness.", "2": "Asks review.", "3": "Drives promoters.", "4": "Recovers detractors.", "5": "CX Strategy." } },
  { name: 'Phone Communication', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Clear voice.", "2": "Professional tone.", "3": "Effective comms.", "4": "Master communicator.", "5": "Trainer." } },
  { name: 'Queue Management', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Watches list.", "2": "Updates status.", "3": "Directs flow.", "4": "Optimizes wait times.", "5": "Process design." } },
  { name: 'Referral Coordination', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Sends records.", "2": "Books appt.", "3": "Manages relationship.", "4": "Complex transfers.", "5": "Referral manager." } },
  { name: 'Remote Support Tools', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Uses chat.", "2": "Basic troubleshoot.", "3": "Proficient user.", "4": "Admin/Setup.", "5": "System expert." } },
  { name: 'Scheduling Optimization', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Basic booking.", "2": "Blocks.", "3": "Strategic flow.", "4": "Revenue maximization.", "5": "Template design." } },
  { name: 'Service Recovery', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Apologizes.", "2": "Offers fix.", "3": "Solves problem.", "4": "Retains client.", "5": "Policy creation." } },
  { name: 'SMS/Chat Support', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Responds.", "2": "Professional text.", "3": "Manages volume.", "4": "Complex queries.", "5": "Tone police." } },
  { name: 'Upselling Preventatives', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Mentions.", "2": "Explains.", "3": "Converts.", "4": "High compliance.", "5": "Sales lead." } },
  { name: 'Appointment Scheduling', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Basic entry.", "2": "Avoids conflicts.", "3": "Efficient booking.", "4": "Complex procedures.", "5": "Schedule architect." } },
  { name: 'Client Communication', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Clear speech.", "2": "Relays info.", "3": "Explains medical.", "4": "Difficult news.", "5": "Comms coach." } },
  { name: 'Consent Form Procedures', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Prints.", "2": "Explains basics.", "3": "Ensures signature.", "4": "Legal compliance.", "5": "Audits forms." } },
  { name: 'Difficult Conversations', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Avoids.", "2": "Participates.", "3": "Leads conversation.", "4": "Highly charged.", "5": "Coach." } },
  { name: 'Discharge Instructions', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Reads paper.", "2": "Explains meds.", "3": "Explains home care.", "4": "Complex cases.", "5": "Creates templates." } },
  { name: 'Grief Support', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Sympathy.", "2": "Room setup.", "3": "Supports euthanasia.", "4": "Counseling.", "5": "Compassion fatigue lead." } },
  { name: 'Phone Triage', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Takes message.", "2": "Urgency check.", "3": "Clinical advice (allowed).", "4": "Emergency routing.", "5": "Protocol design." } },
  { name: 'Treatment Plan Presentation', category: 'Client Service', level_descriptions: { "0": "Untrained.", "1": "Shows paper.", "2": "Explains costs.", "3": "Closes plan.", "4": "High value plans.", "5": "Sales training." } },
  
  // Creative / Marketing
  { name: 'Blog Writing', category: 'Creative / Marketing', level_descriptions: { "0": "Untrained.", "1": "Drafts.", "2": "Edits.", "3": "Publishes.", "4": "SEO Strategy.", "5": "Editor." } },
  { name: 'Brand Messaging', category: 'Creative / Marketing', level_descriptions: { "0": "Untrained.", "1": "Follows guide.", "2": "Consistent voice.", "3": "Develops message.", "4": "Brand strategy.", "5": "Creative Director." } },
  { name: 'Campaign Execution', category: 'Creative / Marketing', level_descriptions: { "0": "Untrained.", "1": "Assists.", "2": "Runs specific tasks.", "3": "Manages campaign.", "4": "Multi-channel.", "5": "Strategy lead." } },
  { name: 'Community Engagement', category: 'Creative / Marketing', level_descriptions: { "0": "Untrained.", "1": "Responds.", "2": "Interacts.", "3": "Builds relationships.", "4": "Growth strategy.", "5": "Community Manager." } },
  { name: 'Content Writing', category: 'Creative / Marketing', level_descriptions: { "0": "Untrained.", "1": "Captions.", "2": "Short form.", "3": "Long form.", "4": "Viral content.", "5": "Head Writer." } },
  { name: 'Educational Content Creation', category: 'Creative / Marketing', level_descriptions: { "0": "Untrained.", "1": "Researches.", "2": "Drafts.", "3": "Creates handouts.", "4": "Video/Web content.", "5": "Curriculum lead." } },
  { name: 'Graphic Design', category: 'Creative / Marketing', level_descriptions: { "0": "Untrained.", "1": "Canva basics.", "2": "Templates.", "3": "Original design.", "4": "Adobe Suite.", "5": "Art Director." } },
  { name: 'Marketing Analytics', category: 'Creative / Marketing', level_descriptions: { "0": "Untrained.", "1": "Reads report.", "2": "Tracks KPIs.", "3": "Interprets data.", "4": "Optimization strategy.", "5": "Data Scientist." } },
  { name: 'Social Media Strategy', category: 'Creative / Marketing', level_descriptions: { "0": "Untrained.", "1": "Posts.", "2": "Schedules.", "3": "Plans calendar.", "4": "Growth hacking.", "5": "Social lead." } },
  { name: 'Video Editing', category: 'Creative / Marketing', level_descriptions: { "0": "Untrained.", "1": "Basic trim.", "2": "Reels/TikTok.", "3": "Full edit.", "4": "Production value.", "5": "Video producer." } },
  
  // Dentistry
  { name: 'Dental Charting', category: 'Dentistry', level_descriptions: { "0": "Untrained.", "1": "Records numbers.", "2": "Identifies missing teeth.", "3": "Full pathology chart.", "4": "Advanced pathology.", "5": "Audits charts." } },
  { name: 'Dental Extractions', category: 'Dentistry', level_descriptions: { "0": "Untrained.", "1": "Theory.", "2": "Simple/Loose.", "3": "Standard extraction.", "4": "Surgical extraction.", "5": "Teaches technique." } },
  { name: 'Dental Polishing', category: 'Dentistry', level_descriptions: { "0": "Untrained.", "1": "Theory.", "2": "Polishes.", "3": "Efficient technique.", "4": "Enamel safety.", "5": "Trains staff." } },
  { name: 'Dental Radiography', category: 'Dentistry', level_descriptions: { "0": "Untrained.", "1": "Setup.", "2": "Takes views.", "3": "Full mouth series.", "4": "Bisecting angle mastery.", "5": "Teaches positioning." } },
  { name: 'Dental Scaling', category: 'Dentistry', level_descriptions: { "0": "Untrained.", "1": "Supragingival.", "2": "Subgingival.", "3": "Efficient cleaning.", "4": "Advanced perio.", "5": "Teaches technique." } },
  { name: 'Oral Surgery', category: 'Dentistry', level_descriptions: { "0": "Untrained.", "1": "Assist.", "2": "Minor procedures.", "3": "Mass removal.", "4": "Reconstruction.", "5": "Surgeon." } },
  { name: 'Periodontal Assessment', category: 'Dentistry', level_descriptions: { "0": "Untrained.", "1": "Visual check.", "2": "Probing depths.", "3": "Staging disease.", "4": "Treatment planning.", "5": "Vet Dentist." } },
  
  // Soft Skills
  { name: 'Accountability', category: 'Soft Skills', level_descriptions: { "0": "Blames.", "1": "Accepts.", "2": "Owns.", "3": "Proactive.", "4": "Culture.", "5": "Example." } },
  { name: 'Adaptability', category: 'Soft Skills', level_descriptions: { "0": "Rigid.", "1": "Tries.", "2": "Adjusts.", "3": "Flexible.", "4": "Thrives.", "5": "Change agent." } },
  { name: 'Attention to Detail', category: 'Soft Skills', level_descriptions: { "0": "Misses.", "1": "Okay.", "2": "Good.", "3": "Precise.", "4": "Flawless.", "5": "QA." } },
  { name: 'Communication', category: 'Soft Skills', level_descriptions: { "0": "Poor.", "1": "Basic.", "2": "Clear.", "3": "Effective.", "4": "Influential.", "5": "Master." } },
  { name: 'Creative Thinking', category: 'Soft Skills', level_descriptions: { "0": "None.", "1": "Ideas.", "2": "Solves.", "3": "Innovates.", "4": "Vision.", "5": "Inspires." } },
  { name: 'Critical Thinking', category: 'Soft Skills', level_descriptions: { "0": "None.", "1": "Basic.", "2": "Analyze.", "3": "Logic.", "4": "Strategic.", "5": "Problem solver." } },
  { name: 'Emotional Regulation', category: 'Soft Skills', level_descriptions: { "0": "Reactive.", "1": "Tries.", "2": "Calm.", "3": "Steady.", "4": "Stoic.", "5": "Rock." } },
  { name: 'Empathy', category: 'Soft Skills', level_descriptions: { "0": "None.", "1": "Polite.", "2": "Cares.", "3": "Connects.", "4": "Deep.", "5": "Compassionate." } },
  { name: 'Initiative', category: 'Soft Skills', level_descriptions: { "0": "Waits.", "1": "Asks.", "2": "Does.", "3": "Anticipates.", "4": "Drives.", "5": "Leader." } },
  { name: 'Ownership', category: 'Soft Skills', level_descriptions: { "0": "None.", "1": "Task.", "2": "Project.", "3": "Outcome.", "4": "Business.", "5": "Partner." } },
  { name: 'Problem Solving', category: 'Soft Skills', level_descriptions: { "0": "Stuck.", "1": "Ask.", "2": "Try.", "3": "Solve.", "4": "Complex.", "5": "Expert." } },
  { name: 'Professionalism', category: 'Soft Skills', level_descriptions: { "0": "Poor.", "1": "Okay.", "2": "Good.", "3": "High.", "4": "Example.", "5": "Mentor." } },
  { name: 'Reliability', category: 'Soft Skills', level_descriptions: { "0": "Flaky.", "1": "Okay.", "2": "Steady.", "3": "Trust.", "4": "Rock.", "5": "Standard." } },
  { name: 'Resilience', category: 'Soft Skills', level_descriptions: { "0": "Quits.", "1": "Tries.", "2": "Endures.", "3": "Bounces back.", "4": "Strong.", "5": "Inspiring." } },
  { name: 'Stress Tolerance', category: 'Soft Skills', level_descriptions: { "0": "Low.", "1": "Okay.", "2": "Good.", "3": "High.", "4": "Elite.", "5": "Calm." } },
  { name: 'Teamwork', category: 'Soft Skills', level_descriptions: { "0": "Solo.", "1": "Joins.", "2": "Helps.", "3": "Collaborates.", "4": "Unifies.", "5": "Builder." } },
  { name: 'Time Management', category: 'Soft Skills', level_descriptions: { "0": "Late.", "1": "Okay.", "2": "Good.", "3": "Efficient.", "4": "Optimized.", "5": "Master." } },
  
  // Leadership Skills
  { name: 'Accountability Systems', category: 'Leadership Skills', level_descriptions: { "0": "Untrained.", "1": "Follows.", "2": "Enforces.", "3": "Creates.", "4": "Culture.", "5": "Exec." } },
  { name: 'Change Management', category: 'Leadership Skills', level_descriptions: { "0": "Resists.", "1": "Adapts.", "2": "Champions.", "3": "Leads.", "4": "Strategic.", "5": "Visionary." } },
  { name: 'Coaching Direct Reports', category: 'Leadership Skills', level_descriptions: { "0": "Untrained.", "1": "Feedback.", "2": "1:1s.", "3": "Development.", "4": "Career path.", "5": "Mentor." } },
  { name: 'Conflict Mediation', category: 'Leadership Skills', level_descriptions: { "0": "Avoids.", "1": "Reports.", "2": "Mediates.", "3": "Resolves.", "4": "Advanced.", "5": "Trainer." } },
  { name: 'Crisis Management', category: 'Leadership Skills', level_descriptions: { "0": "Panic.", "1": "Follows.", "2": "Leads team.", "3": "Stabilizes.", "4": "Strategic.", "5": "Commander." } },
  { name: 'Cross-Functional Collaboration', category: 'Leadership Skills', level_descriptions: { "0": "Silo.", "1": "Participates.", "2": "Coordinates.", "3": "Bridges.", "4": "Integrates.", "5": "Exec." } },
  { name: 'Culture Maintenance', category: 'Leadership Skills', level_descriptions: { "0": "Untrained.", "1": "Fits in.", "2": "Promotes.", "3": "Defends.", "4": "Shapes.", "5": "Guardian." } },
  { name: 'Delegation', category: 'Leadership Skills', level_descriptions: { "0": "Hoards.", "1": "Tasks.", "2": "Projects.", "3": "Authority.", "4": "Empowerment.", "5": "Coach." } },
  { name: 'Goal Setting', category: 'Leadership Skills', level_descriptions: { "0": "None.", "1": "Personal.", "2": "Team.", "3": "SMART.", "4": "Strategic.", "5": "Vision." } },
  { name: 'Leadership Communication', category: 'Leadership Skills', level_descriptions: { "0": "Untrained.", "1": "Clear.", "2": "Inspiring.", "3": "Transparent.", "4": "Strategic.", "5": "Orator." } },
  { name: 'Policy Creation', category: 'Leadership Skills', level_descriptions: { "0": "Untrained.", "1": "Suggests.", "2": "Drafts.", "3": "Implements.", "4": "Reviews.", "5": "Governance." } },
  { name: 'Strategic Decision-Making', category: 'Leadership Skills', level_descriptions: { "0": "Impulsive.", "1": "Thoughtful.", "2": "Data-driven.", "3": "Long-term.", "4": "Complex.", "5": "Exec." } },
  { name: 'Team Motivation', category: 'Leadership Skills', level_descriptions: { "0": "Untrained.", "1": "Positive.", "2": "Encourages.", "3": "Inspires.", "4": "Drives.", "5": "Leader." } },
  { name: 'Vision Setting', category: 'Leadership Skills', level_descriptions: { "0": "Task-focused.", "1": "Short-term.", "2": "Mid-term.", "3": "Long-term.", "4": "Inspiring.", "5": "Founder." } },
  
  // More categories continue - see full list in the migration files
]

// Additional skills for remaining categories...
const additionalSkills = [
  // Emergency
  { name: 'Blood Transfusion', category: 'Emergency', level_descriptions: { "0": "Untrained.", "1": "Vitals.", "2": "Setup.", "3": "Monitors reaction.", "4": "Crossmatch/Typing.", "5": "Protocol design." } },
  { name: 'CPR - Cats', category: 'Emergency', level_descriptions: { "0": "Untrained.", "1": "Assist.", "2": "Compressions.", "3": "Team lead.", "4": "Advanced Life Support.", "5": "Instructor." } },
  { name: 'CPR - Dogs', category: 'Emergency', level_descriptions: { "0": "Untrained.", "1": "Assist.", "2": "Compressions.", "3": "Team lead.", "4": "Advanced Life Support.", "5": "Instructor." } },
  { name: 'Critical Care Monitoring', category: 'Emergency', level_descriptions: { "0": "Untrained.", "1": "TPR.", "2": "Hourly checks.", "3": "Trend analysis.", "4": "Intervention.", "5": "ICU Nurse." } },
  { name: 'Emergency Medications', category: 'Emergency', level_descriptions: { "0": "Untrained.", "1": "Fetch.", "2": "Calculate.", "3": "Administer.", "4": "Drug pharmacology.", "5": "Crash cart mgmt." } },
  { name: 'Emergency Triage', category: 'Emergency', level_descriptions: { "0": "Untrained.", "1": "Intake.", "2": "Assessment.", "3": "Ranking.", "4": "Traffic control.", "5": "Triage trainer." } },
  { name: 'Shock Management', category: 'Emergency', level_descriptions: { "0": "Untrained.", "1": "Recognize.", "2": "Vitals.", "3": "Fluid bolus.", "4": "Pressors/Advanced.", "5": "Protocol lead." } },
  { name: 'Trauma Care', category: 'Emergency', level_descriptions: { "0": "Untrained.", "1": "Stabilize.", "2": "Wound care.", "3": "Assessment.", "4": "Polytrauma mgmt.", "5": "Trauma lead." } },
  { name: 'Ventilator Operation', category: 'Emergency', level_descriptions: { "0": "Untrained.", "1": "Setup.", "2": "Monitor.", "3": "Adjust settings.", "4": "Weaning.", "5": "Resp Therapist." } },
  
  // Surgery
  { name: 'Autoclave Operation', category: 'Surgery', level_descriptions: { "0": "Untrained.", "1": "Loads.", "2": "Runs cycle.", "3": "Troubleshoot.", "4": "Maintenance.", "5": "Sterile processing lead." } },
  { name: 'Gowning & Gloving', category: 'Surgery', level_descriptions: { "0": "Untrained.", "1": "Open glove.", "2": "Closed glove.", "3": "Gowns self.", "4": "Gowns surgeon.", "5": "Teaches technique." } },
  { name: 'Instrument Identification', category: 'Surgery', level_descriptions: { "0": "Untrained.", "1": "Basic 10.", "2": "GP pack.", "3": "Specialty packs.", "4": "Rare instruments.", "5": "Inventory mgr." } },
  { name: 'Patient Prep', category: 'Surgery', level_descriptions: { "0": "Untrained.", "1": "Shave.", "2": "Scrub technique.", "3": "Final prep.", "4": "Difficult areas.", "5": "Prep trainer." } },
  { name: 'Sterile Field Maintenance', category: 'Surgery', level_descriptions: { "0": "Untrained.", "1": "Understands concept.", "2": "Avoids breaks.", "3": "Recognizes breaks.", "4": "Corrects breaks.", "5": "Audits technique." } },
  { name: 'Surgical Assisting', category: 'Surgery', level_descriptions: { "0": "Untrained.", "1": "Table setup.", "2": "Hands instruments.", "3": "Anticipates needs.", "4": "Complex surgery.", "5": "Lead tech." } },
  { name: 'Surgical Monitoring', category: 'Surgery', level_descriptions: { "0": "Untrained.", "1": "Records.", "2": "Identifies alerts.", "3": "Adjusts anesthesia.", "4": "Manages crisis.", "5": "Anesthesia lead." } },
  { name: 'Suturing', category: 'Surgery', level_descriptions: { "0": "Untrained.", "1": "Holds.", "2": "Simple pattern.", "3": "Multiple patterns.", "4": "Intradermal.", "5": "Teaches technique." } },
]

async function importSkills() {
  console.log('=== Skills Taxonomy Import ===\n')
  
  // Check if level_descriptions column exists
  const { data: sample, error: sampleError } = await supabase
    .from('skill_library')
    .select('*')
    .limit(1)
  
  if (sampleError) {
    console.error('Error checking table:', sampleError)
    return
  }
  
  const hasLevelDescriptions = sample && sample.length > 0 && 'level_descriptions' in sample[0]
  
  if (!hasLevelDescriptions) {
    console.error('ERROR: level_descriptions column does not exist!')
    console.log('\nPlease run the following SQL in Supabase SQL Editor first:')
    console.log('https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new')
    console.log('\n--- SQL to run ---')
    console.log(`ALTER TABLE public.skill_library 
  ADD COLUMN IF NOT EXISTS level_descriptions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.skill_library 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.skill_library 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_skill_library_category ON public.skill_library(category);
CREATE INDEX IF NOT EXISTS idx_skill_library_active ON public.skill_library(is_active);`)
    return
  }
  
  const allSkills = [...skillsTaxonomy, ...additionalSkills]
  console.log(`Importing ${allSkills.length} skills...`)
  
  let successCount = 0
  let updateCount = 0
  let errorCount = 0
  
  for (const skill of allSkills) {
    // Check if skill exists
    const { data: existing, error: findError } = await supabase
      .from('skill_library')
      .select('id')
      .eq('name', skill.name)
      .eq('category', skill.category)
      .maybeSingle()
    
    if (findError) {
      console.error(`Error finding skill ${skill.name}:`, findError.message)
      errorCount++
      continue
    }
    
    if (existing) {
      // Update existing skill with level descriptions
      const { error: updateError } = await supabase
        .from('skill_library')
        .update({ 
          level_descriptions: skill.level_descriptions,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
      
      if (updateError) {
        console.error(`Error updating ${skill.name}:`, updateError.message)
        errorCount++
      } else {
        updateCount++
      }
    } else {
      // Insert new skill
      const { error: insertError } = await supabase
        .from('skill_library')
        .insert({
          name: skill.name,
          category: skill.category,
          level_descriptions: skill.level_descriptions,
          is_active: true
        })
      
      if (insertError) {
        console.error(`Error inserting ${skill.name}:`, insertError.message)
        errorCount++
      } else {
        successCount++
      }
    }
  }
  
  console.log('\n=== Import Summary ===')
  console.log(`New skills inserted: ${successCount}`)
  console.log(`Existing skills updated: ${updateCount}`)
  console.log(`Errors: ${errorCount}`)
  console.log(`Total processed: ${allSkills.length}`)
}

importSkills().catch(console.error)

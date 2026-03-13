#!/bin/bash
# Push remaining migrations via Supabase Management API
set -e

PROJECT_REF="uekumyupkhnpjpdcjfxb"
ACCESS_TOKEN="sbp_f8af710de6c6cd3cc8d230e31f14e684fddb8e39"
API_URL="https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query"
MIGRATIONS_DIR="/workspaces/EmployeeGM-GreenDog/supabase/migrations"

# Migrations that need to be applied (not yet in remote history)
PENDING_MIGRATIONS=(
  "20260303000008_fix_sync_log_type_constraint.sql"
  "20260304000001_fix_invoice_dashboard_revenue.sql"
  "20260305000001_fix_invoice_lines_rls.sql"
  "20260305000002_performance_invoice_rpc.sql"
  "20260305000003_add_referral_divisions.sql"
  "20260305000004_add_clinic_services.sql"
  "20260309000001_calendar_note_notifications.sql"
  "20260310000001_add_idexx_antech_contacts.sql"
  "20260310000002_dedup_med_ops_partners.sql"
  "20260311000001_ce_attendee_dedup_merge.sql"
  "202_agent_token_increment_rpc.sql"
  "203_appointment_type_catalog.sql"
  "204_seed_access_reviewer_agent.sql"
  "210_ezyvet_api_integration.sql"
  "211_analytics_api_sync_support.sql"
  "250_notification_audit_fixes.sql"
  "251_fix_skill_management_saves.sql"
  "252_revoke_blanket_grants.sql"
  "253_fix_appointment_rls_precedence.sql"
  "254_safety_log_module.sql"
  "2550_fix_safety_logs_schema.sql"
  "255_fix_safety_logs_rls.sql"
  "256_safety_log_schedules.sql"
  "257_custom_safety_log_types.sql"
  "258_ce_signup_improvements.sql"
  "259_remove_animal_breed_national_days.sql"
  "260_remove_animal_breed_international_days.sql"
  "261_remove_world_animal_days_and_dedup.sql"
  "262_fix_completed_events_year_2026_to_2025.sql"
  "263_fix_federal_holiday_dates.sql"
  "264_restore_student_program_view.sql"
  "265_marketing_events_visual_categories.sql"
  "266_referral_revenue_line_items.sql"
  "267_fix_tier_priority_constraints.sql"
  "268_med_ops_partners_new_fields.sql"
  "269_seed_med_contacts_feb2026.sql"
  "270_update_facility_resources_feb2026.sql"
  "271_candidate_revisit_tracking.sql"
  "272_fix_referral_partners_insert_rls.sql"
  "273_testimonials_and_event_staff.sql"
  "274_marketing_partner_visits.sql"
  "275_safety_log_employee_links.sql"
  "276_consolidate_safety_log_types.sql"
)

TOTAL=${#PENDING_MIGRATIONS[@]}
SUCCESS=0
FAILED=0
SKIPPED=0

echo "=== Pushing ${TOTAL} pending migrations ==="
echo ""

for migration in "${PENDING_MIGRATIONS[@]}"; do
  filepath="${MIGRATIONS_DIR}/${migration}"
  
  if [ ! -f "$filepath" ]; then
    echo "SKIP: ${migration} (file not found)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi
  
  # Extract version from filename (everything before the first underscore)
  version=$(echo "$migration" | sed 's/_.*//')
  
  # Read SQL content
  sql_content=$(cat "$filepath")
  
  echo -n "Applying ${migration}... "
  
  # Execute the SQL via Management API
  response=$(curl -s -w "\n%{http_code}" \
    "$API_URL" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    --data-binary @- <<EOJSON
{"query": $(python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" < "$filepath")}
EOJSON
  )
  
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)
  
  if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
    # Check if response contains an error
    if echo "$body" | grep -qi '"error"'; then
      echo "ERROR: ${body}"
      FAILED=$((FAILED + 1))
    else
      # Record in migration history
      record_response=$(curl -s -w "\n%{http_code}" \
        "$API_URL" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('${version}', '${migration%.sql}') ON CONFLICT (version) DO NOTHING\"}")
      
      echo "OK"
      SUCCESS=$((SUCCESS + 1))
    fi
  else
    echo "HTTP ${http_code}: ${body}"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "=== Results ==="
echo "Success: ${SUCCESS}/${TOTAL}"
echo "Failed:  ${FAILED}/${TOTAL}"
echo "Skipped: ${SKIPPED}/${TOTAL}"

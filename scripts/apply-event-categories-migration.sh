#!/bin/bash
# Apply marketing events visual categories migration

echo "🎨 Applying Marketing Events Visual Categories Migration..."
echo "=================================================="

# Load environment
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Apply migration using Supabase CLI
npx supabase db push --db-url "$DATABASE_URL" --include-all

echo ""
echo "✅ Migration applied successfully!"
echo ""
echo "This migration adds:"
echo "  • event_category column for color coding"
echo "  • Auto-categorization based on event names and types"
echo "  • 8 color categories for visual distinction"
echo ""
echo "Event Categories:"
echo "  🟢 GREEN: Clinic hosted events (CE, health fairs)"
echo "  🟠 ORANGE: Offsite events with tent setup"
echo "  🔴 RED: Street team only (no tent)"
echo "  🩷 PINK: Donation/flyers only"
echo "  🟡 AMBER: Events being considered"
echo "  ⚪ GREY: Awareness days/weeks/months"
echo "  🟡 YELLOW: Major holidays"
echo "  🟤 MAROON: Completed events (override)"
echo ""

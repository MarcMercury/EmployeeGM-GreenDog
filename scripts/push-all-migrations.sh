#!/bin/bash
# Migration pusher that handles conflicts

export SUPABASE_ACCESS_TOKEN=sbp_f8af710de6c6cd3cc8d230e31f14e684fddb8e39

cd /workspaces/EmployeeGM-GreenDog

echo "=== Supabase Migration Push ==="
echo ""
echo "Step 1: Checking remote migrations..."
npx supabase@latest migration list --linked 2>&1 | tail -60

echo ""
echo "Step 2: Attempting to push migrations..."
echo ""
echo "y" | npx supabase@latest db push --include-all 2>&1

echo ""
echo "=== Push Complete ==="
echo "Check the results above for any errors."
echo ""
echo "If there are 'duplicate key' errors for migration 032, this is expected"
echo "because that migration was already applied."

#!/bin/bash
# =============================================================================
# Event Scraper Installation Script
# Installs and configures the external event calendar scraping system
# =============================================================================

set -e

echo "🚀 Installing Event Scraper System..."
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
  echo "❌ npm is not installed. Please install Node.js and npm first."
  exit 1
fi

# 1. Install cheerio dependency
echo "📦 Installing cheerio dependency..."
npm install cheerio

# 2. Check environment variables  
echo ""
echo "🔧 Checking environment variables..."
if [ -z "$NUXT_CRON_SECRET" ]; then
  echo "⚠️  NUXT_CRON_SECRET not set. Generating random secret..."
  CRON_SECRET=$(openssl rand -base64 32)
  echo "NUXT_CRON_SECRET=$CRON_SECRET"
  echo ""
  echo "Add this to your .env file:"
  echo "NUXT_CRON_SECRET=$CRON_SECRET"
else
  echo "✓ NUXT_CRON_SECRET is configured"
fi

# 3. Run database migration
echo ""
echo "📊 Running database migration..."
echo "Run this command to apply database changes:"
echo "  npm run db:migrate"
echo ""

# 4. Vercel configuration
echo "⚙️  Vercel Configuration"
echo ""
echo "Add this to your vercel.json to enable scheduled scraping:"
echo ""
cat << 'EOF'
{
  "crons": [
    {
      "path": "/api/cron/scrape-external-events",
      "schedule": "0 6 * * *"
    }
  ]
}
EOF

echo ""
echo "✓ Installation setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. npm run db:migrate         # Apply database changes"
echo "2. Update .env with NUXT_CRON_SECRET"
echo "3. Update vercel.json with cron configuration"
echo "4. Import EventScraperDialog to your marketing calendar page"
echo "5. Deploy to production"
echo ""
echo "🎉 All done! Event scraping is ready to use."

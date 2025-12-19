# Copilot Workflow Reminder

## After Completing EVERY Task/Request:

### 1. Push Migration to Supabase
```bash
npx supabase db push
```

### 2. Commit Changes
```bash
git add -A
git commit -m "type(scope): description"
```

### 3. Push to Deploy
```bash
git push origin main
```

## Commit Message Types:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `docs` - Documentation
- `style` - Formatting, no code change
- `chore` - Maintenance tasks

## Never Forget:
- ✅ Migrations must be pushed to Supabase
- ✅ All changes must be committed
- ✅ Push triggers Vercel redeploy

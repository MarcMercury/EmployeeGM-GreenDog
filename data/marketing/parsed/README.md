# Marketing Data Migration - Parsed Files

This folder contains CSV files parsed from `Marketing Spreadsheets.xlsx` for database import.

## Files Summary

| File | Records | Description | Target Table |
|------|---------|-------------|--------------|
| `events_completed.csv` | 23 | Historical events (2024-2025) | `marketing_events` |
| `events_scheduled.csv` | 454 | Future/planned events for 2026 | `marketing_events` |
| `influencers_master.csv` | 36 | Main influencer roster | `marketing_influencers` |
| `influencers_petchewlla_2024.csv` | 24 | PetChewlla 2024 event influencers | `marketing_influencers` |
| `inventory.csv` | 29 | Marketing materials inventory | `marketing_inventory` |
| `marketing_contacts.csv` | 79 | Chambers, vendors, partners | `marketing_partners` |
| `resources_passwords.csv` | 70 | Login credentials (SENSITIVE) | `marketing_resources` |
| `staff_petchewlla_2024.csv` | 21 | Event staff assignments | `event_staffing` (reference only) |
| `vendors_petchewlla_2024.csv` | 63 | PetChewlla 2024 vendors | `marketing_partners` |
| `vendors_gd_land_2025.csv` | 39 | GD LAND 2025 vendors | `marketing_partners` |

## Data Quality Notes

### Events
- **Completed events**: Has costs, attendees, leads collected
- **Scheduled events**: Includes awareness months and specific dated events
- Some dates may need manual review (e.g., "2035-11-02" appears to be a typo for "2025-11-02")

### Influencers
- Master list has detailed agreements, promo codes, follower counts
- PetChewlla list is names only (handles derived from names)
- Follower counts need parsing: "4.2M" = 4,200,000, "110k" = 110,000

### Contacts/Partners
- Already tagged by section (Chambers, Food Vendors, Rescues, etc.)
- Some have detailed notes from previous interactions

### Inventory
- Quantities by location (Venice, Sherman Oaks, Valley)
- Includes last ordered dates and reorder points

## Security Warning

⚠️ `resources_passwords.csv` contains sensitive login credentials and is excluded from git via `.gitignore`.

## Next Steps

1. Run the database migration script to import this data
2. Review for duplicates against existing database records
3. Apply UPSERT logic to merge with existing data

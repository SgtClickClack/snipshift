# Data Seeding Scripts

## seed-data.ts

Pre-fills the database with sample shifts and jobs for business users to ensure they don't see empty calendars on first login.

### Usage

```bash
# Seed data for all business users
npm run seed:data

# Seed data for a specific user
npm run seed:data <userId>

# Seed data with custom options (via tsx directly)
tsx scripts/seed-data.ts <userId> <daysAhead> <shiftsPerWeek>
```

### What it does

1. **Finds business users** - Either all business users or a specific user by ID
2. **Checks existing data** - Skips users who already have shifts/jobs
3. **Creates sample shifts**:
   - Tuesday, Thursday, and Saturday shifts
   - Morning shifts (9 AM - 1 PM)
   - Weekend afternoon shifts (2 PM - 6 PM) on Saturdays
   - Mix of `draft` and `open` status
4. **Creates sample jobs**:
   - Weekend barber positions for the next 4 Saturdays
   - All with `open` status

### Example Output

```
🌱 Starting data seeding...

📊 Found 3 business user(s)

👤 Seeding data for: business@example.com (abc-123)
✅ Created 12 shifts for user abc-123
✅ Created 4 jobs for user abc-123

👤 Seeding data for: shop@example.com (def-456)
   ⏭️  User already has data. Skipping...

✅ Seeding complete!
   📅 Created 12 shifts
   💼 Created 4 jobs
```

### When to run

- **After deployment** - To give new users sample data
- **Development** - To populate test accounts
- **After database reset** - To restore sample data

### Notes

- The script is idempotent - safe to run multiple times
- Users with existing data are skipped automatically
- Shifts are created for the next 30 days by default
- All shifts use realistic Melbourne addresses and rates


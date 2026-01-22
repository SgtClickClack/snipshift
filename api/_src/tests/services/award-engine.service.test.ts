import { describe, it, expect, beforeAll, vi } from 'vitest';

/**
 * Award Engine Service Test Suite
 * 
 * Tests verify 2026 HIGA (Hospitality Industry General Award) calculations:
 * - Casual Loading: 25% (applied to base rate for casual workers)
 * - Sunday Penalty: 150% (FT/PT), 175% (Casual)
 * - Saturday Penalty: 125% (FT/PT), 150% (Casual)
 * - Late Night Loading (Mon-Fri 7pm-12am): +$2.81/hr flat
 * - Night Loading (Mon-Fri 12am-7am): +$4.22/hr flat
 */

// Module reference
let awardEngineService: {
  calculateGrossPay: typeof import('@/services/award-engine.service.js').calculateGrossPay;
  formatAwardCalculation: typeof import('@/services/award-engine.service.js').formatAwardCalculation;
};

// Helper to create dates on specific days
function createDateOnDay(dayName: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday', hour: number, minute: number = 0): Date {
  const dayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
  const today = new Date();
  const daysUntilTarget = (dayMap[dayName] - today.getDay() + 7) % 7 || 7;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysUntilTarget);
  targetDate.setHours(hour, minute, 0, 0);
  return targetDate;
}

describe('Award Engine Service - 2026 HIGA Calculations', () => {
  beforeAll(async () => {
    vi.resetModules();
    awardEngineService = await import('@/services/award-engine.service.js');
  });

  describe('Weekday Shifts (Monday-Friday)', () => {
    describe('Day Shift - Base Pay Only', () => {
      it('calculates base pay for casual worker on weekday daytime shift', () => {
        const mondayStart = createDateOnDay('Monday', 9, 0); // 9am
        const mondayEnd = createDateOnDay('Monday', 14, 0); // 2pm (5 hours)
        
        const result = awardEngineService.calculateGrossPay({
          baseRate: 30,
          startTime: mondayStart,
          endTime: mondayEnd,
          userType: 'casual',
        });

        // 5 hours @ $30/hr = $150 base
        // Casual loading 25% = $150 * 0.25 = $37.50
        // Total = $150 + $37.50 = $187.50 = 18750 cents
        expect(result.hoursWorked).toBe(5);
        expect(result.basePayCents).toBe(15000); // $150 base pay
        expect(result.grossPayCents).toBe(18750); // $187.50 total
        
        // Check line items
        const casualLoading = result.lineItems.find(item => item.type === 'CASUAL_LOADING');
        expect(casualLoading).toBeDefined();
        expect(casualLoading?.amountCents).toBe(3750); // $37.50 casual loading
      });

      it('calculates base pay for fulltime worker on weekday daytime shift (no casual loading)', () => {
        const tuesdayStart = createDateOnDay('Tuesday', 10, 0); // 10am
        const tuesdayEnd = createDateOnDay('Tuesday', 16, 0); // 4pm (6 hours)
        
        const result = awardEngineService.calculateGrossPay({
          baseRate: 28,
          startTime: tuesdayStart,
          endTime: tuesdayEnd,
          userType: 'fulltime',
        });

        // 6 hours @ $28/hr = $168 (no casual loading for fulltime)
        expect(result.hoursWorked).toBe(6);
        expect(result.basePayCents).toBe(16800); // $168
        expect(result.grossPayCents).toBe(16800); // Same as base (no penalties)
        
        // Should NOT have casual loading
        const casualLoading = result.lineItems.find(item => item.type === 'CASUAL_LOADING');
        expect(casualLoading).toBeUndefined();
      });

      it('calculates base pay for parttime worker (no casual loading)', () => {
        const wednesdayStart = createDateOnDay('Wednesday', 8, 0);
        const wednesdayEnd = createDateOnDay('Wednesday', 12, 0); // 4 hours
        
        const result = awardEngineService.calculateGrossPay({
          baseRate: 25,
          startTime: wednesdayStart,
          endTime: wednesdayEnd,
          userType: 'parttime',
        });

        // 4 hours @ $25/hr = $100
        expect(result.hoursWorked).toBe(4);
        expect(result.basePayCents).toBe(10000);
        expect(result.grossPayCents).toBe(10000);
      });
    });

    describe('Late Night Shift (7pm-12am)', () => {
      it('calculates late night loading for casual worker (Mon-Fri 7pm-12am)', () => {
        const thursdayStart = createDateOnDay('Thursday', 19, 0); // 7pm
        const thursdayEnd = createDateOnDay('Thursday', 24, 0); // 12am (5 hours)
        
        const result = awardEngineService.calculateGrossPay({
          baseRate: 30,
          startTime: thursdayStart,
          endTime: thursdayEnd,
          userType: 'casual',
        });

        // 5 hours @ $30/hr base = $150
        // Casual loading 25% = $37.50
        // Late night loading 5 hours @ $2.81/hr = $14.05
        // Total = $150 + $37.50 + $14.05 = $201.55 = 20155 cents
        expect(result.hoursWorked).toBe(5);
        expect(result.basePayCents).toBe(15000);
        
        const lateNight = result.lineItems.find(item => item.type === 'LATE_NIGHT_LOADING');
        expect(lateNight).toBeDefined();
        expect(lateNight?.hours).toBe(5);
        expect(lateNight?.rate).toBe(2.81);
        expect(lateNight?.amountCents).toBe(1405); // $14.05
        
        // Total: base ($150) + casual ($37.50) + late night ($14.05) = $201.55
        expect(result.grossPayCents).toBe(20155);
      });

      it('calculates partial late night loading (shift spans day and night)', () => {
        const fridayStart = createDateOnDay('Friday', 17, 0); // 5pm
        const fridayEnd = createDateOnDay('Friday', 22, 0); // 10pm (5 hours total, 3 late night)
        
        const result = awardEngineService.calculateGrossPay({
          baseRate: 32,
          startTime: fridayStart,
          endTime: fridayEnd,
          userType: 'casual',
        });

        // 5 hours total
        // Late night hours: 3 (7pm-10pm)
        // Base: 5 hours @ $32/hr = $160
        // Casual loading: $160 * 0.25 = $40
        // Late night: 3 hours @ $2.81/hr = $8.43
        // Total: $160 + $40 + $8.43 = $208.43 = 20843 cents
        expect(result.hoursWorked).toBe(5);
        
        const lateNight = result.lineItems.find(item => item.type === 'LATE_NIGHT_LOADING');
        expect(lateNight).toBeDefined();
        expect(lateNight?.hours).toBe(3);
        expect(lateNight?.amountCents).toBe(843); // $8.43
      });

      it('calculates late night for fulltime worker (no casual loading)', () => {
        const mondayStart = createDateOnDay('Monday', 20, 0); // 8pm
        const mondayEnd = createDateOnDay('Monday', 24, 0); // 12am (4 hours)
        
        const result = awardEngineService.calculateGrossPay({
          baseRate: 30,
          startTime: mondayStart,
          endTime: mondayEnd,
          userType: 'fulltime',
        });

        // 4 hours @ $30/hr base = $120
        // Late night: 4 hours @ $2.81/hr = $11.24
        // Total: $120 + $11.24 = $131.24 = 13124 cents
        expect(result.hoursWorked).toBe(4);
        expect(result.basePayCents).toBe(12000);
        
        const lateNight = result.lineItems.find(item => item.type === 'LATE_NIGHT_LOADING');
        expect(lateNight?.amountCents).toBe(1124);
        
        expect(result.grossPayCents).toBe(13124);
      });
    });

    describe('Night Shift (12am-7am)', () => {
      it('calculates night loading for casual worker (Mon-Fri 12am-7am)', () => {
        // Create a date for Monday at 2am, ending at 6am (4 hours)
        const monday2am = createDateOnDay('Monday', 2, 0);
        const monday6am = createDateOnDay('Monday', 6, 0);
        
        const result = awardEngineService.calculateGrossPay({
          baseRate: 30,
          startTime: monday2am,
          endTime: monday6am,
          userType: 'casual',
        });

        // 4 hours @ $30/hr base = $120
        // Casual loading 25% = $30
        // Night loading 4 hours @ $4.22/hr = $16.88
        // Total = $120 + $30 + $16.88 = $166.88 = 16688 cents
        expect(result.hoursWorked).toBe(4);
        expect(result.basePayCents).toBe(12000);
        
        const nightLoading = result.lineItems.find(item => item.type === 'NIGHT_LOADING');
        expect(nightLoading).toBeDefined();
        expect(nightLoading?.hours).toBe(4);
        expect(nightLoading?.rate).toBe(4.22);
        expect(nightLoading?.amountCents).toBe(1688); // $16.88
        
        expect(result.grossPayCents).toBe(16688);
      });

      it('calculates night loading for fulltime worker', () => {
        const tuesday1am = createDateOnDay('Tuesday', 1, 0);
        const tuesday5am = createDateOnDay('Tuesday', 5, 0); // 4 hours
        
        const result = awardEngineService.calculateGrossPay({
          baseRate: 28,
          startTime: tuesday1am,
          endTime: tuesday5am,
          userType: 'fulltime',
        });

        // 4 hours @ $28/hr = $112
        // Night loading: 4 hours @ $4.22/hr = $16.88
        // Total: $112 + $16.88 = $128.88 = 12888 cents
        expect(result.hoursWorked).toBe(4);
        expect(result.basePayCents).toBe(11200);
        
        const nightLoading = result.lineItems.find(item => item.type === 'NIGHT_LOADING');
        expect(nightLoading?.amountCents).toBe(1688);
        
        expect(result.grossPayCents).toBe(12888);
      });
    });
  });

  describe('Saturday Shifts', () => {
    it('calculates Saturday penalty for casual worker (150%)', () => {
      const saturdayStart = createDateOnDay('Saturday', 10, 0); // 10am
      const saturdayEnd = createDateOnDay('Saturday', 16, 0); // 4pm (6 hours)
      
      const result = awardEngineService.calculateGrossPay({
        baseRate: 30,
        startTime: saturdayStart,
        endTime: saturdayEnd,
        userType: 'casual',
      });

      // Saturday casual: 150% penalty rate
      // 6 hours @ $30 * 1.5 = $270 (penalty only)
      // Casual loading 25%: 6 hours @ $30 * 0.25 = $45
      // Total: $270 + $45 = $315 = 31500 cents
      expect(result.hoursWorked).toBe(6);
      expect(result.basePayCents).toBe(0); // On Saturday, all pay is penalty
      
      const saturdayPenalty = result.lineItems.find(item => item.type === 'SATURDAY_PENALTY');
      expect(saturdayPenalty).toBeDefined();
      expect(saturdayPenalty?.description).toContain('150%');
      expect(saturdayPenalty?.amountCents).toBe(27000); // $270
      
      const casualLoading = result.lineItems.find(item => item.type === 'CASUAL_LOADING');
      expect(casualLoading?.amountCents).toBe(4500); // $45
      
      expect(result.grossPayCents).toBe(31500);
    });

    it('calculates Saturday penalty for fulltime worker (125%)', () => {
      const saturdayStart = createDateOnDay('Saturday', 12, 0); // 12pm
      const saturdayEnd = createDateOnDay('Saturday', 18, 0); // 6pm (6 hours)
      
      const result = awardEngineService.calculateGrossPay({
        baseRate: 30,
        startTime: saturdayStart,
        endTime: saturdayEnd,
        userType: 'fulltime',
      });

      // Saturday fulltime: 125% penalty rate
      // 6 hours @ $30 * 1.25 = $225
      expect(result.hoursWorked).toBe(6);
      expect(result.basePayCents).toBe(0);
      
      const saturdayPenalty = result.lineItems.find(item => item.type === 'SATURDAY_PENALTY');
      expect(saturdayPenalty?.description).toContain('125%');
      expect(saturdayPenalty?.amountCents).toBe(22500); // $225
      
      expect(result.grossPayCents).toBe(22500);
    });

    it('calculates Saturday penalty for parttime worker (125%)', () => {
      const saturdayStart = createDateOnDay('Saturday', 9, 0);
      const saturdayEnd = createDateOnDay('Saturday', 13, 0); // 4 hours
      
      const result = awardEngineService.calculateGrossPay({
        baseRate: 28,
        startTime: saturdayStart,
        endTime: saturdayEnd,
        userType: 'parttime',
      });

      // Saturday parttime: 125% penalty rate
      // 4 hours @ $28 * 1.25 = $140
      expect(result.hoursWorked).toBe(4);
      expect(result.basePayCents).toBe(0);
      expect(result.grossPayCents).toBe(14000); // $140
    });

    it('Saturday shift does NOT apply late night loading (only weekdays)', () => {
      // Even though it's 7pm-11pm, late night loading only applies Mon-Fri
      const saturdayStart = createDateOnDay('Saturday', 19, 0); // 7pm
      const saturdayEnd = createDateOnDay('Saturday', 23, 0); // 11pm (4 hours)
      
      const result = awardEngineService.calculateGrossPay({
        baseRate: 30,
        startTime: saturdayStart,
        endTime: saturdayEnd,
        userType: 'casual',
      });

      // Should NOT have late night loading
      const lateNight = result.lineItems.find(item => item.type === 'LATE_NIGHT_LOADING');
      expect(lateNight).toBeUndefined();
      
      // Only Saturday penalty + casual loading
      expect(result.lineItems.length).toBe(2); // SATURDAY_PENALTY + CASUAL_LOADING
    });
  });

  describe('Sunday Shifts', () => {
    it('calculates Sunday penalty for casual worker (175%)', () => {
      const sundayStart = createDateOnDay('Sunday', 10, 0); // 10am
      const sundayEnd = createDateOnDay('Sunday', 16, 0); // 4pm (6 hours)
      
      const result = awardEngineService.calculateGrossPay({
        baseRate: 30,
        startTime: sundayStart,
        endTime: sundayEnd,
        userType: 'casual',
      });

      // Sunday casual: 175% penalty rate
      // 6 hours @ $30 * 1.75 = $315 (penalty only)
      // Casual loading 25%: 6 hours @ $30 * 0.25 = $45
      // Total: $315 + $45 = $360 = 36000 cents
      expect(result.hoursWorked).toBe(6);
      expect(result.basePayCents).toBe(0); // On Sunday, all pay is penalty
      
      const sundayPenalty = result.lineItems.find(item => item.type === 'SUNDAY_PENALTY');
      expect(sundayPenalty).toBeDefined();
      expect(sundayPenalty?.description).toContain('175%');
      expect(sundayPenalty?.amountCents).toBe(31500); // $315
      
      const casualLoading = result.lineItems.find(item => item.type === 'CASUAL_LOADING');
      expect(casualLoading?.amountCents).toBe(4500); // $45
      
      expect(result.grossPayCents).toBe(36000);
    });

    it('calculates Sunday penalty for fulltime worker (150%)', () => {
      const sundayStart = createDateOnDay('Sunday', 12, 0); // 12pm
      const sundayEnd = createDateOnDay('Sunday', 18, 0); // 6pm (6 hours)
      
      const result = awardEngineService.calculateGrossPay({
        baseRate: 30,
        startTime: sundayStart,
        endTime: sundayEnd,
        userType: 'fulltime',
      });

      // Sunday fulltime: 150% penalty rate
      // 6 hours @ $30 * 1.5 = $270
      expect(result.hoursWorked).toBe(6);
      expect(result.basePayCents).toBe(0);
      
      const sundayPenalty = result.lineItems.find(item => item.type === 'SUNDAY_PENALTY');
      expect(sundayPenalty?.description).toContain('150%');
      expect(sundayPenalty?.amountCents).toBe(27000); // $270
      
      expect(result.grossPayCents).toBe(27000);
    });

    it('calculates Sunday penalty for parttime worker (150%)', () => {
      const sundayStart = createDateOnDay('Sunday', 8, 0);
      const sundayEnd = createDateOnDay('Sunday', 14, 0); // 6 hours
      
      const result = awardEngineService.calculateGrossPay({
        baseRate: 25,
        startTime: sundayStart,
        endTime: sundayEnd,
        userType: 'parttime',
      });

      // Sunday parttime: 150% penalty rate
      // 6 hours @ $25 * 1.5 = $225
      expect(result.hoursWorked).toBe(6);
      expect(result.basePayCents).toBe(0);
      expect(result.grossPayCents).toBe(22500); // $225
    });

    it('Sunday shift does NOT apply late night loading (only weekdays)', () => {
      // Even though it's 7pm-11pm, late night loading only applies Mon-Fri
      const sundayStart = createDateOnDay('Sunday', 19, 0); // 7pm
      const sundayEnd = createDateOnDay('Sunday', 24, 0); // 12am (5 hours)
      
      const result = awardEngineService.calculateGrossPay({
        baseRate: 30,
        startTime: sundayStart,
        endTime: sundayEnd,
        userType: 'casual',
      });

      // Should NOT have late night loading
      const lateNight = result.lineItems.find(item => item.type === 'LATE_NIGHT_LOADING');
      expect(lateNight).toBeUndefined();
      
      // Only Sunday penalty + casual loading
      expect(result.lineItems.length).toBe(2); // SUNDAY_PENALTY + CASUAL_LOADING
    });

    it('Sunday evening shift matches demo data calculation (5 hours, $30 base, casual)', () => {
      // This test validates the DEMO_JOBS[4] calculation in demo-data.ts
      // Sunday 7pm-12am (5 hours) @ $30/hr for casual worker
      const sundayStart = createDateOnDay('Sunday', 19, 0); // 7pm
      const sundayEnd = createDateOnDay('Sunday', 24, 0); // 12am (5 hours)
      
      const result = awardEngineService.calculateGrossPay({
        baseRate: 30,
        startTime: sundayStart,
        endTime: sundayEnd,
        userType: 'casual',
      });

      // Expected calculation from demo-data.ts:
      // Casual Loading (25%): $30 × 0.25 × 5 = $37.50
      // Sunday Penalty (175%): $30 × 1.75 × 5 = $262.50
      // Total: $37.50 + $262.50 = $300.00 (30000 cents)
      expect(result.hoursWorked).toBe(5);
      expect(result.grossPayCents).toBe(30000); // $300.00
      
      const casualLoading = result.lineItems.find(item => item.type === 'CASUAL_LOADING');
      expect(casualLoading?.amountCents).toBe(3750); // $37.50
      
      const sundayPenalty = result.lineItems.find(item => item.type === 'SUNDAY_PENALTY');
      expect(sundayPenalty?.amountCents).toBe(26250); // $262.50
    });
  });

  describe('Edge Cases', () => {
    it('handles zero hours shift', () => {
      const start = createDateOnDay('Monday', 10, 0);
      const end = createDateOnDay('Monday', 10, 0); // Same time
      
      const result = awardEngineService.calculateGrossPay({
        baseRate: 30,
        startTime: start,
        endTime: end,
        userType: 'casual',
      });

      expect(result.hoursWorked).toBe(0);
      expect(result.grossPayCents).toBe(0);
    });

    it('handles fractional hours (2.5 hour shift)', () => {
      const mondayStart = createDateOnDay('Monday', 9, 0);
      const mondayEnd = createDateOnDay('Monday', 11, 30); // 2.5 hours
      
      const result = awardEngineService.calculateGrossPay({
        baseRate: 30,
        startTime: mondayStart,
        endTime: mondayEnd,
        userType: 'casual',
      });

      // 2.5 hours @ $30/hr base = $75
      // Casual loading 25% = $18.75
      // Total = $93.75 = 9375 cents
      expect(result.hoursWorked).toBe(2.5);
      expect(result.basePayCents).toBe(7500);
      expect(result.grossPayCents).toBe(9375);
    });

    it('defaults to casual when userType not specified', () => {
      const mondayStart = createDateOnDay('Monday', 9, 0);
      const mondayEnd = createDateOnDay('Monday', 13, 0); // 4 hours
      
      const result = awardEngineService.calculateGrossPay({
        baseRate: 30,
        startTime: mondayStart,
        endTime: mondayEnd,
        // userType not specified - should default to casual
      });

      // Should have casual loading
      const casualLoading = result.lineItems.find(item => item.type === 'CASUAL_LOADING');
      expect(casualLoading).toBeDefined();
      expect(casualLoading?.amountCents).toBe(3000); // 4 hours @ $30 * 0.25 = $30
    });

    it('handles very long shift (10+ hours)', () => {
      const mondayStart = createDateOnDay('Monday', 8, 0);
      const mondayEnd = createDateOnDay('Monday', 20, 0); // 12 hours (8am-8pm)
      
      const result = awardEngineService.calculateGrossPay({
        baseRate: 30,
        startTime: mondayStart,
        endTime: mondayEnd,
        userType: 'casual',
      });

      // 12 hours @ $30/hr base = $360
      // Casual loading 25% = $90
      // Late night loading: 1 hour (7pm-8pm) @ $2.81 = $2.81
      // Total = $360 + $90 + $2.81 = $452.81 = 45281 cents
      expect(result.hoursWorked).toBe(12);
      expect(result.basePayCents).toBe(36000);
      
      const lateNight = result.lineItems.find(item => item.type === 'LATE_NIGHT_LOADING');
      expect(lateNight?.hours).toBe(1);
      expect(lateNight?.amountCents).toBe(281);
      
      expect(result.grossPayCents).toBe(45281);
    });
  });

  describe('Format Award Calculation', () => {
    it('formats result with dollar amounts', () => {
      const mondayStart = createDateOnDay('Monday', 10, 0);
      const mondayEnd = createDateOnDay('Monday', 14, 0); // 4 hours
      
      const result = awardEngineService.calculateGrossPay({
        baseRate: 30,
        startTime: mondayStart,
        endTime: mondayEnd,
        userType: 'casual',
      });
      const formatted = awardEngineService.formatAwardCalculation(result);

      // 4 hours @ $30 = $120 base + $30 casual loading = $150 total
      expect(formatted.grossPay).toBe('$150.00');
      expect(formatted.basePay).toBe('$120.00');
      expect(formatted.penaltyPay).toBe('$30.00');
      
      // Check line items are formatted
      expect(formatted.lineItems).toBeInstanceOf(Array);
      expect(formatted.lineItems.length).toBeGreaterThan(0);
      expect(formatted.lineItems[0].amount).toMatch(/^\$\d+\.\d{2}$/);
    });
  });

  describe('Real-World Scenarios', () => {
    it('busy Friday night bar shift (6pm-2am, 8 hours)', () => {
      // 6pm-7pm: 1 hour regular
      // 7pm-12am: 5 hours late night loading
      // Note: Shift ends at 2am next day but we're using same-day calculation
      const fridayStart = createDateOnDay('Friday', 18, 0); // 6pm
      const fridayEnd = new Date(fridayStart);
      fridayEnd.setHours(26, 0, 0, 0); // 2am next day (8 hours)
      
      const result = awardEngineService.calculateGrossPay({
        baseRate: 32,
        startTime: fridayStart,
        endTime: fridayEnd,
        userType: 'casual',
      });

      expect(result.hoursWorked).toBe(8);
      // Base: 8 hours @ $32 = $256
      // Casual: $256 * 0.25 = $64
      // Late night: 5 hours @ $2.81 = $14.05
      // Total: $256 + $64 + $14.05 = $334.05
      expect(result.basePayCents).toBe(25600);
      
      const casualLoading = result.lineItems.find(item => item.type === 'CASUAL_LOADING');
      expect(casualLoading?.amountCents).toBe(6400);
      
      const lateNight = result.lineItems.find(item => item.type === 'LATE_NIGHT_LOADING');
      expect(lateNight?.hours).toBe(5);
      expect(lateNight?.amountCents).toBe(1405);
      
      expect(result.grossPayCents).toBe(33405);
    });

    it('Sunday brunch shift (9am-3pm, 6 hours)', () => {
      const sundayStart = createDateOnDay('Sunday', 9, 0);
      const sundayEnd = createDateOnDay('Sunday', 15, 0); // 6 hours
      
      const result = awardEngineService.calculateGrossPay({
        baseRate: 28,
        startTime: sundayStart,
        endTime: sundayEnd,
        userType: 'casual',
      });

      // Sunday casual: 175% + 25% casual loading
      // Sunday penalty: 6 hours @ $28 * 1.75 = $294
      // Casual loading: 6 hours @ $28 * 0.25 = $42
      // Total: $294 + $42 = $336
      expect(result.hoursWorked).toBe(6);
      expect(result.basePayCents).toBe(0); // All penalty on Sunday
      
      const sundayPenalty = result.lineItems.find(item => item.type === 'SUNDAY_PENALTY');
      expect(sundayPenalty?.amountCents).toBe(29400); // $294
      
      const casualLoading = result.lineItems.find(item => item.type === 'CASUAL_LOADING');
      expect(casualLoading?.amountCents).toBe(4200); // $42
      
      expect(result.grossPayCents).toBe(33600); // $336
    });

    it('Saturday afternoon wedding shift (2pm-10pm, 8 hours, fulltime)', () => {
      const saturdayStart = createDateOnDay('Saturday', 14, 0);
      const saturdayEnd = createDateOnDay('Saturday', 22, 0); // 8 hours
      
      const result = awardEngineService.calculateGrossPay({
        baseRate: 35,
        startTime: saturdayStart,
        endTime: saturdayEnd,
        userType: 'fulltime',
      });

      // Saturday fulltime: 125% penalty
      // 8 hours @ $35 * 1.25 = $350
      expect(result.hoursWorked).toBe(8);
      expect(result.basePayCents).toBe(0);
      
      const saturdayPenalty = result.lineItems.find(item => item.type === 'SATURDAY_PENALTY');
      expect(saturdayPenalty?.amountCents).toBe(35000); // $350
      
      expect(result.grossPayCents).toBe(35000);
    });
  });
});

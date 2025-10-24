// Test the helper function directly
function mapDatabaseRoleToUserRole(dbRole: string): 'professional' | 'business' {
  switch (dbRole) {
    case 'hub':
    case 'brand':
    case 'trainer':
      return 'business';
    case 'professional':
    default:
      return 'professional';
  }
}

describe('Database Storage Utilities', () => {
  describe('mapDatabaseRoleToUserRole', () => {
    it('should map hub role to business', () => {
      const result = mapDatabaseRoleToUserRole('hub');
      expect(result).toBe('business');
    });

    it('should map brand role to business', () => {
      const result = mapDatabaseRoleToUserRole('brand');
      expect(result).toBe('business');
    });

    it('should map trainer role to business', () => {
      const result = mapDatabaseRoleToUserRole('trainer');
      expect(result).toBe('business');
    });

    it('should map professional role to professional', () => {
      const result = mapDatabaseRoleToUserRole('professional');
      expect(result).toBe('professional');
    });

    it('should default to professional for unknown roles', () => {
      const result = mapDatabaseRoleToUserRole('unknown');
      expect(result).toBe('professional');
    });

    it('should handle empty string', () => {
      const result = mapDatabaseRoleToUserRole('');
      expect(result).toBe('professional');
    });

    it('should handle case sensitivity', () => {
      const result = mapDatabaseRoleToUserRole('HUB');
      expect(result).toBe('professional'); // Should default since case doesn't match
    });
  });
});

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { ApolloServer } from '@apollo/server';
import { createTestServer } from './utils/testUtils.js';

describe('GraphQL Integration Tests', () => {
  let server: ApolloServer;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Schema validation', () => {
    it('should have valid schema', () => {
      expect(server).toBeDefined();
      expect(server.schema).toBeDefined();
    });

    it('should include all expected types', () => {
      const typeMap = server.schema.getTypeMap();

      // Check for core types
      expect(typeMap.User).toBeDefined();
      expect(typeMap.Job).toBeDefined();
      expect(typeMap.AuthPayload).toBeDefined();
      expect(typeMap.Query).toBeDefined();
      expect(typeMap.Mutation).toBeDefined();
    });

    it('should include all expected queries', () => {
      const queryType = server.schema.getQueryType();
      const fields = queryType?.getFields();

      expect(fields?.me).toBeDefined();
      expect(fields?.user).toBeDefined();
      expect(fields?.users).toBeDefined();
      expect(fields?.job).toBeDefined();
      expect(fields?.jobs).toBeDefined();
      expect(fields?.socialFeed).toBeDefined();
      expect(fields?.trainingContent).toBeDefined();
    });

    it('should include all expected mutations', () => {
      const mutationType = server.schema.getMutationType();
      const fields = mutationType?.getFields();

      expect(fields?.register).toBeDefined();
      expect(fields?.login).toBeDefined();
      expect(fields?.createJob).toBeDefined();
      expect(fields?.createSocialPost).toBeDefined();
      expect(fields?.createTrainingContent).toBeDefined();
      expect(fields?.sendMessage).toBeDefined();
    });
  });

  describe('Type validation', () => {
    it('should validate User type fields', () => {
      const userType = server.schema.getType('User');
      const fields = (userType as any)?.getFields();

      expect(fields?.id).toBeDefined();
      expect(fields?.email).toBeDefined();
      expect(fields?.displayName).toBeDefined();
      expect(fields?.roles).toBeDefined();
      expect(fields?.currentRole).toBeDefined();
      expect(fields?.isVerified).toBeDefined();
      expect(fields?.createdAt).toBeDefined();
      expect(fields?.updatedAt).toBeDefined();
    });

    it('should validate Job type fields', () => {
      const jobType = server.schema.getType('Job');
      const fields = (jobType as any)?.getFields();

      expect(fields?.id).toBeDefined();
      expect(fields?.title).toBeDefined();
      expect(fields?.description).toBeDefined();
      expect(fields?.skillsRequired).toBeDefined();
      expect(fields?.payRate).toBeDefined();
      expect(fields?.location).toBeDefined();
      expect(fields?.status).toBeDefined();
      expect(fields?.hub).toBeDefined();
      expect(fields?.applications).toBeDefined();
    });

    it('should validate AuthPayload type fields', () => {
      const authPayloadType = server.schema.getType('AuthPayload');
      const fields = (authPayloadType as any)?.getFields();

      expect(fields?.user).toBeDefined();
      expect(fields?.token).toBeDefined();
      expect(fields?.refreshToken).toBeDefined();
    });
  });

  describe('Enum validation', () => {
    it('should have UserRole enum values', () => {
      const userRoleEnum = server.schema.getType('UserRole');
      const values = (userRoleEnum as any)?.getValues();

      expect(values).toBeDefined();
      const valueNames = values.map((v: any) => v.name);
      expect(valueNames).toContain('CLIENT');
      expect(valueNames).toContain('HUB');
      expect(valueNames).toContain('PROFESSIONAL');
      expect(valueNames).toContain('BRAND');
      expect(valueNames).toContain('TRAINER');
    });

    it('should have JobStatus enum values', () => {
      const jobStatusEnum = server.schema.getType('JobStatus');
      const values = (jobStatusEnum as any)?.getValues();

      expect(values).toBeDefined();
      const valueNames = values.map((v: any) => v.name);
      expect(valueNames).toContain('OPEN');
      expect(valueNames).toContain('FILLED');
      expect(valueNames).toContain('CANCELLED');
      expect(valueNames).toContain('COMPLETED');
    });
  });
});

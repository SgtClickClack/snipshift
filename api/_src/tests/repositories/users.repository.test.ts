import { describe, it, expect, beforeEach } from 'vitest';
import * as usersRepo from '../../repositories/users.repository.js';
import { getDb } from '../../db/index.js';
import { users } from '../../db/schema.js';

describe('Users Repository (Integration)', () => {
  const db = getDb();

  // Clean DB before each test to ensure isolation
  beforeEach(async () => {
    if (db) {
      await db.delete(users);
    }
  });

  it('should create a user and retrieve it by email', async () => {
    const userData = {
      email: 'test@integration.com',
      name: 'Integration User',
      role: 'professional' as const,
    };

    const newUser = await usersRepo.createUser(userData);

    expect(newUser).toBeDefined();
    expect(newUser?.email).toBe(userData.email);
    expect(newUser?.name).toBe(userData.name);
    expect(newUser?.id).toBeDefined();
    expect(newUser?.createdAt).toBeInstanceOf(Date);

    // Retrieve by Email
    const retrieved = await usersRepo.getUserByEmail(userData.email);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(newUser!.id);
  });

  it('should retrieve a user by ID', async () => {
    const newUser = await usersRepo.createUser({
      email: 'id-test@example.com',
      name: 'ID Test',
      role: 'business',
    });

    const retrieved = await usersRepo.getUserById(newUser!.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.email).toBe('id-test@example.com');
  });

  it('should update a user', async () => {
    const newUser = await usersRepo.createUser({
      email: 'update-test@example.com',
      name: 'Original Name',
      role: 'professional',
    });

    const updated = await usersRepo.updateUser(newUser!.id, {
      name: 'Updated Name',
      bio: 'New Bio',
    });

    expect(updated).toBeDefined();
    expect(updated?.name).toBe('Updated Name');
    expect(updated?.bio).toBe('New Bio');

    // Verify persistence
    const retrieved = await usersRepo.getUserById(newUser!.id);
    expect(retrieved?.name).toBe('Updated Name');
  });

  it('should delete a user', async () => {
    const newUser = await usersRepo.createUser({
      email: 'delete-test@example.com',
      name: 'Delete Me',
      role: 'professional',
    });

    const result = await usersRepo.deleteUser(newUser!.id);
    expect(result).toBe(true);

    const retrieved = await usersRepo.getUserById(newUser!.id);
    expect(retrieved).toBeNull();
  });

  it('should return null for non-existent user', async () => {
    const result = await usersRepo.getUserByEmail('non-existent@example.com');
    expect(result).toBeNull();
  });
});


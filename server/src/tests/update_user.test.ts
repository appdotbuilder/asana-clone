import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestUser = async (name: string, email: string) => {
    const result = await db.insert(usersTable)
      .values({ name, email })
      .returning()
      .execute();
    return result[0];
  };

  it('should update user name only', async () => {
    // Create a test user directly
    const createdUser = await createTestUser('John Doe', 'john@example.com');

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      name: 'John Updated'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.name).toEqual('John Updated');
    expect(result.email).toEqual('john@example.com'); // Should remain unchanged
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at).toEqual(createdUser.created_at);
  });

  it('should update user email only', async () => {
    // Create a test user directly
    const createdUser = await createTestUser('John Doe', 'john@example.com');

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      email: 'john.updated@example.com'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.name).toEqual('John Doe'); // Should remain unchanged
    expect(result.email).toEqual('john.updated@example.com');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at).toEqual(createdUser.created_at);
  });

  it('should update both name and email', async () => {
    // Create a test user directly
    const createdUser = await createTestUser('John Doe', 'john@example.com');

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      name: 'John Completely Updated',
      email: 'john.completely.updated@example.com'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.name).toEqual('John Completely Updated');
    expect(result.email).toEqual('john.completely.updated@example.com');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at).toEqual(createdUser.created_at);
  });

  it('should persist changes to database', async () => {
    // Create a test user directly
    const createdUser = await createTestUser('John Doe', 'john@example.com');

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      name: 'Database Test User',
      email: 'database@test.com'
    };

    await updateUser(updateInput);

    // Verify changes in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('Database Test User');
    expect(users[0].email).toEqual('database@test.com');
    expect(users[0].created_at).toEqual(createdUser.created_at);
  });

  it('should throw error when user not found', async () => {
    const updateInput: UpdateUserInput = {
      id: 999999, // Non-existent ID
      name: 'Non-existent User'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 999999 not found/i);
  });

  it('should throw error when email is already in use by another user', async () => {
    // Create two test users directly
    const user1 = await createTestUser('John Doe', 'john@example.com');
    const user2 = await createTestUser('Jane Smith', 'jane@example.com');

    // Try to update user2 with user1's email
    const updateInput: UpdateUserInput = {
      id: user2.id,
      email: user1.email // This should conflict
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/Email john@example.com is already in use by another user/i);
  });

  it('should allow user to keep their own email', async () => {
    // Create a test user directly
    const createdUser = await createTestUser('John Doe', 'john@example.com');

    // Update user with same email (should be allowed)
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      name: 'Updated Name',
      email: createdUser.email // Same email should be allowed
    };

    const result = await updateUser(updateInput);

    expect(result.name).toEqual('Updated Name');
    expect(result.email).toEqual(createdUser.email);
  });

  it('should handle partial updates correctly', async () => {
    // Create a test user directly
    const createdUser = await createTestUser('John Doe', 'john@example.com');

    // Update only name, leaving email undefined
    const updateInput1: UpdateUserInput = {
      id: createdUser.id,
      name: 'First Update'
    };

    const result1 = await updateUser(updateInput1);
    expect(result1.name).toEqual('First Update');
    expect(result1.email).toEqual(createdUser.email);

    // Update only email, leaving name undefined
    const updateInput2: UpdateUserInput = {
      id: createdUser.id,
      email: 'second.update@example.com'
    };

    const result2 = await updateUser(updateInput2);
    expect(result2.name).toEqual('First Update'); // Should retain previous update
    expect(result2.email).toEqual('second.update@example.com');
  });

  it('should validate that required fields remain valid after update', async () => {
    // Create a test user directly
    const createdUser = await createTestUser('John Doe', 'john@example.com');

    // All valid updates should work
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      name: 'Valid Name',
      email: 'valid@email.com'
    };

    const result = await updateUser(updateInput);

    expect(typeof result.name).toBe('string');
    expect(result.name.length).toBeGreaterThan(0);
    expect(typeof result.email).toBe('string');
    expect(result.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/); // Basic email regex
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should handle empty update gracefully', async () => {
    // Create a test user directly
    const createdUser = await createTestUser('John Doe', 'john@example.com');

    // Update with no fields changed
    const updateInput: UpdateUserInput = {
      id: createdUser.id
    };

    const result = await updateUser(updateInput);

    // User should remain unchanged
    expect(result.id).toEqual(createdUser.id);
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john@example.com');
    expect(result.created_at).toEqual(createdUser.created_at);
  });
});
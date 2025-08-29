import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetByIdInput } from '../schema';
import { getUserById } from '../handlers/get_user_by_id';

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create test user
    const testUser = await db.insert(usersTable)
      .values({
        name: 'John Doe',
        email: 'john.doe@example.com'
      })
      .returning()
      .execute();

    const input: GetByIdInput = {
      id: testUser[0].id
    };

    const result = await getUserById(input);

    expect(result).not.toBeNull();
    expect(result?.id).toEqual(testUser[0].id);
    expect(result?.name).toEqual('John Doe');
    expect(result?.email).toEqual('john.doe@example.com');
    expect(result?.created_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    const input: GetByIdInput = {
      id: 999 // Non-existent ID
    };

    const result = await getUserById(input);

    expect(result).toBeNull();
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple test users
    const users = await db.insert(usersTable)
      .values([
        { name: 'Alice Smith', email: 'alice@example.com' },
        { name: 'Bob Johnson', email: 'bob@example.com' },
        { name: 'Charlie Brown', email: 'charlie@example.com' }
      ])
      .returning()
      .execute();

    // Get the second user
    const input: GetByIdInput = {
      id: users[1].id
    };

    const result = await getUserById(input);

    expect(result).not.toBeNull();
    expect(result?.id).toEqual(users[1].id);
    expect(result?.name).toEqual('Bob Johnson');
    expect(result?.email).toEqual('bob@example.com');
    expect(result?.created_at).toBeInstanceOf(Date);
  });

  it('should handle edge case with ID zero', async () => {
    const input: GetByIdInput = {
      id: 0
    };

    const result = await getUserById(input);

    expect(result).toBeNull();
  });

  it('should handle negative ID values', async () => {
    const input: GetByIdInput = {
      id: -1
    };

    const result = await getUserById(input);

    expect(result).toBeNull();
  });
});
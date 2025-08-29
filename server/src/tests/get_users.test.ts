import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all users from database', async () => {
    // Create test users directly in database
    await db.insert(usersTable).values([
      {
        name: 'John Doe',
        email: 'john@example.com'
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com'
      },
      {
        name: 'Bob Wilson',
        email: 'bob@example.com'
      }
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Verify first user
    expect(result[0].name).toEqual('John Doe');
    expect(result[0].email).toEqual('john@example.com');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);

    // Verify second user
    expect(result[1].name).toEqual('Jane Smith');
    expect(result[1].email).toEqual('jane@example.com');
    expect(result[1].id).toBeDefined();
    expect(result[1].created_at).toBeInstanceOf(Date);

    // Verify third user
    expect(result[2].name).toEqual('Bob Wilson');
    expect(result[2].email).toEqual('bob@example.com');
    expect(result[2].id).toBeDefined();
    expect(result[2].created_at).toBeInstanceOf(Date);
  });

  it('should return users ordered by id', async () => {
    // Insert users in specific order
    const insertedUsers = await db.insert(usersTable).values([
      {
        name: 'User C',
        email: 'c@example.com'
      },
      {
        name: 'User A',
        email: 'a@example.com'
      },
      {
        name: 'User B',
        email: 'b@example.com'
      }
    ]).returning().execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Users should be returned in order they were inserted (by id)
    expect(result[0].name).toEqual('User C');
    expect(result[1].name).toEqual('User A');
    expect(result[2].name).toEqual('User B');

    // Verify IDs are in ascending order
    expect(result[0].id).toBeLessThan(result[1].id);
    expect(result[1].id).toBeLessThan(result[2].id);
  });

  it('should handle single user correctly', async () => {
    await db.insert(usersTable).values({
      name: 'Single User',
      email: 'single@example.com'
    }).execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Single User');
    expect(result[0].email).toEqual('single@example.com');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return all user fields correctly', async () => {
    await db.insert(usersTable).values({
      name: 'Test User',
      email: 'test@example.com'
    }).execute();

    const result = await getUsers();
    const user = result[0];

    // Verify all required fields are present and have correct types
    expect(typeof user.id).toBe('number');
    expect(typeof user.name).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(user.created_at).toBeInstanceOf(Date);
    
    // Verify field values
    expect(user.name).toEqual('Test User');
    expect(user.email).toEqual('test@example.com');
    expect(user.id).toBeGreaterThan(0);
  });
});
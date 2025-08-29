import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateUserInput = {
  name: 'John Doe',
  email: 'john.doe@example.com'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('John Doe');
    expect(users[0].email).toEqual('john.doe@example.com');
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create second user with same email
    const duplicateInput: CreateUserInput = {
      name: 'Jane Doe',
      email: 'john.doe@example.com' // Same email
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should allow different email addresses', async () => {
    // Create first user
    const firstResult = await createUser(testInput);

    // Create second user with different email
    const secondInput: CreateUserInput = {
      name: 'Jane Smith',
      email: 'jane.smith@example.com'
    };
    const secondResult = await createUser(secondInput);

    // Verify both users exist in database
    const users = await db.select()
      .from(usersTable)
      .execute();

    expect(users).toHaveLength(2);
    expect(firstResult.id).not.toEqual(secondResult.id);
    expect(firstResult.email).toEqual('john.doe@example.com');
    expect(secondResult.email).toEqual('jane.smith@example.com');
  });

  it('should handle empty name validation in Zod (would be caught earlier)', async () => {
    // This demonstrates what would happen if an empty name somehow got through
    // In practice, Zod validation would catch this before the handler is called
    const invalidInput = {
      name: '',
      email: 'test@example.com'
    } as CreateUserInput;

    const result = await createUser(invalidInput);
    
    // The handler itself doesn't validate - it trusts the input is already validated
    expect(result.name).toEqual('');
    expect(result.email).toEqual('test@example.com');
  });

  it('should handle special characters in name and email', async () => {
    const specialInput: CreateUserInput = {
      name: "O'Connor, José-María",
      email: 'jose.o-connor+test@sub-domain.co.uk'
    };

    const result = await createUser(specialInput);

    expect(result.name).toEqual("O'Connor, José-María");
    expect(result.email).toEqual('jose.o-connor+test@sub-domain.co.uk');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });
});
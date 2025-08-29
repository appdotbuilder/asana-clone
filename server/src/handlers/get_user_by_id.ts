import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetByIdInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUserById(input: GetByIdInput): Promise<User | null> {
  try {
    // Query for user by ID
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    // Return null if user not found
    if (result.length === 0) {
      return null;
    }

    // Return the found user
    return result[0];
  } catch (error) {
    console.error('User retrieval failed:', error);
    throw error;
  }
}
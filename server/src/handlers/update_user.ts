import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq, and, ne } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // Check if user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    // If email is being updated, check for uniqueness
    if (input.email) {
      const emailConflict = await db.select()
        .from(usersTable)
        .where(and(
          eq(usersTable.email, input.email),
          ne(usersTable.id, input.id)
        ))
        .execute();

      if (emailConflict.length > 0) {
        throw new Error(`Email ${input.email} is already in use by another user`);
      }
    }

    // Build update object with only provided fields
    const updateData: { name?: string; email?: string } = {};
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.email !== undefined) {
      updateData.email = input.email;
    }

    // If no fields to update, return existing user
    if (Object.keys(updateData).length === 0) {
      return existingUser[0];
    }

    // Update user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type DeleteInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteUser = async (input: DeleteInput): Promise<{ success: boolean }> => {
  try {
    // First, check if the user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    // Check if user has assigned tasks
    const assignedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.assignee_id, input.id))
      .execute();

    // If user has assigned tasks, set assignee_id to null (unassign tasks)
    if (assignedTasks.length > 0) {
      await db.update(tasksTable)
        .set({ assignee_id: null })
        .where(eq(tasksTable.assignee_id, input.id))
        .execute();
    }

    // Delete the user
    await db.delete(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
};
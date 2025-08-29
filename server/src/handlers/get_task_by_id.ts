import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type GetByIdInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export async function getTaskById(input: GetByIdInput): Promise<Task | null> {
  try {
    const result = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, input.id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const task = result[0];
    return {
      ...task,
      // All fields are already in correct format for task schema
      // No numeric conversions needed as task table doesn't have numeric columns
    };
  } catch (error) {
    console.error('Failed to fetch task by id:', error);
    throw error;
  }
}
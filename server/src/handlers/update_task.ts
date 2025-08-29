import { db } from '../db';
import { tasksTable, usersTable, projectsTable } from '../db/schema';
import { type UpdateTaskInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTask = async (input: UpdateTaskInput): Promise<Task> => {
  try {
    // First, verify the task exists
    const existingTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, input.id))
      .execute();

    if (existingTask.length === 0) {
      throw new Error(`Task with id ${input.id} not found`);
    }

    // Validate project_id exists if being updated
    if (input.project_id !== undefined) {
      const project = await db.select()
        .from(projectsTable)
        .where(eq(projectsTable.id, input.project_id))
        .execute();

      if (project.length === 0) {
        throw new Error(`Project with id ${input.project_id} not found`);
      }
    }

    // Validate assignee_id exists if being updated (and not null)
    if (input.assignee_id !== undefined && input.assignee_id !== null) {
      const assignee = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.assignee_id))
        .execute();

      if (assignee.length === 0) {
        throw new Error(`User with id ${input.assignee_id} not found`);
      }
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof tasksTable.$inferInsert> = {};
    
    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.due_date !== undefined) {
      updateData.due_date = input.due_date;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.priority !== undefined) {
      updateData.priority = input.priority;
    }
    if (input.assignee_id !== undefined) {
      updateData.assignee_id = input.assignee_id;
    }
    if (input.project_id !== undefined) {
      updateData.project_id = input.project_id;
    }

    // Update the task
    const result = await db.update(tasksTable)
      .set(updateData)
      .where(eq(tasksTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Task update failed:', error);
    throw error;
  }
};
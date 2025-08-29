import { db } from '../db';
import { tasksTable, projectsTable, usersTable } from '../db/schema';
import { type CreateTaskInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export async function createTask(input: CreateTaskInput): Promise<Task> {
  try {
    // Validate that project_id exists
    const project = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, input.project_id))
      .execute();

    if (project.length === 0) {
      throw new Error(`Project with id ${input.project_id} does not exist`);
    }

    // Validate that assignee_id exists (if provided)
    if (input.assignee_id !== null && input.assignee_id !== undefined) {
      const assignee = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.assignee_id))
        .execute();

      if (assignee.length === 0) {
        throw new Error(`User with id ${input.assignee_id} does not exist`);
      }
    }

    // Insert task record
    const result = await db.insert(tasksTable)
      .values({
        title: input.title,
        description: input.description || null,
        due_date: input.due_date || null,
        status: input.status,
        priority: input.priority,
        assignee_id: input.assignee_id || null,
        project_id: input.project_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
}
import { db } from '../db';
import { tasksTable, projectsTable } from '../db/schema';
import { type GetTasksByProjectInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export async function getTasksByProject(input: GetTasksByProjectInput): Promise<Task[]> {
  try {
    // First validate that the project exists
    const project = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, input.project_id))
      .execute();

    if (project.length === 0) {
      throw new Error(`Project with ID ${input.project_id} not found`);
    }

    // Fetch all tasks for the project
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.project_id, input.project_id))
      .execute();

    // Return tasks as-is since no numeric conversions are needed
    // All fields are already in the correct format from the database
    return tasks;
  } catch (error) {
    console.error('Failed to get tasks by project:', error);
    throw error;
  }
}
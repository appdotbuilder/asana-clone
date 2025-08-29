import { db } from '../db';
import { projectsTable, tasksTable } from '../db/schema';
import { type DeleteInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function deleteProject(input: DeleteInput): Promise<{ success: boolean }> {
  try {
    // First, check if the project exists
    const existingProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, input.id))
      .execute();

    if (existingProject.length === 0) {
      throw new Error(`Project with id ${input.id} not found`);
    }

    // Delete associated tasks first (cascade deletion)
    await db.delete(tasksTable)
      .where(eq(tasksTable.project_id, input.id))
      .execute();

    // Then delete the project
    await db.delete(projectsTable)
      .where(eq(projectsTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Project deletion failed:', error);
    throw error;
  }
}
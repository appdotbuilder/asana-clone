import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type UpdateProjectInput, type Project } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateProject(input: UpdateProjectInput): Promise<Project> {
  try {
    // First, check if project exists
    const existingProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, input.id))
      .execute();

    if (existingProject.length === 0) {
      throw new Error(`Project with id ${input.id} not found`);
    }

    // Build update values object with only provided fields
    const updateValues: any = {};
    if (input.name !== undefined) updateValues.name = input.name;
    if (input.description !== undefined) updateValues.description = input.description;
    if (input.status !== undefined) updateValues.status = input.status;
    if (input.start_date !== undefined) updateValues.start_date = input.start_date;
    if (input.end_date !== undefined) updateValues.end_date = input.end_date;

    // Only proceed with update if there are fields to update
    if (Object.keys(updateValues).length === 0) {
      // No fields to update, return existing project
      return existingProject[0];
    }

    // Update the project
    const result = await db.update(projectsTable)
      .set(updateValues)
      .where(eq(projectsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Project update failed:', error);
    throw error;
  }
}
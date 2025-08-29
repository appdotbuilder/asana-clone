import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type GetByIdInput, type Project } from '../schema';
import { eq } from 'drizzle-orm';

export const getProjectById = async (input: GetByIdInput): Promise<Project | null> => {
  try {
    // Query project by ID
    const results = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, input.id))
      .execute();

    // Return null if project not found
    if (results.length === 0) {
      return null;
    }

    // Return the found project
    return results[0];
  } catch (error) {
    console.error('Failed to get project by ID:', error);
    throw error;
  }
};
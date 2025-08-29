import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type GetByIdInput, type CreateProjectInput } from '../schema';
import { getProjectById } from '../handlers/get_project_by_id';
import { eq } from 'drizzle-orm';

// Test project data
const testProject: CreateProjectInput = {
  name: 'Test Project',
  description: 'A project for testing',
  status: 'Active',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31')
};

const testProjectWithNulls: CreateProjectInput = {
  name: 'Minimal Project',
  description: null,
  status: 'On Hold',
  start_date: null,
  end_date: null
};

describe('getProjectById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a project when found', async () => {
    // Create test project
    const insertResult = await db.insert(projectsTable)
      .values({
        name: testProject.name,
        description: testProject.description,
        status: testProject.status,
        start_date: testProject.start_date,
        end_date: testProject.end_date
      })
      .returning()
      .execute();

    const createdProject = insertResult[0];
    const input: GetByIdInput = { id: createdProject.id };

    // Test the handler
    const result = await getProjectById(input);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdProject.id);
    expect(result!.name).toEqual('Test Project');
    expect(result!.description).toEqual('A project for testing');
    expect(result!.status).toEqual('Active');
    expect(result!.start_date).toBeInstanceOf(Date);
    expect(result!.end_date).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should handle projects with null fields correctly', async () => {
    // Create test project with null fields
    const insertResult = await db.insert(projectsTable)
      .values({
        name: testProjectWithNulls.name,
        description: testProjectWithNulls.description,
        status: testProjectWithNulls.status,
        start_date: testProjectWithNulls.start_date,
        end_date: testProjectWithNulls.end_date
      })
      .returning()
      .execute();

    const createdProject = insertResult[0];
    const input: GetByIdInput = { id: createdProject.id };

    // Test the handler
    const result = await getProjectById(input);

    // Verify the result handles null values correctly
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdProject.id);
    expect(result!.name).toEqual('Minimal Project');
    expect(result!.description).toBeNull();
    expect(result!.status).toEqual('On Hold');
    expect(result!.start_date).toBeNull();
    expect(result!.end_date).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when project is not found', async () => {
    const input: GetByIdInput = { id: 9999 }; // Non-existent ID

    const result = await getProjectById(input);

    expect(result).toBeNull();
  });

  it('should return the correct project when multiple projects exist', async () => {
    // Create multiple projects
    const projects = await Promise.all([
      db.insert(projectsTable)
        .values({
          name: 'Project 1',
          description: 'First project',
          status: 'Active',
          start_date: null,
          end_date: null
        })
        .returning()
        .execute(),
      db.insert(projectsTable)
        .values({
          name: 'Project 2',
          description: 'Second project',
          status: 'Completed',
          start_date: new Date('2023-01-01'),
          end_date: new Date('2023-12-31')
        })
        .returning()
        .execute()
    ]);

    const project1 = projects[0][0];
    const project2 = projects[1][0];

    // Test getting the first project
    const result1 = await getProjectById({ id: project1.id });
    expect(result1).not.toBeNull();
    expect(result1!.name).toEqual('Project 1');
    expect(result1!.status).toEqual('Active');

    // Test getting the second project
    const result2 = await getProjectById({ id: project2.id });
    expect(result2).not.toBeNull();
    expect(result2!.name).toEqual('Project 2');
    expect(result2!.status).toEqual('Completed');
    expect(result2!.start_date).toBeInstanceOf(Date);
  });

  it('should verify the project exists in database after retrieval', async () => {
    // Create test project
    const insertResult = await db.insert(projectsTable)
      .values({
        name: testProject.name,
        description: testProject.description,
        status: testProject.status,
        start_date: testProject.start_date,
        end_date: testProject.end_date
      })
      .returning()
      .execute();

    const createdProject = insertResult[0];

    // Get project using handler
    const result = await getProjectById({ id: createdProject.id });

    // Verify the project exists in database by querying directly
    const dbProjects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, createdProject.id))
      .execute();

    expect(dbProjects).toHaveLength(1);
    expect(dbProjects[0].id).toEqual(result!.id);
    expect(dbProjects[0].name).toEqual(result!.name);
    expect(dbProjects[0].status).toEqual(result!.status);
  });
});
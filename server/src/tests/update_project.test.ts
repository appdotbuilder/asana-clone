import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type UpdateProjectInput, type CreateProjectInput } from '../schema';
import { updateProject } from '../handlers/update_project';
import { eq } from 'drizzle-orm';

// Helper function to create a test project
const createTestProject = async (input: CreateProjectInput) => {
  const result = await db.insert(projectsTable)
    .values({
      name: input.name,
      description: input.description || null,
      status: input.status,
      start_date: input.start_date || null,
      end_date: input.end_date || null
    })
    .returning()
    .execute();
  return result[0];
};

const testProjectInput: CreateProjectInput = {
  name: 'Original Project',
  description: 'Original description',
  status: 'Active',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31')
};

describe('updateProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update project name only', async () => {
    // Create test project
    const createdProject = await createTestProject(testProjectInput);
    
    const updateInput: UpdateProjectInput = {
      id: createdProject.id,
      name: 'Updated Project Name'
    };

    const result = await updateProject(updateInput);

    // Verify updated fields
    expect(result.name).toEqual('Updated Project Name');
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.status).toEqual('Active'); // Unchanged
    expect(result.start_date).toEqual(createdProject.start_date); // Unchanged
    expect(result.end_date).toEqual(createdProject.end_date); // Unchanged
    expect(result.id).toEqual(createdProject.id);
    expect(result.created_at).toEqual(createdProject.created_at);
  });

  it('should update all fields', async () => {
    // Create test project
    const createdProject = await createTestProject(testProjectInput);
    
    const updateInput: UpdateProjectInput = {
      id: createdProject.id,
      name: 'Completely Updated Project',
      description: 'New description',
      status: 'On Hold',
      start_date: new Date('2024-02-01'),
      end_date: new Date('2024-11-30')
    };

    const result = await updateProject(updateInput);

    // Verify all fields were updated
    expect(result.name).toEqual('Completely Updated Project');
    expect(result.description).toEqual('New description');
    expect(result.status).toEqual('On Hold');
    expect(result.start_date).toEqual(new Date('2024-02-01'));
    expect(result.end_date).toEqual(new Date('2024-11-30'));
    expect(result.id).toEqual(createdProject.id);
    expect(result.created_at).toEqual(createdProject.created_at);
  });

  it('should update nullable fields to null', async () => {
    // Create test project
    const createdProject = await createTestProject(testProjectInput);
    
    const updateInput: UpdateProjectInput = {
      id: createdProject.id,
      description: null,
      start_date: null,
      end_date: null
    };

    const result = await updateProject(updateInput);

    // Verify nullable fields were set to null
    expect(result.description).toBeNull();
    expect(result.start_date).toBeNull();
    expect(result.end_date).toBeNull();
    expect(result.name).toEqual('Original Project'); // Unchanged
    expect(result.status).toEqual('Active'); // Unchanged
  });

  it('should save updated project to database', async () => {
    // Create test project
    const createdProject = await createTestProject(testProjectInput);
    
    const updateInput: UpdateProjectInput = {
      id: createdProject.id,
      name: 'Database Updated Project',
      status: 'Completed'
    };

    await updateProject(updateInput);

    // Query database directly to verify changes were persisted
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, createdProject.id))
      .execute();

    expect(projects).toHaveLength(1);
    expect(projects[0].name).toEqual('Database Updated Project');
    expect(projects[0].status).toEqual('Completed');
    expect(projects[0].description).toEqual('Original description'); // Unchanged
  });

  it('should return existing project when no fields to update', async () => {
    // Create test project
    const createdProject = await createTestProject(testProjectInput);
    
    const updateInput: UpdateProjectInput = {
      id: createdProject.id
    };

    const result = await updateProject(updateInput);

    // Should return project unchanged
    expect(result).toEqual(createdProject);
  });

  it('should throw error for non-existent project', async () => {
    const updateInput: UpdateProjectInput = {
      id: 999999, // Non-existent ID
      name: 'Updated Name'
    };

    await expect(updateProject(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle partial updates with mixed field types', async () => {
    // Create test project
    const createdProject = await createTestProject(testProjectInput);
    
    const updateInput: UpdateProjectInput = {
      id: createdProject.id,
      name: 'Mixed Update Project',
      description: null, // Setting to null
      status: 'Completed',
      // start_date and end_date not provided - should remain unchanged
    };

    const result = await updateProject(updateInput);

    expect(result.name).toEqual('Mixed Update Project');
    expect(result.description).toBeNull();
    expect(result.status).toEqual('Completed');
    expect(result.start_date).toEqual(createdProject.start_date); // Unchanged
    expect(result.end_date).toEqual(createdProject.end_date); // Unchanged
  });

  it('should update project with different status values', async () => {
    // Create test project
    const createdProject = await createTestProject(testProjectInput);
    
    // Test each status value
    const statuses = ['On Hold', 'Completed', 'Active'] as const;
    
    for (const status of statuses) {
      const updateInput: UpdateProjectInput = {
        id: createdProject.id,
        status: status
      };

      const result = await updateProject(updateInput);
      expect(result.status).toEqual(status);
    }
  });
});
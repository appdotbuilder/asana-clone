import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type CreateProjectInput } from '../schema';
import { createProject } from '../handlers/create_project';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateProjectInput = {
  name: 'Test Project',
  description: 'A project for testing',
  status: 'Active',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31')
};

// Test input with minimal required fields
const minimalInput: CreateProjectInput = {
  name: 'Minimal Project',
  status: 'On Hold'
};

describe('createProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a project with all fields', async () => {
    const result = await createProject(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Project');
    expect(result.description).toEqual('A project for testing');
    expect(result.status).toEqual('Active');
    expect(result.start_date).toEqual(testInput.start_date!);
    expect(result.end_date).toEqual(testInput.end_date!);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a project with minimal fields', async () => {
    const result = await createProject(minimalInput);

    // Basic field validation
    expect(result.name).toEqual('Minimal Project');
    expect(result.description).toBeNull();
    expect(result.status).toEqual('On Hold');
    expect(result.start_date).toBeNull();
    expect(result.end_date).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save project to database', async () => {
    const result = await createProject(testInput);

    // Query using proper drizzle syntax
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, result.id))
      .execute();

    expect(projects).toHaveLength(1);
    expect(projects[0].name).toEqual('Test Project');
    expect(projects[0].description).toEqual('A project for testing');
    expect(projects[0].status).toEqual('Active');
    expect(projects[0].start_date).toEqual(testInput.start_date!);
    expect(projects[0].end_date).toEqual(testInput.end_date!);
    expect(projects[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle different project statuses correctly', async () => {
    const activeProject = await createProject({
      name: 'Active Project',
      status: 'Active'
    });

    const onHoldProject = await createProject({
      name: 'On Hold Project',
      status: 'On Hold'
    });

    const completedProject = await createProject({
      name: 'Completed Project',
      status: 'Completed'
    });

    expect(activeProject.status).toEqual('Active');
    expect(onHoldProject.status).toEqual('On Hold');
    expect(completedProject.status).toEqual('Completed');
  });

  it('should handle null optional fields correctly', async () => {
    const projectWithNulls = await createProject({
      name: 'Project with Nulls',
      status: 'Active',
      description: null,
      start_date: null,
      end_date: null
    });

    expect(projectWithNulls.description).toBeNull();
    expect(projectWithNulls.start_date).toBeNull();
    expect(projectWithNulls.end_date).toBeNull();

    // Verify in database
    const dbProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectWithNulls.id))
      .execute();

    expect(dbProject[0].description).toBeNull();
    expect(dbProject[0].start_date).toBeNull();
    expect(dbProject[0].end_date).toBeNull();
  });

  it('should create multiple projects independently', async () => {
    const project1 = await createProject({
      name: 'Project 1',
      status: 'Active'
    });

    const project2 = await createProject({
      name: 'Project 2',
      status: 'Completed'
    });

    // Projects should have different IDs
    expect(project1.id).not.toEqual(project2.id);
    expect(project1.name).toEqual('Project 1');
    expect(project2.name).toEqual('Project 2');

    // Both should be in database
    const allProjects = await db.select()
      .from(projectsTable)
      .execute();

    expect(allProjects).toHaveLength(2);
  });
});
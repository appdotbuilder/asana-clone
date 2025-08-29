import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { projectsTable, usersTable, tasksTable } from '../db/schema';
import { type DeleteInput, type CreateProjectInput, type CreateUserInput, type CreateTaskInput } from '../schema';
import { deleteProject } from '../handlers/delete_project';
import { eq } from 'drizzle-orm';

const testProjectInput: CreateProjectInput = {
  name: 'Test Project',
  description: 'A project for testing deletion',
  status: 'Active',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31')
};

const testUserInput: CreateUserInput = {
  name: 'Test User',
  email: 'test@example.com'
};

describe('deleteProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a project successfully', async () => {
    // Create a project first
    const projectResult = await db.insert(projectsTable)
      .values(testProjectInput)
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Delete the project
    const deleteInput: DeleteInput = { id: projectId };
    const result = await deleteProject(deleteInput);

    expect(result.success).toBe(true);

    // Verify project is deleted from database
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .execute();

    expect(projects).toHaveLength(0);
  });

  it('should cascade delete associated tasks', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a project
    const projectResult = await db.insert(projectsTable)
      .values(testProjectInput)
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Create tasks associated with the project
    const taskInput: CreateTaskInput = {
      title: 'Test Task 1',
      description: 'First test task',
      status: 'To Do',
      priority: 'Medium',
      assignee_id: userId,
      project_id: projectId,
      due_date: new Date('2024-06-01')
    };

    const taskInput2: CreateTaskInput = {
      title: 'Test Task 2',
      description: 'Second test task',
      status: 'In Progress',
      priority: 'High',
      assignee_id: userId,
      project_id: projectId,
      due_date: new Date('2024-07-01')
    };

    await db.insert(tasksTable).values(taskInput).execute();
    await db.insert(tasksTable).values(taskInput2).execute();

    // Verify tasks exist before deletion
    const tasksBeforeDeletion = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.project_id, projectId))
      .execute();

    expect(tasksBeforeDeletion).toHaveLength(2);

    // Delete the project
    const deleteInput: DeleteInput = { id: projectId };
    const result = await deleteProject(deleteInput);

    expect(result.success).toBe(true);

    // Verify project is deleted
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .execute();

    expect(projects).toHaveLength(0);

    // Verify associated tasks are also deleted (cascade)
    const tasksAfterDeletion = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.project_id, projectId))
      .execute();

    expect(tasksAfterDeletion).toHaveLength(0);
  });

  it('should throw error when project does not exist', async () => {
    const nonExistentId = 9999;
    const deleteInput: DeleteInput = { id: nonExistentId };

    await expect(deleteProject(deleteInput)).rejects.toThrow(/Project with id 9999 not found/i);
  });

  it('should handle deletion of project without tasks', async () => {
    // Create a project with no associated tasks
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Empty Project',
        description: 'Project with no tasks',
        status: 'Active'
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Delete the project
    const deleteInput: DeleteInput = { id: projectId };
    const result = await deleteProject(deleteInput);

    expect(result.success).toBe(true);

    // Verify project is deleted
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .execute();

    expect(projects).toHaveLength(0);
  });

  it('should preserve other projects when deleting one', async () => {
    // Create multiple projects
    const project1Result = await db.insert(projectsTable)
      .values({
        name: 'Project 1',
        description: 'First project',
        status: 'Active'
      })
      .returning()
      .execute();

    const project2Result = await db.insert(projectsTable)
      .values({
        name: 'Project 2',
        description: 'Second project',
        status: 'Completed'
      })
      .returning()
      .execute();

    const project1Id = project1Result[0].id;
    const project2Id = project2Result[0].id;

    // Delete only the first project
    const deleteInput: DeleteInput = { id: project1Id };
    const result = await deleteProject(deleteInput);

    expect(result.success).toBe(true);

    // Verify first project is deleted
    const deletedProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, project1Id))
      .execute();

    expect(deletedProject).toHaveLength(0);

    // Verify second project still exists
    const remainingProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, project2Id))
      .execute();

    expect(remainingProject).toHaveLength(1);
    expect(remainingProject[0].name).toBe('Project 2');
  });
});
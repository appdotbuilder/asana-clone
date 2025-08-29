import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable, projectsTable, usersTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

// Test data setup
let testUser: any;
let testProject: any;

const testTaskInput: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing',
  due_date: new Date('2024-12-31'),
  status: 'To Do',
  priority: 'Medium',
  assignee_id: null, // Will be set in tests
  project_id: 0 // Will be set in tests
};

describe('createTask', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create prerequisite project
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'A project for testing',
        status: 'Active'
      })
      .returning()
      .execute();
    testProject = projectResult[0];
  });

  afterEach(resetDB);

  it('should create a task with all fields', async () => {
    const input = {
      ...testTaskInput,
      assignee_id: testUser.id,
      project_id: testProject.id
    };

    const result = await createTask(input);

    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('A task for testing');
    expect(result.due_date).toBeInstanceOf(Date);
    expect(result.status).toEqual('To Do');
    expect(result.priority).toEqual('Medium');
    expect(result.assignee_id).toEqual(testUser.id);
    expect(result.project_id).toEqual(testProject.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a task without assignee', async () => {
    const input = {
      ...testTaskInput,
      assignee_id: null,
      project_id: testProject.id
    };

    const result = await createTask(input);

    expect(result.title).toEqual('Test Task');
    expect(result.assignee_id).toBeNull();
    expect(result.project_id).toEqual(testProject.id);
    expect(result.id).toBeDefined();
  });

  it('should create a task with minimal fields', async () => {
    const input: CreateTaskInput = {
      title: 'Minimal Task',
      status: 'In Progress',
      priority: 'High',
      project_id: testProject.id
    };

    const result = await createTask(input);

    expect(result.title).toEqual('Minimal Task');
    expect(result.description).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.status).toEqual('In Progress');
    expect(result.priority).toEqual('High');
    expect(result.assignee_id).toBeNull();
    expect(result.project_id).toEqual(testProject.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save task to database', async () => {
    const input = {
      ...testTaskInput,
      assignee_id: testUser.id,
      project_id: testProject.id
    };

    const result = await createTask(input);

    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Test Task');
    expect(tasks[0].description).toEqual('A task for testing');
    expect(tasks[0].status).toEqual('To Do');
    expect(tasks[0].priority).toEqual('Medium');
    expect(tasks[0].assignee_id).toEqual(testUser.id);
    expect(tasks[0].project_id).toEqual(testProject.id);
    expect(tasks[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent project', async () => {
    const input = {
      ...testTaskInput,
      project_id: 99999 // Non-existent project ID
    };

    await expect(createTask(input)).rejects.toThrow(/Project with id 99999 does not exist/i);
  });

  it('should throw error for non-existent assignee', async () => {
    const input = {
      ...testTaskInput,
      assignee_id: 99999, // Non-existent user ID
      project_id: testProject.id
    };

    await expect(createTask(input)).rejects.toThrow(/User with id 99999 does not exist/i);
  });

  it('should handle different task statuses', async () => {
    const statuses: Array<'To Do' | 'In Progress' | 'Done'> = ['To Do', 'In Progress', 'Done'];
    
    for (const status of statuses) {
      const input = {
        ...testTaskInput,
        title: `Task with ${status} status`,
        status,
        project_id: testProject.id
      };

      const result = await createTask(input);
      expect(result.status).toEqual(status);
    }
  });

  it('should handle different task priorities', async () => {
    const priorities: Array<'Low' | 'Medium' | 'High'> = ['Low', 'Medium', 'High'];
    
    for (const priority of priorities) {
      const input = {
        ...testTaskInput,
        title: `Task with ${priority} priority`,
        priority,
        project_id: testProject.id
      };

      const result = await createTask(input);
      expect(result.priority).toEqual(priority);
    }
  });
});
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable, usersTable, projectsTable } from '../db/schema';
import { type UpdateTaskInput, type CreateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq } from 'drizzle-orm';

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testProjectId: number;
  let testTaskId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test project
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'A project for testing',
        status: 'Active'
      })
      .returning()
      .execute();
    testProjectId = projectResult[0].id;

    // Create test task
    const taskResult = await db.insert(tasksTable)
      .values({
        title: 'Original Task',
        description: 'Original description',
        due_date: new Date('2024-12-31'),
        status: 'To Do',
        priority: 'Medium',
        assignee_id: testUserId,
        project_id: testProjectId
      })
      .returning()
      .execute();
    testTaskId = taskResult[0].id;
  });

  it('should update task title', async () => {
    const updateInput: UpdateTaskInput = {
      id: testTaskId,
      title: 'Updated Task Title'
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(testTaskId);
    expect(result.title).toEqual('Updated Task Title');
    expect(result.description).toEqual('Original description');
    expect(result.status).toEqual('To Do');
    expect(result.priority).toEqual('Medium');
    expect(result.assignee_id).toEqual(testUserId);
    expect(result.project_id).toEqual(testProjectId);
  });

  it('should update multiple task fields', async () => {
    const newDate = new Date('2025-01-15');
    const updateInput: UpdateTaskInput = {
      id: testTaskId,
      title: 'Multi-field Update',
      description: 'Updated description',
      due_date: newDate,
      status: 'In Progress',
      priority: 'High'
    };

    const result = await updateTask(updateInput);

    expect(result.title).toEqual('Multi-field Update');
    expect(result.description).toEqual('Updated description');
    expect(result.due_date).toEqual(newDate);
    expect(result.status).toEqual('In Progress');
    expect(result.priority).toEqual('High');
    expect(result.assignee_id).toEqual(testUserId);
    expect(result.project_id).toEqual(testProjectId);
  });

  it('should update task assignee', async () => {
    // Create another user
    const newUserResult = await db.insert(usersTable)
      .values({
        name: 'New Assignee',
        email: 'newassignee@example.com'
      })
      .returning()
      .execute();

    const updateInput: UpdateTaskInput = {
      id: testTaskId,
      assignee_id: newUserResult[0].id
    };

    const result = await updateTask(updateInput);

    expect(result.assignee_id).toEqual(newUserResult[0].id);
    expect(result.title).toEqual('Original Task');
  });

  it('should set assignee to null', async () => {
    const updateInput: UpdateTaskInput = {
      id: testTaskId,
      assignee_id: null
    };

    const result = await updateTask(updateInput);

    expect(result.assignee_id).toBeNull();
    expect(result.title).toEqual('Original Task');
  });

  it('should update task project', async () => {
    // Create another project
    const newProjectResult = await db.insert(projectsTable)
      .values({
        name: 'New Project',
        description: 'Another project for testing',
        status: 'Active'
      })
      .returning()
      .execute();

    const updateInput: UpdateTaskInput = {
      id: testTaskId,
      project_id: newProjectResult[0].id
    };

    const result = await updateTask(updateInput);

    expect(result.project_id).toEqual(newProjectResult[0].id);
    expect(result.title).toEqual('Original Task');
  });

  it('should persist changes to database', async () => {
    const updateInput: UpdateTaskInput = {
      id: testTaskId,
      title: 'Database Persistence Test',
      status: 'Done'
    };

    await updateTask(updateInput);

    // Verify changes were saved to database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, testTaskId))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Database Persistence Test');
    expect(tasks[0].status).toEqual('Done');
    expect(tasks[0].description).toEqual('Original description');
  });

  it('should throw error when task not found', async () => {
    const updateInput: UpdateTaskInput = {
      id: 99999,
      title: 'Non-existent Task'
    };

    await expect(updateTask(updateInput)).rejects.toThrow(/Task with id 99999 not found/);
  });

  it('should throw error when project_id does not exist', async () => {
    const updateInput: UpdateTaskInput = {
      id: testTaskId,
      project_id: 99999
    };

    await expect(updateTask(updateInput)).rejects.toThrow(/Project with id 99999 not found/);
  });

  it('should throw error when assignee_id does not exist', async () => {
    const updateInput: UpdateTaskInput = {
      id: testTaskId,
      assignee_id: 99999
    };

    await expect(updateTask(updateInput)).rejects.toThrow(/User with id 99999 not found/);
  });

  it('should update description to null', async () => {
    const updateInput: UpdateTaskInput = {
      id: testTaskId,
      description: null
    };

    const result = await updateTask(updateInput);

    expect(result.description).toBeNull();
    expect(result.title).toEqual('Original Task');
  });

  it('should update due_date to null', async () => {
    const updateInput: UpdateTaskInput = {
      id: testTaskId,
      due_date: null
    };

    const result = await updateTask(updateInput);

    expect(result.due_date).toBeNull();
    expect(result.title).toEqual('Original Task');
  });

  it('should handle partial updates correctly', async () => {
    const updateInput: UpdateTaskInput = {
      id: testTaskId,
      priority: 'Low'
    };

    const result = await updateTask(updateInput);

    // Updated field
    expect(result.priority).toEqual('Low');
    
    // Unchanged fields should remain the same
    expect(result.title).toEqual('Original Task');
    expect(result.description).toEqual('Original description');
    expect(result.status).toEqual('To Do');
    expect(result.assignee_id).toEqual(testUserId);
    expect(result.project_id).toEqual(testProjectId);
    expect(result.due_date).toEqual(new Date('2024-12-31'));
  });
});
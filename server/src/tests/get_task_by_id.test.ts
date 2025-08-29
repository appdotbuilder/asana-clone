import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, tasksTable } from '../db/schema';
import { type GetByIdInput } from '../schema';
import { getTaskById } from '../handlers/get_task_by_id';

describe('getTaskById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a task when it exists', async () => {
    // Create prerequisite user and project first
    const userResult = await db.insert(usersTable)
      .values({
        name: 'John Doe',
        email: 'john@example.com'
      })
      .returning()
      .execute();

    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'A test project',
        status: 'Active'
      })
      .returning()
      .execute();

    // Create test task
    const taskResult = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'A test task',
        status: 'To Do',
        priority: 'Medium',
        assignee_id: userResult[0].id,
        project_id: projectResult[0].id,
        due_date: new Date('2024-12-31')
      })
      .returning()
      .execute();

    const input: GetByIdInput = {
      id: taskResult[0].id
    };

    const result = await getTaskById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(taskResult[0].id);
    expect(result!.title).toEqual('Test Task');
    expect(result!.description).toEqual('A test task');
    expect(result!.status).toEqual('To Do');
    expect(result!.priority).toEqual('Medium');
    expect(result!.assignee_id).toEqual(userResult[0].id);
    expect(result!.project_id).toEqual(projectResult[0].id);
    expect(result!.due_date).toEqual(new Date('2024-12-31'));
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when task does not exist', async () => {
    const input: GetByIdInput = {
      id: 999999 // Non-existent ID
    };

    const result = await getTaskById(input);

    expect(result).toBeNull();
  });

  it('should handle task with null fields correctly', async () => {
    // Create prerequisite project (no user needed for this test)
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        status: 'Active'
      })
      .returning()
      .execute();

    // Create task with minimal required fields (null description, assignee, due_date)
    const taskResult = await db.insert(tasksTable)
      .values({
        title: 'Minimal Task',
        status: 'In Progress',
        priority: 'High',
        project_id: projectResult[0].id
        // description, assignee_id, and due_date are omitted (null)
      })
      .returning()
      .execute();

    const input: GetByIdInput = {
      id: taskResult[0].id
    };

    const result = await getTaskById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(taskResult[0].id);
    expect(result!.title).toEqual('Minimal Task');
    expect(result!.description).toBeNull();
    expect(result!.status).toEqual('In Progress');
    expect(result!.priority).toEqual('High');
    expect(result!.assignee_id).toBeNull();
    expect(result!.project_id).toEqual(projectResult[0].id);
    expect(result!.due_date).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should handle different task statuses and priorities', async () => {
    // Create prerequisite project
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Status Test Project',
        status: 'Active'
      })
      .returning()
      .execute();

    // Test different status and priority combinations
    const testCases = [
      { status: 'Done' as const, priority: 'Low' as const },
      { status: 'In Progress' as const, priority: 'High' as const },
      { status: 'To Do' as const, priority: 'Medium' as const }
    ];

    for (const testCase of testCases) {
      const taskResult = await db.insert(tasksTable)
        .values({
          title: `Task with ${testCase.status} status`,
          status: testCase.status,
          priority: testCase.priority,
          project_id: projectResult[0].id
        })
        .returning()
        .execute();

      const input: GetByIdInput = {
        id: taskResult[0].id
      };

      const result = await getTaskById(input);

      expect(result).not.toBeNull();
      expect(result!.status).toEqual(testCase.status);
      expect(result!.priority).toEqual(testCase.priority);
    }
  });
});
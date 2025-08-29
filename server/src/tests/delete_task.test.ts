import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, tasksTable } from '../db/schema';
import { type DeleteInput } from '../schema';
import { deleteTask } from '../handlers/delete_task';
import { eq } from 'drizzle-orm';

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing task', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
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

    const taskResult = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'A test task',
        status: 'To Do',
        priority: 'Medium',
        assignee_id: userResult[0].id,
        project_id: projectResult[0].id
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;
    const input: DeleteInput = { id: taskId };

    // Delete the task
    const result = await deleteTask(input);

    // Verify the result
    expect(result.success).toBe(true);

    // Verify task is deleted from database
    const deletedTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(deletedTask).toHaveLength(0);
  });

  it('should throw an error when task does not exist', async () => {
    const nonExistentId = 99999;
    const input: DeleteInput = { id: nonExistentId };

    // Attempt to delete non-existent task
    await expect(deleteTask(input)).rejects.toThrow(/Task with id 99999 not found/i);
  });

  it('should delete task with null assignee', async () => {
    // Create project without user (task with no assignee)
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'A test project',
        status: 'Active'
      })
      .returning()
      .execute();

    const taskResult = await db.insert(tasksTable)
      .values({
        title: 'Unassigned Task',
        description: 'A task without assignee',
        status: 'To Do',
        priority: 'Low',
        assignee_id: null,
        project_id: projectResult[0].id
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;
    const input: DeleteInput = { id: taskId };

    // Delete the task
    const result = await deleteTask(input);

    // Verify the result
    expect(result.success).toBe(true);

    // Verify task is deleted from database
    const deletedTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(deletedTask).toHaveLength(0);
  });

  it('should delete task with different status values', async () => {
    // Create project
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        status: 'Active'
      })
      .returning()
      .execute();

    // Create task with 'Done' status
    const taskResult = await db.insert(tasksTable)
      .values({
        title: 'Completed Task',
        status: 'Done',
        priority: 'High',
        project_id: projectResult[0].id
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;
    const input: DeleteInput = { id: taskId };

    // Delete the task
    const result = await deleteTask(input);

    // Verify the result
    expect(result.success).toBe(true);

    // Verify task is deleted from database
    const deletedTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(deletedTask).toHaveLength(0);
  });

  it('should handle multiple delete attempts on same task', async () => {
    // Create project
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        status: 'Active'
      })
      .returning()
      .execute();

    // Create task
    const taskResult = await db.insert(tasksTable)
      .values({
        title: 'Task to Delete Twice',
        status: 'In Progress',
        priority: 'Medium',
        project_id: projectResult[0].id
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;
    const input: DeleteInput = { id: taskId };

    // First deletion should succeed
    const firstResult = await deleteTask(input);
    expect(firstResult.success).toBe(true);

    // Second deletion should fail
    await expect(deleteTask(input)).rejects.toThrow(/Task with id \d+ not found/i);
  });
});
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, projectsTable } from '../db/schema';
import { type DeleteInput } from '../schema';
import { deleteUser } from '../handlers/delete_user';
import { eq } from 'drizzle-orm';

describe('deleteUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a user successfully', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const input: DeleteInput = { id: userId };

    // Delete the user
    const result = await deleteUser(input);

    expect(result.success).toBe(true);

    // Verify user is deleted
    const deletedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(deletedUser).toHaveLength(0);
  });

  it('should throw error when user does not exist', async () => {
    const input: DeleteInput = { id: 999 };

    await expect(deleteUser(input)).rejects.toThrow(/User with id 999 not found/i);
  });

  it('should unassign tasks when deleting user with assigned tasks', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test project
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'Test project description',
        status: 'Active'
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Create tasks assigned to the user
    const taskResult = await db.insert(tasksTable)
      .values([
        {
          title: 'Task 1',
          description: 'First task',
          status: 'To Do',
          priority: 'Medium',
          assignee_id: userId,
          project_id: projectId
        },
        {
          title: 'Task 2',
          description: 'Second task',
          status: 'In Progress',
          priority: 'High',
          assignee_id: userId,
          project_id: projectId
        }
      ])
      .returning()
      .execute();

    const input: DeleteInput = { id: userId };

    // Delete the user
    const result = await deleteUser(input);

    expect(result.success).toBe(true);

    // Verify user is deleted
    const deletedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(deletedUser).toHaveLength(0);

    // Verify tasks are unassigned (assignee_id set to null)
    const unassignedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.project_id, projectId))
      .execute();

    expect(unassignedTasks).toHaveLength(2);
    expect(unassignedTasks[0].assignee_id).toBeNull();
    expect(unassignedTasks[1].assignee_id).toBeNull();
    expect(unassignedTasks[0].title).toEqual('Task 1');
    expect(unassignedTasks[1].title).toEqual('Task 2');
  });

  it('should handle deletion of user with no assigned tasks', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create project and task NOT assigned to this user
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'Test project description',
        status: 'Active'
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    await db.insert(tasksTable)
      .values({
        title: 'Unassigned Task',
        description: 'Task without assignee',
        status: 'To Do',
        priority: 'Low',
        assignee_id: null, // Not assigned to our test user
        project_id: projectId
      })
      .execute();

    const input: DeleteInput = { id: userId };

    // Delete the user
    const result = await deleteUser(input);

    expect(result.success).toBe(true);

    // Verify user is deleted
    const deletedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(deletedUser).toHaveLength(0);

    // Verify unrelated task remains unchanged
    const remainingTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.project_id, projectId))
      .execute();

    expect(remainingTasks).toHaveLength(1);
    expect(remainingTasks[0].assignee_id).toBeNull();
    expect(remainingTasks[0].title).toEqual('Unassigned Task');
  });

  it('should handle deletion with multiple users and selective task unassignment', async () => {
    // Create two test users
    const userResults = await db.insert(usersTable)
      .values([
        {
          name: 'User 1',
          email: 'user1@example.com'
        },
        {
          name: 'User 2',
          email: 'user2@example.com'
        }
      ])
      .returning()
      .execute();

    const user1Id = userResults[0].id;
    const user2Id = userResults[1].id;

    // Create test project
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'Test project description',
        status: 'Active'
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Create tasks assigned to both users
    await db.insert(tasksTable)
      .values([
        {
          title: 'User 1 Task',
          description: 'Task for user 1',
          status: 'To Do',
          priority: 'Medium',
          assignee_id: user1Id,
          project_id: projectId
        },
        {
          title: 'User 2 Task',
          description: 'Task for user 2',
          status: 'In Progress',
          priority: 'High',
          assignee_id: user2Id,
          project_id: projectId
        }
      ])
      .execute();

    const input: DeleteInput = { id: user1Id };

    // Delete user 1
    const result = await deleteUser(input);

    expect(result.success).toBe(true);

    // Verify user 1 is deleted but user 2 remains
    const remainingUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(remainingUsers).toHaveLength(1);
    expect(remainingUsers[0].id).toEqual(user2Id);

    // Verify only user 1's task was unassigned
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.project_id, projectId))
      .execute();

    expect(tasks).toHaveLength(2);

    const user1Task = tasks.find(task => task.title === 'User 1 Task');
    const user2Task = tasks.find(task => task.title === 'User 2 Task');

    expect(user1Task?.assignee_id).toBeNull(); // Should be unassigned
    expect(user2Task?.assignee_id).toEqual(user2Id); // Should remain assigned
  });
});
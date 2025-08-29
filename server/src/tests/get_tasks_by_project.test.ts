import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, tasksTable } from '../db/schema';
import { type GetTasksByProjectInput, type CreateUserInput, type CreateProjectInput, type CreateTaskInput } from '../schema';
import { getTasksByProject } from '../handlers/get_tasks_by_project';

describe('getTasksByProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when project has no tasks', async () => {
    // Create a project
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Empty Project',
        description: 'Project with no tasks',
        status: 'Active'
      })
      .returning()
      .execute();

    const input: GetTasksByProjectInput = {
      project_id: projectResult[0].id
    };

    const result = await getTasksByProject(input);

    expect(result).toEqual([]);
  });

  it('should return all tasks for a project', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'John Doe',
        email: 'john@example.com'
      })
      .returning()
      .execute();

    // Create a project
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'Project for testing',
        status: 'Active',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31')
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;
    const userId = userResult[0].id;

    // Create multiple tasks for the project
    const task1Result = await db.insert(tasksTable)
      .values({
        title: 'Task 1',
        description: 'First task',
        due_date: new Date('2024-02-15'),
        status: 'To Do',
        priority: 'High',
        assignee_id: userId,
        project_id: projectId
      })
      .returning()
      .execute();

    const task2Result = await db.insert(tasksTable)
      .values({
        title: 'Task 2',
        description: 'Second task',
        due_date: new Date('2024-03-01'),
        status: 'In Progress',
        priority: 'Medium',
        assignee_id: userId,
        project_id: projectId
      })
      .returning()
      .execute();

    const task3Result = await db.insert(tasksTable)
      .values({
        title: 'Task 3',
        description: null, // Test nullable field
        due_date: null, // Test nullable field
        status: 'Done',
        priority: 'Low',
        assignee_id: null, // Test nullable field
        project_id: projectId
      })
      .returning()
      .execute();

    const input: GetTasksByProjectInput = {
      project_id: projectId
    };

    const result = await getTasksByProject(input);

    expect(result).toHaveLength(3);

    // Sort by id to ensure consistent order
    const sortedResult = result.sort((a, b) => a.id - b.id);

    // Validate first task
    expect(sortedResult[0].title).toEqual('Task 1');
    expect(sortedResult[0].description).toEqual('First task');
    expect(sortedResult[0].due_date).toBeInstanceOf(Date);
    expect(sortedResult[0].status).toEqual('To Do');
    expect(sortedResult[0].priority).toEqual('High');
    expect(sortedResult[0].assignee_id).toEqual(userId);
    expect(sortedResult[0].project_id).toEqual(projectId);
    expect(sortedResult[0].created_at).toBeInstanceOf(Date);

    // Validate second task
    expect(sortedResult[1].title).toEqual('Task 2');
    expect(sortedResult[1].description).toEqual('Second task');
    expect(sortedResult[1].due_date).toBeInstanceOf(Date);
    expect(sortedResult[1].status).toEqual('In Progress');
    expect(sortedResult[1].priority).toEqual('Medium');
    expect(sortedResult[1].assignee_id).toEqual(userId);
    expect(sortedResult[1].project_id).toEqual(projectId);

    // Validate third task (with nullable fields)
    expect(sortedResult[2].title).toEqual('Task 3');
    expect(sortedResult[2].description).toBeNull();
    expect(sortedResult[2].due_date).toBeNull();
    expect(sortedResult[2].status).toEqual('Done');
    expect(sortedResult[2].priority).toEqual('Low');
    expect(sortedResult[2].assignee_id).toBeNull();
    expect(sortedResult[2].project_id).toEqual(projectId);
  });

  it('should only return tasks for the specified project', async () => {
    // Create two projects
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
        status: 'Active'
      })
      .returning()
      .execute();

    const project1Id = project1Result[0].id;
    const project2Id = project2Result[0].id;

    // Create tasks for project 1
    await db.insert(tasksTable)
      .values([
        {
          title: 'Project 1 Task 1',
          description: 'Task for project 1',
          status: 'To Do',
          priority: 'Medium',
          project_id: project1Id
        },
        {
          title: 'Project 1 Task 2',
          description: 'Another task for project 1',
          status: 'In Progress',
          priority: 'High',
          project_id: project1Id
        }
      ])
      .execute();

    // Create task for project 2
    await db.insert(tasksTable)
      .values({
        title: 'Project 2 Task 1',
        description: 'Task for project 2',
        status: 'Done',
        priority: 'Low',
        project_id: project2Id
      })
      .execute();

    const input: GetTasksByProjectInput = {
      project_id: project1Id
    };

    const result = await getTasksByProject(input);

    expect(result).toHaveLength(2);
    
    // All returned tasks should belong to project 1
    result.forEach(task => {
      expect(task.project_id).toEqual(project1Id);
    });

    // Verify task titles to ensure we got the right tasks
    const taskTitles = result.map(task => task.title).sort();
    expect(taskTitles).toEqual(['Project 1 Task 1', 'Project 1 Task 2']);
  });

  it('should throw error when project does not exist', async () => {
    const input: GetTasksByProjectInput = {
      project_id: 999999 // Non-existent project ID
    };

    await expect(getTasksByProject(input)).rejects.toThrow(/project with id 999999 not found/i);
  });

  it('should handle tasks with different status and priority combinations', async () => {
    // Create a project
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Status Test Project',
        description: 'Testing different statuses and priorities',
        status: 'Active'
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Create tasks with all possible status and priority combinations
    const taskData = [
      { title: 'Todo High', status: 'To Do' as const, priority: 'High' as const },
      { title: 'Todo Medium', status: 'To Do' as const, priority: 'Medium' as const },
      { title: 'Todo Low', status: 'To Do' as const, priority: 'Low' as const },
      { title: 'In Progress High', status: 'In Progress' as const, priority: 'High' as const },
      { title: 'In Progress Medium', status: 'In Progress' as const, priority: 'Medium' as const },
      { title: 'In Progress Low', status: 'In Progress' as const, priority: 'Low' as const },
      { title: 'Done High', status: 'Done' as const, priority: 'High' as const },
      { title: 'Done Medium', status: 'Done' as const, priority: 'Medium' as const },
      { title: 'Done Low', status: 'Done' as const, priority: 'Low' as const }
    ];

    for (const task of taskData) {
      await db.insert(tasksTable)
        .values({
          ...task,
          description: `Task with ${task.status} status and ${task.priority} priority`,
          project_id: projectId
        })
        .execute();
    }

    const input: GetTasksByProjectInput = {
      project_id: projectId
    };

    const result = await getTasksByProject(input);

    expect(result).toHaveLength(9);

    // Verify all status types are present
    const statuses = [...new Set(result.map(task => task.status))];
    expect(statuses.sort()).toEqual(['Done', 'In Progress', 'To Do']);

    // Verify all priority types are present
    const priorities = [...new Set(result.map(task => task.priority))];
    expect(priorities.sort()).toEqual(['High', 'Low', 'Medium']);

    // Verify each task has the expected format
    result.forEach(task => {
      expect(task.id).toBeDefined();
      expect(typeof task.title).toBe('string');
      expect(typeof task.description).toBe('string');
      expect(task.created_at).toBeInstanceOf(Date);
      expect(['To Do', 'In Progress', 'Done']).toContain(task.status);
      expect(['Low', 'Medium', 'High']).toContain(task.priority);
      expect(task.project_id).toEqual(projectId);
    });
  });
});
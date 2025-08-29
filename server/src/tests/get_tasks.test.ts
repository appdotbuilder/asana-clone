import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, projectsTable, tasksTable } from '../db/schema';
import { getTasks } from '../handlers/get_tasks';

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tasks exist', async () => {
    const result = await getTasks();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all tasks from database', async () => {
    // Create prerequisite data first
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'A test project',
        status: 'Active'
      })
      .returning()
      .execute();
    const projectId = projectResult[0].id;

    // Create test tasks
    const task1 = {
      title: 'First Task',
      description: 'First task description',
      status: 'To Do' as const,
      priority: 'High' as const,
      assignee_id: userId,
      project_id: projectId,
      due_date: new Date('2024-12-31')
    };

    const task2 = {
      title: 'Second Task',
      description: null,
      status: 'In Progress' as const,
      priority: 'Medium' as const,
      assignee_id: null,
      project_id: projectId,
      due_date: null
    };

    await db.insert(tasksTable)
      .values([task1, task2])
      .execute();

    const result = await getTasks();

    expect(result).toHaveLength(2);
    
    // Check first task
    const firstTask = result.find(t => t.title === 'First Task');
    expect(firstTask).toBeDefined();
    expect(firstTask!.title).toEqual('First Task');
    expect(firstTask!.description).toEqual('First task description');
    expect(firstTask!.status).toEqual('To Do');
    expect(firstTask!.priority).toEqual('High');
    expect(firstTask!.assignee_id).toEqual(userId);
    expect(firstTask!.project_id).toEqual(projectId);
    expect(firstTask!.due_date).toBeInstanceOf(Date);
    expect(firstTask!.created_at).toBeInstanceOf(Date);
    expect(firstTask!.id).toBeDefined();

    // Check second task
    const secondTask = result.find(t => t.title === 'Second Task');
    expect(secondTask).toBeDefined();
    expect(secondTask!.title).toEqual('Second Task');
    expect(secondTask!.description).toBeNull();
    expect(secondTask!.status).toEqual('In Progress');
    expect(secondTask!.priority).toEqual('Medium');
    expect(secondTask!.assignee_id).toBeNull();
    expect(secondTask!.project_id).toEqual(projectId);
    expect(secondTask!.due_date).toBeNull();
    expect(secondTask!.created_at).toBeInstanceOf(Date);
    expect(secondTask!.id).toBeDefined();
  });

  it('should return tasks with different statuses and priorities', async () => {
    // Create prerequisite data
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        status: 'Active'
      })
      .returning()
      .execute();
    const projectId = projectResult[0].id;

    // Create tasks with different statuses and priorities
    const tasks = [
      {
        title: 'Low Priority Todo',
        status: 'To Do' as const,
        priority: 'Low' as const,
        project_id: projectId
      },
      {
        title: 'Medium Priority In Progress',
        status: 'In Progress' as const,
        priority: 'Medium' as const,
        project_id: projectId
      },
      {
        title: 'High Priority Done',
        status: 'Done' as const,
        priority: 'High' as const,
        project_id: projectId
      }
    ];

    await db.insert(tasksTable)
      .values(tasks)
      .execute();

    const result = await getTasks();

    expect(result).toHaveLength(3);
    
    // Verify all different statuses and priorities are present
    const statuses = result.map(t => t.status);
    const priorities = result.map(t => t.priority);
    
    expect(statuses).toContain('To Do');
    expect(statuses).toContain('In Progress');
    expect(statuses).toContain('Done');
    
    expect(priorities).toContain('Low');
    expect(priorities).toContain('Medium');
    expect(priorities).toContain('High');
  });

  it('should return tasks with proper date formatting', async () => {
    // Create prerequisite data
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        status: 'Active'
      })
      .returning()
      .execute();
    const projectId = projectResult[0].id;

    // Create task with specific date
    const specificDate = new Date('2024-06-15T10:30:00Z');
    await db.insert(tasksTable)
      .values({
        title: 'Date Test Task',
        status: 'To Do',
        priority: 'Medium',
        project_id: projectId,
        due_date: specificDate
      })
      .execute();

    const result = await getTasks();

    expect(result).toHaveLength(1);
    expect(result[0].due_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    
    // The due_date should be the date we set
    expect(result[0].due_date!.getTime()).toEqual(specificDate.getTime());
  });

  it('should handle tasks from multiple projects', async () => {
    // Create multiple projects
    const project1Result = await db.insert(projectsTable)
      .values({
        name: 'Project 1',
        status: 'Active'
      })
      .returning()
      .execute();
    const project1Id = project1Result[0].id;

    const project2Result = await db.insert(projectsTable)
      .values({
        name: 'Project 2', 
        status: 'On Hold'
      })
      .returning()
      .execute();
    const project2Id = project2Result[0].id;

    // Create tasks for different projects
    await db.insert(tasksTable)
      .values([
        {
          title: 'Task from Project 1',
          status: 'To Do',
          priority: 'High',
          project_id: project1Id
        },
        {
          title: 'Task from Project 2',
          status: 'Done',
          priority: 'Low',
          project_id: project2Id
        }
      ])
      .execute();

    const result = await getTasks();

    expect(result).toHaveLength(2);
    
    const project1Tasks = result.filter(t => t.project_id === project1Id);
    const project2Tasks = result.filter(t => t.project_id === project2Id);
    
    expect(project1Tasks).toHaveLength(1);
    expect(project2Tasks).toHaveLength(1);
    
    expect(project1Tasks[0].title).toEqual('Task from Project 1');
    expect(project2Tasks[0].title).toEqual('Task from Project 2');
  });
});
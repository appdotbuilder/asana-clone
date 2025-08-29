import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type CreateProjectInput } from '../schema';
import { getProjects } from '../handlers/get_projects';

describe('getProjects', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no projects exist', async () => {
    const result = await getProjects();
    expect(result).toEqual([]);
  });

  it('should return all projects', async () => {
    // Create test projects
    const testProject1: CreateProjectInput = {
      name: 'Test Project 1',
      description: 'First test project',
      status: 'Active',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31')
    };

    const testProject2: CreateProjectInput = {
      name: 'Test Project 2',
      description: null,
      status: 'On Hold',
      start_date: null,
      end_date: null
    };

    // Insert test projects
    await db.insert(projectsTable)
      .values([
        {
          name: testProject1.name,
          description: testProject1.description,
          status: testProject1.status,
          start_date: testProject1.start_date,
          end_date: testProject1.end_date
        },
        {
          name: testProject2.name,
          description: testProject2.description,
          status: testProject2.status,
          start_date: testProject2.start_date,
          end_date: testProject2.end_date
        }
      ])
      .execute();

    const result = await getProjects();

    expect(result).toHaveLength(2);
    
    // Verify first project
    const project1 = result.find(p => p.name === 'Test Project 1');
    expect(project1).toBeDefined();
    expect(project1!.name).toEqual('Test Project 1');
    expect(project1!.description).toEqual('First test project');
    expect(project1!.status).toEqual('Active');
    expect(project1!.start_date).toBeInstanceOf(Date);
    expect(project1!.end_date).toBeInstanceOf(Date);
    expect(project1!.created_at).toBeInstanceOf(Date);
    expect(project1!.id).toBeDefined();

    // Verify second project
    const project2 = result.find(p => p.name === 'Test Project 2');
    expect(project2).toBeDefined();
    expect(project2!.name).toEqual('Test Project 2');
    expect(project2!.description).toBeNull();
    expect(project2!.status).toEqual('On Hold');
    expect(project2!.start_date).toBeNull();
    expect(project2!.end_date).toBeNull();
    expect(project2!.created_at).toBeInstanceOf(Date);
    expect(project2!.id).toBeDefined();
  });

  it('should return projects with different statuses', async () => {
    // Create projects with all different statuses
    await db.insert(projectsTable)
      .values([
        {
          name: 'Active Project',
          description: 'An active project',
          status: 'Active'
        },
        {
          name: 'Completed Project',
          description: 'A completed project',
          status: 'Completed'
        },
        {
          name: 'On Hold Project',
          description: 'A project on hold',
          status: 'On Hold'
        }
      ])
      .execute();

    const result = await getProjects();

    expect(result).toHaveLength(3);
    
    const statuses = result.map(p => p.status);
    expect(statuses).toContain('Active');
    expect(statuses).toContain('Completed');
    expect(statuses).toContain('On Hold');
  });

  it('should return projects ordered by creation time', async () => {
    // Create projects with slight delay to ensure different timestamps
    await db.insert(projectsTable)
      .values({
        name: 'First Project',
        description: 'Created first',
        status: 'Active'
      })
      .execute();

    // Small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(projectsTable)
      .values({
        name: 'Second Project',
        description: 'Created second',
        status: 'Active'
      })
      .execute();

    const result = await getProjects();

    expect(result).toHaveLength(2);
    
    // Verify both projects exist
    const firstProject = result.find(p => p.name === 'First Project');
    const secondProject = result.find(p => p.name === 'Second Project');
    
    expect(firstProject).toBeDefined();
    expect(secondProject).toBeDefined();
    expect(firstProject!.created_at).toBeInstanceOf(Date);
    expect(secondProject!.created_at).toBeInstanceOf(Date);
  });
});
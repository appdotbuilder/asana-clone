import { z } from 'zod';

// Enums for status and priority fields
export const projectStatusSchema = z.enum(['Active', 'On Hold', 'Completed']);
export const taskStatusSchema = z.enum(['To Do', 'In Progress', 'Done']);
export const taskPrioritySchema = z.enum(['Low', 'Medium', 'High']);

export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for creating users
export const createUserInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required")
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for updating users
export const updateUserInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Valid email is required").optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Project schema
export const projectSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  status: projectStatusSchema,
  start_date: z.coerce.date().nullable(),
  end_date: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type Project = z.infer<typeof projectSchema>;

// Input schema for creating projects
export const createProjectInputSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().nullable().optional(),
  status: projectStatusSchema,
  start_date: z.coerce.date().nullable().optional(),
  end_date: z.coerce.date().nullable().optional()
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

// Input schema for updating projects
export const updateProjectInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Project name is required").optional(),
  description: z.string().nullable().optional(),
  status: projectStatusSchema.optional(),
  start_date: z.coerce.date().nullable().optional(),
  end_date: z.coerce.date().nullable().optional()
});

export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;

// Task schema
export const taskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  due_date: z.coerce.date().nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  assignee_id: z.number().nullable(),
  project_id: z.number(),
  created_at: z.coerce.date()
});

export type Task = z.infer<typeof taskSchema>;

// Input schema for creating tasks
export const createTaskInputSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().nullable().optional(),
  due_date: z.coerce.date().nullable().optional(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  assignee_id: z.number().nullable().optional(),
  project_id: z.number()
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

// Input schema for updating tasks
export const updateTaskInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Task title is required").optional(),
  description: z.string().nullable().optional(),
  due_date: z.coerce.date().nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assignee_id: z.number().nullable().optional(),
  project_id: z.number().optional()
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

// Delete input schemas
export const deleteInputSchema = z.object({
  id: z.number()
});

export type DeleteInput = z.infer<typeof deleteInputSchema>;

// Get by ID input schema
export const getByIdInputSchema = z.object({
  id: z.number()
});

export type GetByIdInput = z.infer<typeof getByIdInputSchema>;

// Get tasks by project ID schema
export const getTasksByProjectInputSchema = z.object({
  project_id: z.number()
});

export type GetTasksByProjectInput = z.infer<typeof getTasksByProjectInputSchema>;
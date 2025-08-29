import { serial, text, pgTable, timestamp, pgEnum, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums for PostgreSQL
export const projectStatusEnum = pgEnum('project_status', ['Active', 'On Hold', 'Completed']);
export const taskStatusEnum = pgEnum('task_status', ['To Do', 'In Progress', 'Done']);
export const taskPriorityEnum = pgEnum('task_priority', ['Low', 'Medium', 'High']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Projects table
export const projectsTable = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable by default
  status: projectStatusEnum('status').notNull(),
  start_date: timestamp('start_date'), // Nullable by default
  end_date: timestamp('end_date'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Tasks table
export const tasksTable = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'), // Nullable by default
  due_date: timestamp('due_date'), // Nullable by default
  status: taskStatusEnum('status').notNull(),
  priority: taskPriorityEnum('priority').notNull(),
  assignee_id: integer('assignee_id').references(() => usersTable.id),
  project_id: integer('project_id').notNull().references(() => projectsTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  assignedTasks: many(tasksTable),
}));

export const projectsRelations = relations(projectsTable, ({ many }) => ({
  tasks: many(tasksTable),
}));

export const tasksRelations = relations(tasksTable, ({ one }) => ({
  project: one(projectsTable, {
    fields: [tasksTable.project_id],
    references: [projectsTable.id],
  }),
  assignee: one(usersTable, {
    fields: [tasksTable.assignee_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Project = typeof projectsTable.$inferSelect;
export type NewProject = typeof projectsTable.$inferInsert;

export type Task = typeof tasksTable.$inferSelect;
export type NewTask = typeof tasksTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  projects: projectsTable, 
  tasks: tasksTable 
};

export const tableRelations = {
  usersRelations,
  projectsRelations,
  tasksRelations
};
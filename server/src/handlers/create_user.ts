import { type CreateUserInput, type User } from '../schema';

export async function createUser(input: CreateUserInput): Promise<User> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new user and persisting it in the database.
    // It should validate that the email is unique before creating the user.
    return Promise.resolve({
        id: 0, // Placeholder ID
        name: input.name,
        email: input.email,
        created_at: new Date() // Placeholder date
    } as User);
}
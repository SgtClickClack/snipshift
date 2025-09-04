import { type User, type InsertUser, type Shift, type InsertShift, type UserRole } from "@shared/firebase-schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  createShift(shift: InsertShift): Promise<Shift>;
  getShifts(): Promise<Shift[]>;
  getShiftsByShopId(shopId: string): Promise<Shift[]>;
  getShift(id: string): Promise<Shift | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private shifts: Map<string, Shift>;

  constructor() {
    this.users = new Map();
    this.shifts = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const roles: UserRole[] = Array.isArray((insertUser as any).roles) ? (insertUser as any).roles as UserRole[] : [];
    const currentRole: UserRole | null = (insertUser as any).currentRole ?? (roles.length ? roles[0] : null);
    const user: User = { 
      ...(insertUser as any), 
      id,
      provider: (insertUser as any).provider || "email",
      roles,
      currentRole,
      createdAt: now,
      updatedAt: now
    } as User;
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    const updatedUser = { 
      ...user, 
      ...updates, 
      id, // Ensure ID doesn't change
      updatedAt: new Date() 
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createShift(insertShift: InsertShift): Promise<Shift> {
    const id = randomUUID();
    const shift: Shift = { ...insertShift, id };
    this.shifts.set(id, shift);
    return shift;
  }

  async getShifts(): Promise<Shift[]> {
    return Array.from(this.shifts.values());
  }

  async getShiftsByShopId(shopId: string): Promise<Shift[]> {
    return Array.from(this.shifts.values()).filter(
      (shift) => shift.hubId === shopId,
    );
  }

  async getShift(id: string): Promise<Shift | undefined> {
    return this.shifts.get(id);
  }
}

export const storage = new MemStorage();

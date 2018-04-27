"use strict";

export default interface IUser {
  id: number; // User ID
  username: string; // Username
  group: string[]; // User Groups
  password: string; // Hashed password
  salt: string; // Password salt
}

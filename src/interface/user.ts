"use strict";

export default interface IUser {
  username: string; // Username
  group: string[]; // User Groups
  password: string; // Hashed password
  salt: string; // Password salt
}

"use strict";

export default interface IUser {
    uuid: string; // UUIDv4 unique identifier
    username: string; // Username
    group: string[]; // User Groups
    password: string; // Hashed password
    salt: string; // Password salt
}

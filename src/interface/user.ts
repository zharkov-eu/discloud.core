"use strict";

export default interface IUser {
  id: number; // ID пользователя
  username: string; // Username
  group: number[]; // Группы пользователя
  password: string; // Хэшированный пароль
  salt: string; // Соль пароля
}

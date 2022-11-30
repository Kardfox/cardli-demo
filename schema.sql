DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS tokens;

CREATE TABLE `users` (
  `id` TEXT NOT NULL,
  `name` TEXT  NOT NULL,
  `surname` TEXT NOT NULL,
  `family_id` TEXT DEFAULT NULL,
  `email` TEXT NOT NULL,
  `password` TEXT NOT NULL,
   UNIQUE(`id`, `email`)
);


CREATE TABLE `cards` (
  `name` TEXT NOT NULL,
  `color` TEXT NOT NULL,
  `family_id` TEXT DEFAULT NULL,
  `barcode` TEXT NOT NULL,
  `id` TEXT NOT NULL,
  `image` TEXT NOT NULL,
  `type` TEXT NOT NULL,
  `user_id` TEXT NOT NULL,
  UNIQUE(`id`)
);

CREATE TABLE `tokens` (
  `token` TEXT NOT NULL,
  `user_id` TEXT NOT NULL,
  UNIQUE(`token`)
);

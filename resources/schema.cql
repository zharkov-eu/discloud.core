CREATE KEYSPACE IF NOT EXISTS discloud WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'}  AND durable_writes = true;
CREATE TABLE IF NOT EXISTS discloud.node (
    uid uuid,
    ipv4 inet,
    role text,
    zone text,
    PRIMARY KEY (uid, zone)
);
CREATE TABLE IF NOT EXISTS discloud.counters (
    type text PRIMARY KEY,
    counter_value counter
);
CREATE TABLE IF NOT EXISTS discloud.group (
    id int PRIMARY KEY,
    name text,
    system boolean
);
CREATE INDEX IF NOT EXISTS group_by_name ON discloud.group (name);
CREATE TABLE IF NOT EXISTS discloud.user (
    id int PRIMARY KEY,
    username text,
    group set<text>,
    password text,
    salt text
);
CREATE INDEX IF NOT EXISTS user_by_username ON discloud.user (username);
CREATE TABLE IF NOT EXISTS discloud.entry (
    uuid uuid,
    user int,
    name text,
    type text,
    parent uuid,
    child set<uuid>,
    path text,
    owner int,
    group int,
    permission text,
    created timestamp,
    last_modify timestamp,
    share text,
    location set<text>,
    location_path text,
    PRIMARY KEY (uuid, user)
);

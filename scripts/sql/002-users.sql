create type authentificator as enum('database', 'keycloak', 'auth0');

create table if not exists users(
       id               integer primary key generated by default as identity,
       login            text unique,
       password         text,
       token            text default '',
       profiles         text[],
       create_source    boolean default false,
       maximum_source   integer default 5,
       auth             authentificator
);

-- Add a view to retrieve the list of users without the private data
create view public_users_list as
       select id, login, create_source, maximum_source, auth, profiles
       from users;

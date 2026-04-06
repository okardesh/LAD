-- Database Sequences
CREATE SEQUENCE IF NOT EXISTS SEQ_APP_ORGANIZATIONS START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS SEQ_APP_ROLES START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS SEQ_APP_SUBSIDIARY START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS SEQ_APP_USERS START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS SEQ_APP_USER_ROLES START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS SEQ_APP_TABLES START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS SEQ_APP_OPERATIONS START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS SEQ_APP_ROLE_OPERATIONS START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS SEQ_APP_COLUMNS START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS SEQ_APP_PARAMETERS START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS SEQ_APP_API_LOGS START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS SEQ_APP_HISTORY START WITH 1000;

-- Create a default organization
INSERT INTO app_organizations (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, code, name)
VALUES (1, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 1, 1, random_uuid(), 'ORG001', 'Default Organization');

INSERT INTO app_organizations (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, code, name)
VALUES (2, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 0, 1, random_uuid(), 'ORG000', 'Zero Organization');

-- Create a superuser role
INSERT INTO app_roles (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, code, description, subsidiary_view)
VALUES (1, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 1, 1, random_uuid(), 'ADMIN', 'System Administrator', 1);

-- Create a subsidiary (Approved status: 'A')
INSERT INTO app_subsidiary (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, code, name, approval_status)
VALUES (1, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 1, 1, random_uuid(), 'SUB001', 'Main Subsidiary', 'A');

-- Create an admin user (password: admin)
INSERT INTO app_users (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, email, name, surname, username, password, user_type, subsidiary_id)
VALUES (1, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 1, 1, random_uuid(), 'admin1@example.com', 'System', 'Admin', 'admin', 'c7ad44cbad762a5da0a452f9e854fdc1e0e7a52a38015f23f3eab1d80b931dd472634dfac71cd34ebc35d16ab7fb8a90c81f975113d6c7538dc69dd8de9077ec', 1, 1);

-- Link user to role
INSERT INTO app_user_roles (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, role_id, user_id)
VALUES (1, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 1, 1, random_uuid(), 1, 1);

INSERT INTO app_user_roles (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, role_id, user_id)
VALUES (2, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 0, 1, random_uuid(), 1, 2);

UPDATE app_users SET password = '$2b$10$UqLGjNunxkvKzeBpcBdIGeNFvVj2afinwLOHdiqPSuG2u58XkRA8y' WHERE username = 'admin';

ALTER TABLE app_api_logs ALTER COLUMN response_exception CLOB;
INSERT INTO app_tables (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, name) VALUES (150, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 0, 1, random_uuid(), 'APP_SUBSIDIARY');
INSERT INTO app_operations (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, method, path, table_id) VALUES (150, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 0, 1, random_uuid(), 'POST', '/v1/subsidiary', 150);

INSERT INTO app_tables (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, name) VALUES (160, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 0, 1, random_uuid(), 'APP_USERS');
INSERT INTO app_operations (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, method, path, table_id) VALUES (160, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 0, 1, random_uuid(), 'GET', '/v1/users', 160);
INSERT INTO app_operations (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, method, path, table_id) VALUES (161, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 0, 1, random_uuid(), 'POST', '/v1/users', 161);
INSERT INTO app_operations (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, method, path, table_id) VALUES (162, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 0, 1, random_uuid(), 'PUT', '/v1/users/{uuid}', 162);
INSERT INTO app_operations (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, method, path, table_id) VALUES (163, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 0, 1, random_uuid(), 'GET', '/v1/users/{uuid}', 163);

-- Link Admin Role (ID 1) to these Operations
INSERT INTO app_role_operations (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, operation_id, role_id) VALUES (160, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 0, 1, random_uuid(), 160, 1);
INSERT INTO app_role_operations (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, operation_id, role_id) VALUES (161, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 0, 1, random_uuid(), 161, 1);
INSERT INTO app_role_operations (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, operation_id, role_id) VALUES (162, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 0, 1, random_uuid(), 162, 1);
INSERT INTO app_role_operations (id, created_by, created_time, last_updated_by, last_updated_time, luc, organization_id, status, uuid, operation_id, role_id) VALUES (163, 1, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP, 0, 0, 1, random_uuid(), 163, 1);

-- One-time schema widening for the customer H2 database.
-- Run once against C:\LAD\smartaggregator\smartaggregator-db while the backend is STOPPED.
--
--   cd C:\LAD\smartaggregator
--   java -cp lib\h2-1.4.200.jar org.h2.tools.RunScript ^
--     -url "jdbc:h2:file:./smartaggregator-db" -user sa -script schema-upgrade.sql
--
-- Safe to re-run.

ALTER TABLE RPAD_JOBS    ALTER COLUMN SOURCE_TYPE       VARCHAR(100);
ALTER TABLE RPAD_JOBS    ALTER COLUMN HOST_MACHINE_NAME VARCHAR(255);
ALTER TABLE RPAD_JOBS    ALTER COLUMN JOB_PRIORITY      VARCHAR(50);
ALTER TABLE RPAD_JOBS    ALTER COLUMN STATE             VARCHAR(50);
ALTER TABLE RPAD_JOBS    ALTER COLUMN RELEASE_NAME      VARCHAR(500);
ALTER TABLE RPAD_HISTORY ALTER COLUMN ROBOTS            VARCHAR(4000);

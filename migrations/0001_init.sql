-- Migration number: 0001 	 2026-09-07T13:06:16.308Z
CREATE TABLE backup_state (
    channel_id TEXT PRIMARY KEY,
    last_message_id TEXT
);

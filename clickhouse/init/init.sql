CREATE DATABASE IF NOT EXISTS call_management;

CREATE TABLE IF NOT EXISTS call_management.call_logs
(
    `call_sid` String,
    `from_number` String,
    `to_number` String DEFAULT '',
    `status` String DEFAULT '',
    `duration` Int32 DEFAULT 0,
    `start_time` Nullable(DateTime),
    `end_time` Nullable(DateTime),
    `notes` String DEFAULT '',
    `user_id` String DEFAULT '',
    `created_at` DateTime DEFAULT now(),
    `direction` String DEFAULT ''
)
ENGINE = ReplacingMergeTree(created_at)
ORDER BY call_sid;


CREATE TABLE IF NOT EXISTS call_management.debug_info
(
    `callSid` String,
    `date_created` Nullable(DateTime),
    `direction` String,
    `price` Float32,
    `price_unit` String,
    `recordings` String,
    `child_calls` String
)
ENGINE = MergeTree
ORDER BY callSid;

CREATE TABLE IF NOT EXISTS call_management.event_logs
(
    `event_id` UUID DEFAULT generateUUIDv4(),
    `call_sid` String,
    `url` String,
    `request` String,
    `response` String,
    `created_at` DateTime DEFAULT now(),
    `response_code` String,
    `timestamp` String
)
ENGINE = MergeTree
ORDER BY created_at;

CREATE TABLE IF NOT EXISTS call_management.twilio_event_logs
(
    `event_id` UUID DEFAULT generateUUIDv4(),
    `call_sid` String,
    `url` String,
    `event_data` String,
    `event_response` String,
    `created_at` DateTime DEFAULT now()
)
ENGINE = MergeTree
ORDER BY (created_at, call_sid);

CREATE TABLE IF NOT EXISTS call_management.users
(
    `user_id` UUID DEFAULT generateUUIDv4(),
    `username` String,
    `password` String,
    `created_at` DateTime DEFAULT now()
)
ENGINE = MergeTree
ORDER BY user_id;


INSERT INTO call_management.users (user_id, username, password)
SELECT
    '54228d9e-7d71-4942-bbaa-6461d1a9fd29',
    'Jane',
    '123456'
WHERE NOT EXISTS (
    SELECT 1 FROM call_management.users
    WHERE user_id = '54228d9e-7d71-4942-bbaa-6461d1a9fd29'
);
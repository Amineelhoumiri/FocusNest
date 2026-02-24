-- Create a sub task table

CREATE TABLE subtasks (
    subtask_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    subtask_name BYTEA NOT NULL,
    subtask_status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (subtask_status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
    energy_level VARCHAR(20) NOT NULL CHECK (energy_level IN ('Low', 'High')),
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
DROP DATABASE IF EXISTS fittrack;
CREATE DATABASE fittrack;
USE fittrack;

-- TABLES

DROP TABLE IF EXISTS USER;
CREATE TABLE USER (
    user_id       INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    bodyweight_kg FLOAT CHECK (bodyweight_kg > 0),
    dob           DATE,
    fitness_goal  VARCHAR(50) CHECK (fitness_goal IN ('strength', 'hypertrophy', 'endurance', 'weight_loss')),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS EXERCISE;
CREATE TABLE EXERCISE (
    exercise_id        INT AUTO_INCREMENT PRIMARY KEY,
    exercise_name      VARCHAR(100) NOT NULL,
    tier               INT CHECK (tier IN (1, 2, 3)),
    movement_pattern   VARCHAR(50),
    is_bodyweight      BOOLEAN DEFAULT FALSE,
    default_percentage FLOAT CHECK (default_percentage BETWEEN 0 AND 1),
    default_sets       INT CHECK (default_sets > 0),
    default_reps       INT CHECK (default_reps > 0),
    primary_muscles    VARCHAR(200),
    is_custom          BOOLEAN DEFAULT FALSE,
    created_by         INT,
    FOREIGN KEY (created_by) REFERENCES USER(user_id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS ONE_REP_MAX;
CREATE TABLE ONE_REP_MAX (
    orm_id      INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    exercise_id INT NOT NULL,
    weight_kg   FLOAT NOT NULL CHECK (weight_kg > 0),
    recorded_on DATE NOT NULL DEFAULT (CURRENT_DATE),
    FOREIGN KEY (user_id) REFERENCES USER(user_id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES EXERCISE(exercise_id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS WORKOUT_PLAN;
CREATE TABLE WORKOUT_PLAN (
    plan_id       INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    strength_week INT DEFAULT 1 CHECK (strength_week > 0),
    running_phase INT DEFAULT 1 CHECK (running_phase BETWEEN 1 AND 4),
    running_week  INT DEFAULT 1 CHECK (running_week BETWEEN 1 AND 4),
    week_type     VARCHAR(20) CHECK (week_type IN ('Accumulation', 'Intensification', 'Deload')),
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USER(user_id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS SESSION_TEMPLATE;
CREATE TABLE SESSION_TEMPLATE (
    template_id  INT AUTO_INCREMENT PRIMARY KEY,
    plan_id      INT NOT NULL,
    session_key  VARCHAR(10) NOT NULL,
    day_of_week  VARCHAR(10),
    session_type VARCHAR(20) CHECK (session_type IN ('strength', 'running', 'rest')),
    scope        VARCHAR(20) DEFAULT 'permanent' CHECK (scope IN ('permanent', 'this_week')),
    FOREIGN KEY (plan_id) REFERENCES WORKOUT_PLAN(plan_id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS SESSION_EXERCISE;
CREATE TABLE SESSION_EXERCISE (
    session_ex_id  INT AUTO_INCREMENT PRIMARY KEY,
    template_id    INT NOT NULL,
    exercise_id    INT NOT NULL,
    sets           INT NOT NULL CHECK (sets > 0),
    reps           VARCHAR(20) NOT NULL,
    percentage_1rm FLOAT CHECK (percentage_1rm BETWEEN 0 AND 1),
    rpe_target     VARCHAR(10),
    rest_duration  VARCHAR(20),
    display_order  INT DEFAULT 1,
    FOREIGN KEY (template_id) REFERENCES SESSION_TEMPLATE(template_id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES EXERCISE(exercise_id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS WORKOUT_LOG;
CREATE TABLE WORKOUT_LOG (
    log_id       INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    template_id  INT NOT NULL,
    workout_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    session_cost INT DEFAULT 0,
    cost_status  VARCHAR(20) CHECK (cost_status IN ('low', 'moderate', 'high', 'very_high')),
    notes        TEXT,
    FOREIGN KEY (user_id) REFERENCES USER(user_id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES SESSION_TEMPLATE(template_id) ON DELETE CASCADE
);

-- weak entity: identified by (log_id, set_number) together
DROP TABLE IF EXISTS SET_LOG;
CREATE TABLE SET_LOG (
    set_log_id     INT AUTO_INCREMENT PRIMARY KEY,
    log_id         INT NOT NULL,
    exercise_id    INT NOT NULL,
    set_number     INT NOT NULL CHECK (set_number > 0),
    reps_done      INT NOT NULL CHECK (reps_done >= 0),
    weight_used_kg FLOAT NOT NULL CHECK (weight_used_kg >= 0),
    rpe_actual     FLOAT CHECK (rpe_actual BETWEEN 1 AND 10),
    completed      BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (log_id) REFERENCES WORKOUT_LOG(log_id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES EXERCISE(exercise_id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS RUNNING_LOG;
CREATE TABLE RUNNING_LOG (
    run_log_id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL,
    run_date            DATE NOT NULL DEFAULT (CURRENT_DATE),
    session_type        VARCHAR(30) CHECK (session_type IN ('zone2', 'speed', 'long_run', 'recovery')),
    running_phase       INT CHECK (running_phase BETWEEN 1 AND 4),
    running_week        INT CHECK (running_week BETWEEN 1 AND 4),
    distance_km         FLOAT CHECK (distance_km > 0),
    duration_seconds    INT CHECK (duration_seconds > 0),
    avg_pace_min_per_km FLOAT,
    notes               TEXT,
    FOREIGN KEY (user_id) REFERENCES USER(user_id) ON DELETE CASCADE
);


-- SAMPLE DATA

INSERT INTO USER (name, email, password_hash, bodyweight_kg, dob, fitness_goal) VALUES
('Meher Bhatti',     'meher@email.com',  'hashed_pw_1', 68.0, '2003-04-15', 'strength'),
('Siya Attarde',     'siya@email.com',   'hashed_pw_2', 57.5, '2003-08-22', 'hypertrophy'),
('Akshay Aiyer',     'akshay@email.com', 'hashed_pw_3', 75.0, '2002-11-10', 'strength'),
('Yash Saraiya',     'yash@email.com',   'hashed_pw_4', 72.0, '2003-01-05', 'endurance'),
('Alema Emran',      'alema@email.com',  'hashed_pw_5', 55.0, '2003-06-18', 'weight_loss'),
('Kushagra Agrawal', 'kushi@email.com',  'hashed_pw_6', 80.0, '2001-03-25', 'strength'),
('Richa Takkekar',   'richa@email.com',  'hashed_pw_7', 60.0, '2002-09-14', 'hypertrophy');

INSERT INTO EXERCISE (exercise_name, tier, movement_pattern, is_bodyweight, default_percentage, default_sets, default_reps, primary_muscles, is_custom) VALUES
('Deadlift',              1, 'hinge', FALSE, 0.80, 3, 5,  'hamstrings,glutes,lower_back', FALSE),
('Bench Press',           1, 'push',  FALSE, 0.75, 4, 6,  'chest,triceps,shoulders',      FALSE),
('Front Squat',           1, 'squat', FALSE, 0.75, 4, 5,  'quads,glutes,core',            FALSE),
('Overhead Press',        1, 'push',  FALSE, 0.70, 4, 6,  'shoulders,triceps',            FALSE),
('Pull Up',               2, 'pull',  TRUE,  NULL, 3, 8,  'lats,biceps',                  FALSE),
('Barbell Row',           2, 'pull',  FALSE, 0.65, 4, 8,  'lats,rhomboids,biceps',        FALSE),
('Romanian Deadlift',     2, 'hinge', FALSE, 0.65, 3, 10, 'hamstrings,glutes',            FALSE),
('Incline Bench Press',   2, 'push',  FALSE, 0.70, 3, 8,  'upper_chest,shoulders',        FALSE),
('Bulgarian Split Squat', 2, 'squat', FALSE, 0.50, 3, 10, 'quads,glutes',                 FALSE),
('Dips',                  2, 'push',  TRUE,  NULL, 3, 10, 'chest,triceps',                FALSE),
('Face Pull',             3, 'pull',  FALSE, 0.40, 3, 15, 'rear_delts,rotator_cuff',      FALSE),
('Leg Press',             3, 'squat', FALSE, 0.70, 3, 12, 'quads,hamstrings',             FALSE),
('Lat Pulldown',          3, 'pull',  FALSE, 0.60, 3, 12, 'lats,biceps',                  FALSE),
('Tricep Pushdown',       3, 'push',  FALSE, 0.50, 3, 15, 'triceps',                      FALSE),
('Bicep Curl',            3, 'pull',  FALSE, 0.45, 3, 12, 'biceps',                       FALSE),
('Plank',                 3, 'core',  TRUE,  NULL, 3, 60, 'core,abs',                     FALSE);

INSERT INTO ONE_REP_MAX (user_id, exercise_id, weight_kg, recorded_on) VALUES
(1, 1, 120.0, '2025-01-10'),
(1, 2, 80.0,  '2025-01-10'),
(1, 3, 90.0,  '2025-01-10'),
(1, 4, 55.0,  '2025-01-10'),
(2, 1, 70.0,  '2025-01-12'),
(2, 2, 50.0,  '2025-01-12'),
(3, 1, 140.0, '2025-01-08'),
(3, 2, 100.0, '2025-01-08'),
(3, 3, 110.0, '2025-01-08'),
(1, 1, 125.0, '2025-02-15'),
(1, 2, 85.0,  '2025-02-15'),
(3, 1, 145.0, '2025-02-20');

INSERT INTO WORKOUT_PLAN (user_id, strength_week, running_phase, running_week, week_type, is_active) VALUES
(1, 5, 2, 3, 'Intensification', TRUE),
(2, 3, 1, 2, 'Accumulation',    TRUE),
(3, 8, 3, 1, 'Intensification', TRUE),
(4, 1, 1, 1, 'Accumulation',    TRUE),
(5, 2, 1, 3, 'Accumulation',    TRUE);

INSERT INTO SESSION_TEMPLATE (plan_id, session_key, day_of_week, session_type, scope) VALUES
(1, 'A', 'Monday',    'strength', 'permanent'),
(1, 'B', 'Wednesday', 'strength', 'permanent'),
(1, 'C', 'Friday',    'strength', 'permanent'),
(2, 'A', 'Monday',    'strength', 'permanent'),
(2, 'B', 'Wednesday', 'strength', 'permanent');

INSERT INTO SESSION_EXERCISE (template_id, exercise_id, sets, reps, percentage_1rm, rpe_target, rest_duration, display_order) VALUES
(1, 1,  4, '5',  0.82, '8', '3 min',  1),
(1, 2,  4, '6',  0.78, '8', '2 min',  2),
(1, 5,  3, '8',  NULL, '7', '90 sec', 3),
(1, 11, 3, '15', 0.40, '6', '60 sec', 4),
(2, 3,  4, '5',  0.78, '8', '3 min',  1),
(2, 4,  4, '6',  0.72, '8', '2 min',  2),
(2, 7,  3, '10', 0.65, '7', '2 min',  3),
(3, 1,  3, '3',  0.88, '9', '4 min',  1),
(3, 6,  4, '8',  0.65, '7', '2 min',  2),
(3, 8,  3, '8',  0.70, '7', '90 sec', 3);

INSERT INTO WORKOUT_LOG (user_id, template_id, workout_date, session_cost, cost_status) VALUES
(1, 1, '2025-04-01', 380, 'high'),
(1, 2, '2025-04-03', 290, 'moderate'),
(1, 3, '2025-04-05', 420, 'very_high'),
(1, 1, '2025-04-08', 360, 'high'),
(2, 4, '2025-04-02', 210, 'moderate'),
(2, 5, '2025-04-04', 180, 'low'),
(3, 1, '2025-04-01', 450, 'very_high'),
(3, 2, '2025-04-03', 310, 'high');

INSERT INTO SET_LOG (log_id, exercise_id, set_number, reps_done, weight_used_kg, rpe_actual, completed) VALUES
(1, 1, 1, 5, 98.0,  8.0,  TRUE),
(1, 1, 2, 5, 98.0,  8.5,  TRUE),
(1, 1, 3, 5, 98.0,  9.0,  TRUE),
(1, 1, 4, 4, 98.0,  9.5,  TRUE),
(1, 2, 1, 6, 62.0,  7.5,  TRUE),
(1, 2, 2, 6, 62.0,  8.0,  TRUE),
(1, 2, 3, 6, 62.0,  8.5,  TRUE),
(1, 2, 4, 5, 62.0,  9.0,  TRUE),
(2, 3, 1, 5, 70.0,  8.0,  TRUE),
(2, 3, 2, 5, 70.0,  8.5,  TRUE),
(2, 4, 1, 6, 40.0,  7.0,  TRUE),
(2, 4, 2, 6, 40.0,  7.5,  TRUE),
(3, 1, 1, 3, 105.0, 9.0,  TRUE),
(3, 1, 2, 3, 105.0, 9.5,  TRUE),
(3, 1, 3, 2, 105.0, 10.0, TRUE),
(4, 1, 1, 5, 100.0, 8.0,  TRUE),
(4, 1, 2, 5, 100.0, 8.5,  TRUE),
(4, 2, 1, 6, 65.0,  7.5,  TRUE),
(5, 1, 1, 5, 52.0,  8.0,  TRUE),
(5, 2, 1, 6, 38.0,  7.0,  TRUE),
(7, 1, 1, 5, 115.0, 8.5,  TRUE),
(7, 1, 2, 5, 115.0, 9.0,  TRUE),
(7, 2, 1, 6, 76.0,  8.0,  TRUE);

INSERT INTO RUNNING_LOG (user_id, run_date, session_type, running_phase, running_week, distance_km, duration_seconds, avg_pace_min_per_km) VALUES
(1, '2025-04-02', 'zone2',    2, 3, 5.0,  1800, 6.0),
(1, '2025-04-06', 'long_run', 2, 3, 10.0, 4200, 7.0),
(4, '2025-04-01', 'zone2',    1, 1, 4.0,  1560, 6.5),
(4, '2025-04-03', 'speed',    1, 1, 3.0,  900,  5.0),
(5, '2025-04-02', 'zone2',    1, 3, 3.5,  1470, 7.0);


-- VIEWS

DROP VIEW IF EXISTS UserDashboardView;
CREATE VIEW UserDashboardView AS
SELECT
    u.user_id,
    u.name AS user_name,
    wp.strength_week,
    wp.week_type,
    st.session_key,
    st.day_of_week,
    e.exercise_name,
    se.sets,
    se.reps,
    ROUND(se.percentage_1rm * orm_latest.weight_kg, 1) AS target_weight_kg,
    se.rpe_target,
    se.rest_duration,
    se.display_order
FROM USER u
JOIN WORKOUT_PLAN wp ON u.user_id = wp.user_id AND wp.is_active = TRUE
JOIN SESSION_TEMPLATE st ON wp.plan_id = st.plan_id
JOIN SESSION_EXERCISE se ON st.template_id = se.template_id
JOIN EXERCISE e ON se.exercise_id = e.exercise_id
JOIN (
    SELECT user_id, exercise_id, weight_kg
    FROM ONE_REP_MAX o1
    WHERE recorded_on = (
        SELECT MAX(recorded_on)
        FROM ONE_REP_MAX o2
        WHERE o2.user_id = o1.user_id AND o2.exercise_id = o1.exercise_id
    )
) AS orm_latest ON u.user_id = orm_latest.user_id AND e.exercise_id = orm_latest.exercise_id
ORDER BY u.user_id, st.session_key, se.display_order;

DROP VIEW IF EXISTS ProgressTrackingView;
CREATE VIEW ProgressTrackingView AS
SELECT
    u.user_id,
    u.name AS user_name,
    e.exercise_name,
    wl.workout_date,
    sl.set_number,
    sl.reps_done,
    sl.weight_used_kg,
    sl.rpe_actual,
    (
        SELECT MAX(sl2.weight_used_kg)
        FROM SET_LOG sl2
        JOIN WORKOUT_LOG wl2 ON sl2.log_id = wl2.log_id
        WHERE wl2.user_id = u.user_id AND sl2.exercise_id = e.exercise_id
    ) AS personal_best_kg
FROM USER u
JOIN WORKOUT_LOG wl ON u.user_id = wl.user_id
JOIN SET_LOG sl ON wl.log_id = sl.log_id
JOIN EXERCISE e ON sl.exercise_id = e.exercise_id
ORDER BY u.user_id, e.exercise_name, wl.workout_date;

DROP VIEW IF EXISTS ExerciseSummaryView;
CREATE VIEW ExerciseSummaryView AS
SELECT
    u.user_id,
    u.name AS user_name,
    e.exercise_name,
    WEEK(wl.workout_date) AS week_number,
    YEAR(wl.workout_date) AS year,
    COUNT(DISTINCT wl.log_id) AS sessions_done,
    SUM(sl.sets_volume) AS total_volume_kg
FROM USER u
JOIN WORKOUT_LOG wl ON u.user_id = wl.user_id
JOIN (
    SELECT log_id, exercise_id,
           COUNT(*) AS sets_done,
           SUM(reps_done * weight_used_kg) AS sets_volume
    FROM SET_LOG
    GROUP BY log_id, exercise_id
) sl ON wl.log_id = sl.log_id
JOIN EXERCISE e ON sl.exercise_id = e.exercise_id
GROUP BY u.user_id, u.name, e.exercise_name, WEEK(wl.workout_date), YEAR(wl.workout_date)
ORDER BY u.user_id, year, week_number, e.exercise_name;


-- INDEXES

CREATE INDEX idx_workout_log_user     ON WORKOUT_LOG(user_id);
CREATE INDEX idx_workout_log_date     ON WORKOUT_LOG(workout_date);
CREATE INDEX idx_set_log_log          ON SET_LOG(log_id);
CREATE INDEX idx_set_log_exercise     ON SET_LOG(exercise_id);
CREATE INDEX idx_orm_user_exercise    ON ONE_REP_MAX(user_id, exercise_id);
CREATE INDEX idx_workout_plan_user    ON WORKOUT_PLAN(user_id, is_active);


-- STORED FUNCTIONS

DELIMITER //
DROP FUNCTION IF EXISTS CalculateExerciseCost//
CREATE FUNCTION CalculateExerciseCost(
    p_exercise_id INT,
    p_sets        INT,
    p_reps        INT,
    p_percentage  FLOAT
)
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v_tier            INT   DEFAULT 3;
    DECLARE v_tier_multiplier FLOAT DEFAULT 1.0;
    DECLARE v_percentage      FLOAT DEFAULT 0.0;
    DECLARE v_cost            INT   DEFAULT 0;

    SELECT COALESCE(tier, 3)
    INTO v_tier
    FROM EXERCISE
    WHERE exercise_id = p_exercise_id
    LIMIT 1;

    SET v_tier_multiplier = CASE v_tier
        WHEN 1 THEN 1.50
        WHEN 2 THEN 1.20
        ELSE        1.00
    END;

    SET v_percentage = COALESCE(p_percentage, 0.50);
    SET v_cost = ROUND(COALESCE(p_sets, 0) * COALESCE(p_reps, 0) * v_percentage * 10 * v_tier_multiplier);

    RETURN v_cost;
END//
DELIMITER ;

DELIMITER //
DROP FUNCTION IF EXISTS GetWeekType//
CREATE FUNCTION GetWeekType(p_strength_week INT)
RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
    DECLARE v_cycle_week INT;
    SET v_cycle_week = MOD(p_strength_week - 1, 4) + 1;

    RETURN CASE
        WHEN v_cycle_week IN (1, 2) THEN 'Accumulation'
        WHEN v_cycle_week = 3       THEN 'Intensification'
        ELSE                             'Deload'
    END;
END//
DELIMITER ;


-- STORED PROCEDURES

DELIMITER //
DROP PROCEDURE IF EXISTS RegisterUser//
CREATE PROCEDURE RegisterUser(
    IN p_name       VARCHAR(100),
    IN p_email      VARCHAR(150),
    IN p_password   VARCHAR(255),
    IN p_bodyweight FLOAT,
    IN p_goal       VARCHAR(50)
)
BEGIN
    DECLARE v_user_id INT;
    DECLARE v_plan_id INT;

    INSERT INTO USER (name, email, password_hash, bodyweight_kg, fitness_goal)
    VALUES (p_name, p_email, SHA2(p_password, 256), p_bodyweight, p_goal);

    SET v_user_id = LAST_INSERT_ID();

    INSERT INTO WORKOUT_PLAN (user_id, strength_week, running_phase, running_week, week_type, is_active)
    VALUES (v_user_id, 1, 1, 1, GetWeekType(1), TRUE);

    SET v_plan_id = LAST_INSERT_ID();

    INSERT INTO ONE_REP_MAX (user_id, exercise_id, weight_kg, recorded_on)
    SELECT
        v_user_id,
        exercise_id,
        ROUND(p_bodyweight * CASE tier WHEN 1 THEN 0.90 WHEN 2 THEN 0.65 ELSE 0.40 END, 1),
        CURRENT_DATE
    FROM EXERCISE
    WHERE is_bodyweight = FALSE;

    INSERT INTO SESSION_TEMPLATE (plan_id, session_key, day_of_week, session_type, scope)
    VALUES
        (v_plan_id, 'A', 'Monday',    'strength', 'permanent'),
        (v_plan_id, 'B', 'Wednesday', 'strength', 'permanent'),
        (v_plan_id, 'C', 'Friday',    'strength', 'permanent');
END//
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS LogWorkout//
CREATE PROCEDURE LogWorkout(
    IN p_user_id      INT,
    IN p_template_id  INT,
    IN p_workout_date DATE
)
BEGIN
    DECLARE v_log_id       INT;
    DECLARE v_session_cost INT DEFAULT 0;
    DECLARE v_cost_status  VARCHAR(20);

    SELECT COALESCE(SUM(
        CalculateExerciseCost(
            se.exercise_id,
            se.sets,
            CAST(se.reps AS UNSIGNED),
            COALESCE(se.percentage_1rm, 0.50)
        )
    ), 0)
    INTO v_session_cost
    FROM SESSION_EXERCISE se
    WHERE se.template_id = p_template_id;

    SET v_cost_status = CASE
        WHEN v_session_cost < 200 THEN 'low'
        WHEN v_session_cost < 300 THEN 'moderate'
        WHEN v_session_cost < 400 THEN 'high'
        ELSE 'very_high'
    END;

    INSERT INTO WORKOUT_LOG (user_id, template_id, workout_date, session_cost, cost_status)
    VALUES (p_user_id, p_template_id, COALESCE(p_workout_date, CURRENT_DATE), v_session_cost, v_cost_status);

    SET v_log_id = LAST_INSERT_ID();

    INSERT INTO SET_LOG (log_id, exercise_id, set_number, reps_done, weight_used_kg, rpe_actual, completed)
    WITH RECURSIVE set_numbers(n) AS (
        SELECT 1
        UNION ALL
        SELECT n + 1 FROM set_numbers WHERE n < 20
    )
    SELECT
        v_log_id,
        se.exercise_id,
        set_numbers.n,
        CAST(se.reps AS UNSIGNED),
        ROUND(COALESCE(se.percentage_1rm, 0) * COALESCE((
            SELECT MAX(orm.weight_kg)
            FROM ONE_REP_MAX orm
            WHERE orm.user_id = p_user_id AND orm.exercise_id = se.exercise_id
        ), 0), 1),
        CAST(COALESCE(se.rpe_target, '7') AS DECIMAL(3,1)),
        TRUE
    FROM SESSION_EXERCISE se
    JOIN set_numbers ON set_numbers.n <= se.sets
    WHERE se.template_id = p_template_id;
END//
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS AdvanceWeek//
CREATE PROCEDURE AdvanceWeek(IN p_user_id INT)
BEGIN
    DECLARE v_plan_id   INT;
    DECLARE v_next_week INT;
    DECLARE v_week_type VARCHAR(20);

    SELECT plan_id, strength_week + 1
    INTO v_plan_id, v_next_week
    FROM WORKOUT_PLAN
    WHERE user_id = p_user_id AND is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1;

    SET v_week_type = GetWeekType(v_next_week);

    UPDATE WORKOUT_PLAN
    SET strength_week = v_next_week,
        week_type     = v_week_type
    WHERE plan_id = v_plan_id;

    INSERT INTO SESSION_TEMPLATE (plan_id, session_key, day_of_week, session_type, scope)
    SELECT
        v_plan_id,
        CONCAT('W', v_next_week, st.session_key),
        st.day_of_week,
        st.session_type,
        'this_week'
    FROM SESSION_TEMPLATE st
    WHERE st.plan_id = v_plan_id
      AND st.scope = 'permanent'
      AND NOT EXISTS (
          SELECT 1 FROM SESSION_TEMPLATE existing_st
          WHERE existing_st.plan_id    = v_plan_id
            AND existing_st.session_key = CONCAT('W', v_next_week, st.session_key)
      );

    INSERT INTO SESSION_EXERCISE (
        template_id, exercise_id, sets, reps, percentage_1rm,
        rpe_target, rest_duration, display_order
    )
    SELECT
        new_st.template_id,
        old_se.exercise_id,
        CASE WHEN v_week_type = 'Deload' THEN GREATEST(old_se.sets - 1, 1) ELSE old_se.sets END,
        old_se.reps,
        CASE
            WHEN old_se.percentage_1rm IS NULL   THEN NULL
            WHEN v_week_type = 'Accumulation'    THEN old_se.percentage_1rm
            WHEN v_week_type = 'Intensification' THEN LEAST(old_se.percentage_1rm + 0.05, 0.90)
            ELSE ROUND(old_se.percentage_1rm * 0.75, 2)
        END,
        old_se.rpe_target,
        old_se.rest_duration,
        old_se.display_order
    FROM SESSION_TEMPLATE old_st
    JOIN SESSION_EXERCISE old_se ON old_st.template_id = old_se.template_id
    JOIN SESSION_TEMPLATE new_st
        ON new_st.plan_id      = v_plan_id
       AND new_st.session_key  = CONCAT('W', v_next_week, old_st.session_key)
       AND new_st.scope        = 'this_week'
    WHERE old_st.plan_id = v_plan_id
      AND old_st.scope   = 'permanent'
      AND NOT EXISTS (
          SELECT 1 FROM SESSION_EXERCISE existing_se
          WHERE existing_se.template_id   = new_st.template_id
            AND existing_se.exercise_id   = old_se.exercise_id
            AND existing_se.display_order = old_se.display_order
      );
END//
DELIMITER ;


-- TRIGGERS

DELIMITER //
DROP TRIGGER IF EXISTS trg_after_insert_set_log_new_1rm//
CREATE TRIGGER trg_after_insert_set_log_new_1rm
AFTER INSERT ON SET_LOG
FOR EACH ROW
BEGIN
    DECLARE v_user_id     INT;
    DECLARE v_current_max FLOAT DEFAULT 0;

    SELECT wl.user_id INTO v_user_id
    FROM WORKOUT_LOG wl
    WHERE wl.log_id = NEW.log_id;

    SELECT COALESCE(MAX(orm.weight_kg), 0) INTO v_current_max
    FROM ONE_REP_MAX orm
    WHERE orm.user_id = v_user_id AND orm.exercise_id = NEW.exercise_id;

    IF NEW.weight_used_kg > v_current_max THEN
        INSERT INTO ONE_REP_MAX (user_id, exercise_id, weight_kg, recorded_on)
        VALUES (v_user_id, NEW.exercise_id, NEW.weight_used_kg, CURRENT_DATE);
    END IF;
END//
DELIMITER ;

DELIMITER //
DROP TRIGGER IF EXISTS trg_after_insert_workout_log_advance_week//
CREATE TRIGGER trg_after_insert_workout_log_advance_week
AFTER INSERT ON WORKOUT_LOG
FOR EACH ROW
BEGIN
    DECLARE v_plan_id            INT;
    DECLARE v_scope              VARCHAR(20);
    DECLARE v_week_prefix        VARCHAR(10);
    DECLARE v_planned_sessions   INT DEFAULT 0;
    DECLARE v_completed_sessions INT DEFAULT 0;

    SELECT st.plan_id, st.scope,
           CASE WHEN st.scope = 'this_week'
                THEN LEFT(st.session_key, CHAR_LENGTH(st.session_key) - 1)
                ELSE NULL END
    INTO v_plan_id, v_scope, v_week_prefix
    FROM SESSION_TEMPLATE st
    WHERE st.template_id = NEW.template_id;

    SELECT COUNT(*) INTO v_planned_sessions
    FROM SESSION_TEMPLATE st
    WHERE st.plan_id      = v_plan_id
      AND st.session_type = 'strength'
      AND ((v_scope = 'permanent'  AND st.scope = 'permanent')
        OR (v_scope = 'this_week' AND st.scope = 'this_week'
            AND st.session_key LIKE CONCAT(v_week_prefix, '%')));

    SELECT COUNT(DISTINCT wl.template_id) INTO v_completed_sessions
    FROM WORKOUT_LOG wl
    JOIN SESSION_TEMPLATE st ON wl.template_id = st.template_id
    WHERE wl.user_id      = NEW.user_id
      AND st.plan_id      = v_plan_id
      AND st.session_type = 'strength'
      AND YEARWEEK(wl.workout_date, 1) = YEARWEEK(NEW.workout_date, 1)
      AND ((v_scope = 'permanent'  AND st.scope = 'permanent')
        OR (v_scope = 'this_week' AND st.scope = 'this_week'
            AND st.session_key LIKE CONCAT(v_week_prefix, '%')));

    IF v_planned_sessions > 0 AND v_completed_sessions >= v_planned_sessions THEN
        CALL AdvanceWeek(NEW.user_id);
    END IF;
END//
DELIMITER ;


-- QUERIES

-- Q1: for each exercise, show user's starting 1RM vs max weight ever logged
SET @demo_user_id = 1;
SELECT
    e.exercise_id,
    e.exercise_name,
    (
        SELECT orm_start.weight_kg
        FROM ONE_REP_MAX orm_start
        WHERE orm_start.user_id = @demo_user_id AND orm_start.exercise_id = e.exercise_id
        ORDER BY orm_start.recorded_on ASC, orm_start.orm_id ASC
        LIMIT 1
    ) AS starting_weight_kg,
    (
        SELECT MAX(sl.weight_used_kg)
        FROM SET_LOG sl
        JOIN WORKOUT_LOG wl ON sl.log_id = wl.log_id
        WHERE wl.user_id = @demo_user_id AND sl.exercise_id = e.exercise_id
    ) AS max_logged_weight_kg
FROM EXERCISE e
WHERE EXISTS (
    SELECT 1 FROM ONE_REP_MAX orm
    WHERE orm.user_id = @demo_user_id AND orm.exercise_id = e.exercise_id
)
ORDER BY e.exercise_name;

-- Q2: exercises this week where actual weight exceeded the planned percentage
SET @demo_user_id = 1;
SELECT DISTINCT
    e.exercise_name,
    wl.workout_date,
    sl.weight_used_kg AS actual_weight_kg,
    ROUND(se.percentage_1rm * (
        SELECT MAX(orm.weight_kg)
        FROM ONE_REP_MAX orm
        WHERE orm.user_id = wl.user_id AND orm.exercise_id = sl.exercise_id
    ), 1) AS planned_weight_kg
FROM WORKOUT_LOG wl
JOIN SET_LOG sl ON wl.log_id = sl.log_id
JOIN SESSION_EXERCISE se ON wl.template_id = se.template_id AND sl.exercise_id = se.exercise_id
JOIN EXERCISE e ON sl.exercise_id = e.exercise_id
WHERE wl.user_id = @demo_user_id
  AND YEARWEEK(wl.workout_date, 1) = YEARWEEK(CURRENT_DATE, 1)
  AND se.percentage_1rm IS NOT NULL
  AND sl.weight_used_kg > se.percentage_1rm * (
      SELECT MAX(orm.weight_kg)
      FROM ONE_REP_MAX orm
      WHERE orm.user_id = wl.user_id AND orm.exercise_id = sl.exercise_id
  )
ORDER BY wl.workout_date, e.exercise_name;

-- Q3: users who completed more workouts this month than the average
SELECT
    u.user_id,
    u.name,
    COUNT(wl.log_id) AS workouts_this_month
FROM USER u
JOIN WORKOUT_LOG wl ON u.user_id = wl.user_id
WHERE YEAR(wl.workout_date) = YEAR(CURRENT_DATE)
  AND MONTH(wl.workout_date) = MONTH(CURRENT_DATE)
GROUP BY u.user_id, u.name
HAVING COUNT(wl.log_id) > (
    SELECT AVG(user_workout_count)
    FROM (
        SELECT COUNT(wl2.log_id) AS user_workout_count
        FROM USER u2
        LEFT JOIN WORKOUT_LOG wl2
            ON u2.user_id = wl2.user_id
           AND YEAR(wl2.workout_date)  = YEAR(CURRENT_DATE)
           AND MONTH(wl2.workout_date) = MONTH(CURRENT_DATE)
        GROUP BY u2.user_id
    ) AS monthly_counts
)
ORDER BY workouts_this_month DESC;


-- AUTHORIZATION

CREATE USER IF NOT EXISTS 'app_user'@'localhost'   IDENTIFIED BY 'fittrack_app_2025';
GRANT SELECT, INSERT, UPDATE ON fittrack.* TO 'app_user'@'localhost';

CREATE USER IF NOT EXISTS 'admin_user'@'localhost' IDENTIFIED BY 'fittrack_admin_2025';
GRANT ALL PRIVILEGES ON fittrack.* TO 'admin_user'@'localhost';

FLUSH PRIVILEGES;
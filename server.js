process.on("uncaughtException", (err) => {
    console.error("🔥 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
    console.error("🔥 UNHANDLED REJECTION:", err);
});

const express = require("express");
const cors = require("cors");
const path = require("path");
const sql = require("mssql");
const bcrypt = require("bcrypt");
const app = express();
const jwt = require("jsonwebtoken");
const SECRET = "fitplan_secret";


app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ================= SQL CONFIG =================

const config = {
    user: "sa",
    password: "1234",
    server: "localhost",
    port: 1433,
    database: "FitPlanDB",
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// ✅ SINGLE CONNECTION POOL (ВАЖНО)
const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log("✅ SQL Connected");
        return pool;
    })
    .catch(err => {
        console.error("❌ DB Connection Error:", err);
    });


















app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "EMPTY_FIELDS" });
        }

        const pool = await poolPromise;

        const result = await pool.request()
            .input("email", sql.NVarChar, email)
            .query("SELECT UserID, email, password, rol FROM Users WHERE email=@email");

        const user = result.recordset[0];

        if (!user) {
            return res.json({ success: false, message: "USER_NOT_FOUND" });
        }

        let ok = false;

        try {
            ok = await bcrypt.compare(password, user.password);
        } catch (e) {
            console.log("❌ bcrypt compare error:", e.message);

            ok = (password === user.password);
        }

        if (!ok) {
            return res.json({ success: false, message: "WRONG_PASSWORD" });
        }

        const token = jwt.sign(
            { id: user.UserID, email: user.email },
            SECRET,
            { expiresIn: "7d" }
        );

        return res.json({
    success: true,
    id: user.UserID,
    role: (user.rol || "").trim().toLowerCase(),
    token
});
    } catch (err) {
        console.error("🔥 LOGIN ERROR:", err);
        res.status(500).json({ success: false, message: "SERVER_ERROR" });
    }
});


















app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "adminvh.html"));
});

app.get("/users.html", (req, res) => res.sendFile(path.join(__dirname, "users.html")));
app.get("/nutrition.html", (req, res) => res.sendFile(path.join(__dirname, "nutrition.html")));
app.get("/exercises.html", (req, res) => res.sendFile(path.join(__dirname, "exercises.html")));

app.get("/test", (req, res) => {
    res.send("SERVER WORKING ✅");
});

app.get("/users", async (req, res) => {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(`
    SELECT 
        UserID,
        name,
        email,
        age,
        height,
        weight,
        targetWeight,
        activity,
        goal,
        gender,
        profileImage,
        dailyCaloriesGoal,
        dailyProteinGoal,
        dailyFatGoal,
        dailyCarbsGoal,
        updated_at
    FROM Users
    ORDER BY UserID DESC
`);

        res.json(result.recordset);

    } catch (err) {
        console.error("❌ USERS GET ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post("/users", async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const pool = await poolPromise;

        const check = await pool.request()
            .input("email", sql.NVarChar, email)
            .query("SELECT 1 FROM Users WHERE email=@email");

        if (check.recordset.length > 0) {
            return res.status(409).json({ message: "User exists" });
        }
const bcrypt = require("bcrypt");
const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.request()
            .input("name", sql.NVarChar, name)
            .input("email", sql.NVarChar, email)
           .input("password", sql.NVarChar, hashedPassword)
            .query(`
                INSERT INTO Users (name, email, password, register_date)
                OUTPUT INSERTED.UserID
                VALUES (@name, @email, @password, GETDATE())
            `);

        res.json({
            success: true,
            id: result.recordset[0].UserID
        });

    } catch (err) {
        console.error("❌ USERS ERROR:", err);
        res.status(500).send(err.message);
    }
});

app.get("/users/:id", async (req, res) => {
    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input("id", sql.Int, req.params.id)
            .query(`
                SELECT 
    UserID,
    name,
    email,
    age,
    height,
    weight,
    targetWeight,
    activity,
    goal,
    gender,
    dailyCaloriesGoal,
    dailyProteinGoal,
    dailyFatGoal,
    dailyCarbsGoal
FROM Users
WHERE UserID = @id
            `);

        res.json(result.recordset[0] || null);

    } catch (err) {
        console.error(err);
        res.status(500).send("Error");
    }
});

app.get("/workouts/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input("userId", sql.Int, userId)
            .query(`
                SELECT *
                FROM Workouts
                WHERE user_id=@userId
                ORDER BY created_at DESC
            `);

        res.json(result.recordset);

    } catch (err) {
        console.error("❌ WORKOUTS GET:", err);
        res.status(500).send("Error");
    }
});

app.post("/workouts", async (req, res) => {
    const { userId, name } = req.body;

    try {
        const pool = await poolPromise;

        await pool.request()
            .input("userId", sql.Int, userId)
            .input("name", sql.NVarChar, name)
            .query(`
                INSERT INTO Workouts (user_id, name, created_at)
                VALUES (@userId, @name, GETDATE())
            `);

        res.json({ success: true });

    } catch (err) {
        console.error("❌ WORKOUTS POST:", err);
        res.status(500).send("Error");
    }
});


app.get("/exercises/:id", async (req, res) => {
    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input("id", sql.Int, req.params.id)
            .query(`
                SELECT ExerciseID, name, muscle_group, difficulty
                FROM Exercises
                WHERE ExerciseID = @id
            `);

        res.json(result.recordset[0]);

    } catch (err) {
        console.error(err);
        res.status(500).send("Error");
    }
});


app.put("/exercises/:id", async (req, res) => {
    try {
        const pool = await poolPromise;

        const { id } = req.params;
        const { name, muscleGroup, difficulty } = req.body;

        const result = await pool.request()
            .input("id", sql.Int, id)
            .input("name", sql.NVarChar, name)
            .input("muscleGroup", sql.NVarChar, muscleGroup)
            .input("difficulty", sql.NVarChar, difficulty)
            .query(`
                UPDATE Exercises
                SET 
                    name = @name,
                    muscle_group = @muscleGroup,
                    difficulty = @difficulty
                WHERE ExerciseID = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Not found" });
        }

        res.json({ success: true });

    } catch (err) {
        console.error("UPDATE ERROR:", err);
        res.status(500).send("Error");
    }
});

app.delete("/exercises/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await poolPromise;

        // ⚠️ сначала удаляем из связующей таблицы
        await pool.request()
            .input("id", sql.Int, id)
            .query(`
                DELETE FROM WorkoutExercises WHERE exercise_id = @id
            `);

        // потом из основной
        await pool.request()
            .input("id", sql.Int, id)
            .query(`
                DELETE FROM Exercises WHERE ExerciseID = @id
            `);

        res.json({ success: true });

    } catch (err) {
        console.error("❌ DELETE ERROR:", err);
        res.status(500).send("Error");
    }
});

 
app.post("/exercises", async (req, res) => {
    const pool = await poolPromise;

    try {
        const {
            workoutId,
            name,
            muscleGroup,
            difficulty,
            sets,
            reps,
            weight,
            rest
        } = req.body;

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);

        // 1. ищем или создаём упражнение
        const ex = await request
            .input("name", sql.NVarChar, name)
            .query(`SELECT ExerciseID FROM Exercises WHERE name=@name`);

        let exerciseId;

        if (ex.recordset.length > 0) {
            exerciseId = ex.recordset[0].ExerciseID;
        } else {
            const insert = await request
                .input("name2", sql.NVarChar, name)
                .input("muscleGroup", sql.NVarChar, muscleGroup)
                .input("difficulty", sql.NVarChar, difficulty)
                .query(`
                    INSERT INTO Exercises (name, muscle_group, difficulty)
                    OUTPUT INSERTED.ExerciseID
                    VALUES (@name2, @muscleGroup, @difficulty)
                `);

            exerciseId = insert.recordset[0].ExerciseID;
        }

        await request
            .input("workoutId", sql.Int, workoutId)
            .input("exerciseId", sql.Int, exerciseId)
            .input("sets", sql.Int, sets)
            .input("reps", sql.Int, reps)
            .input("weight", sql.Int, weight)
            .input("rest", sql.Int, rest)
            .query(`
                IF EXISTS (
                    SELECT 1 FROM WorkoutExercises
                    WHERE workout_id=@workoutId AND exercise_id=@exerciseId
                )
                UPDATE WorkoutExercises
                SET sets=@sets,
                    reps=@reps,
                    weight=@weight,
                    rest=@rest
                WHERE workout_id=@workoutId AND exercise_id=@exerciseId
                ELSE
                INSERT INTO WorkoutExercises
                (workout_id, exercise_id, sets, reps, weight, rest)
                VALUES
                (@workoutId, @exerciseId, @sets, @reps, @weight, @rest)
            `);

        await transaction.commit();

        res.json({ success: true });

    } catch (err) {
        console.error("❌ EXERCISES POST:", err);
        res.status(500).send(err.message);
    }
});

app.get("/exercises", async (req, res) => {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(`
            SELECT 
                ExerciseID,
                name,
                muscle_group,
                difficulty
            FROM Exercises
            ORDER BY ExerciseID DESC
        `);

        res.json(result.recordset);

    } catch (err) {
        console.error("❌ EXERCISES GET:", err);
        res.status(500).send("Error");
    }
});


app.put("/users/:id", async (req, res) => {
    console.log("🔥 UPDATE BODY:", req.body);
    try {
        const pool = await poolPromise;

        const {
            name, email, password,
            age, height, weight,
            targetWeight, activity, goal, gender,
            dailyCaloriesGoal, dailyProteinGoal, dailyFatGoal, dailyCarbsGoal
        } = req.body;

        const hashedPassword = password
            ? await bcrypt.hash(password, 10)
            : null;

        await pool.request()
            .input("id", sql.Int, req.params.id)
            .input("name", sql.NVarChar, name)
            .input("email", sql.NVarChar, email)
            .input("password", sql.NVarChar, hashedPassword)
            .input("age", sql.Int, age)
            .input("height", sql.Int, height)
            .input("weight", sql.Int, weight)
            .input("targetWeight", sql.Int, targetWeight)
            .input("activity", sql.NVarChar, activity)
            .input("goal", sql.NVarChar, goal)
            .input("gender", sql.NVarChar, gender)
            .input("calories", sql.Int, dailyCaloriesGoal)
            .input("protein", sql.Int, dailyProteinGoal)
            .input("fat", sql.Int, dailyFatGoal)
            .input("carbs", sql.Int, dailyCarbsGoal) 
            .query(`
                UPDATE Users
                SET 
                    name=@name,
                    email=@email,
                    password=COALESCE(@password, password),
                    age=@age,
                    height=@height,
                    weight=@weight,
                    targetWeight=@targetWeight,
                    activity=@activity,
                    goal=@goal,
                    gender=@gender,
                    dailyCaloriesGoal=@calories,
                    dailyProteinGoal=@protein,
                    dailyFatGoal=@fat,
                    dailyCarbsGoal=@carbs
                WHERE UserID=@id
            `);

        res.json({ success: true });

    } catch (err) {
        console.error("UPDATE ERROR:", err);
        res.status(500).send(err.message);
    }
});

app.post("/users/sync", async (req, res) => {
    try {
        const pool = await poolPromise;
        const users = req.body;

        for (const u of users) {
            await pool.request()
                .input("id", sql.Int, u.id)
                .input("name", sql.NVarChar, u.name)
                .input("email", sql.NVarChar, u.email)
                .input("age", sql.Int, u.age)
                .input("height", sql.Int, u.height)
                .input("weight", sql.Int, u.weight)

                .input("targetWeight", sql.Int, u.targetWeight)
                .input("activity", sql.NVarChar, u.activity)
                .input("goal", sql.NVarChar, u.goal)
                .input("gender", sql.NVarChar, u.gender)

                .input("calories", sql.Float, u.dailyCaloriesGoal)
                .input("protein", sql.Float, u.dailyProteinGoal)
                .input("fat", sql.Float, u.dailyFatGoal)
                .input("carbs", sql.Float, u.dailyCarbsGoal)

                .input("updated_at", sql.DateTime, new Date())

                .query(`
                    IF EXISTS (SELECT 1 FROM Users WHERE UserID=@id)
                    BEGIN
                        UPDATE Users
                        SET 
                            name=@name,
                            email=@email,
                            age=@age,
                            height=@height,
                            weight=@weight,
                            targetWeight=@targetWeight,
                            activity=@activity,
                            goal=@goal,
                            gender=@gender,
                            dailyCaloriesGoal=@calories,
                            dailyProteinGoal=@protein,
                            dailyFatGoal=@fat,
                            dailyCarbsGoal=@carbs,
                            updated_at=@updated_at
                        WHERE UserID=@id
                    END
                    ELSE
                    BEGIN
                        INSERT INTO Users (
                            name,email,age,height,weight,
                            targetWeight,activity,goal,gender,
                            dailyCaloriesGoal,dailyProteinGoal,dailyFatGoal,dailyCarbsGoal,
                            updated_at
                        )
                        VALUES (
                            @name,@email,@age,@height,@weight,
                            @targetWeight,@activity,@goal,@gender,
                            @calories,@protein,@fat,@carbs,
                            @updated_at
                        )
                    END
                `);
        }

        res.json({ success: true });

    } catch (err) {
        console.error("SYNC ERROR:", err);
        res.status(500).send("Error");
    }
});

app.get("/api/profile/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        const pool = await poolPromise;

        const result = await pool.request()
            .input("id", sql.Int, id)
            .query(`
                SELECT UserID, name, email, numberfon
                FROM Users
                WHERE UserID = @id
            `);

        res.json(result.recordset[0] || null);

    } catch (err) {
        console.error("PROFILE GET ERROR:", err);
        res.status(500).send("Error");
    }
});
app.get("/profile.html", (req, res) => {
    res.sendFile(path.join(__dirname, "profil.html"));
});

app.get("/users.html", (req, res) => {
    res.sendFile(path.join(__dirname, "users.html"));
});
// ================= START =================

app.listen(2288, "0.0.0.0", () => {
    console.log("🚀 Server running");
    console.log("📱 http://192.168.0.10:2288");
});
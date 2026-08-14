const express = require('express');
const pool = require('./db');

const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());

const path = require('path');

app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// कनेक्शन चेक करण्यासाठी छोटी टेस्ट क्वेरी
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database Connection Failed:', err.message);
  } else {
    console.log('🐘 PostgreSQL Database connected successfully!');
    console.log('⏰ Server Time:', res.rows[0].now);
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { user_id, password } = req.body;

    // user_id किंवा password रिकामे असल्यास
    if (!user_id || !password) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Password are required!'
      });
    }

    // १. युझरनेम आधीच डेटाबेसमध्ये आहे का ते तपासा
    const userExist = await pool.query(
      'SELECT * FROM users WHERE user_id = $1',
      [user_id]
    );

    if (userExist.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User ID already exists! Please choose another one.'
      });
    }

    // २. नवीन युझर डेटाबेसमध्ये सेव्ह करा
    const newUser = await pool.query(
      'INSERT INTO users (user_id, password) VALUES ($1, $2) RETURNING user_id',
      [user_id, password]
    );

    res.json({
      success: true,
      message: 'Registration successful! You can now login.',
      user: newUser.rows[0]
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error during registration' });
  }
});

// ----------------------------------------------------
// 🔑 2. LOGIN API (लॉगिन करण्यासाठी)
// ----------------------------------------------------
app.post('/api/login', async (req, res) => {

    try {

        const { user_id, password } = req.body;


        // ==========================================
        // CHECK USER
        // ==========================================

        const user = await pool.query(
            'SELECT * FROM users WHERE user_id = $1 AND password = $2',
            [user_id, password]
        );


        // ==========================================
        // INVALID LOGIN
        // ==========================================

        if (user.rows.length === 0) {

            return res.status(401).json({

                success: false,

                message:
                    'Invalid User ID or Password!'

            });

        }


        // ==========================================
        // LOGGED-IN USER ID
        // ==========================================

        const loggedInUserId =
            user.rows[0].user_id;


        console.log(
            "LOGIN USER ID:",
            loggedInUserId
        );


        // ==========================================
        // LOGIN SUCCESS
        // ==========================================

        res.json({

            success: true,

            message:
                'Login successful! Application Opened.',

            user: {

                user_id:
                    loggedInUserId

            }

        });

    }


    catch (err) {

        console.error(
            "LOGIN ERROR:",
            err.message
        );

        res.status(500).json({

            success: false,

            message:
                'Server Error during login'

        });

    }

});
// ----------------------------------------------------
// 🚪 3. LOGOUT API (लॉगआउट करण्यासाठी)
// ----------------------------------------------------
app.post('/api/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully! Application Closed.'
  });
});

// ----------------------------------------------------
// 📁 1. ADD CATEGORY API (नवीन कॅटेगरी जोडण्यासाठी)
// ----------------------------------------------------
app.post('/api/categories', async (req, res) => {

    try {

        const {
            category_name,
            created_by,
            created_at
        } = req.body;


        if (
            !category_name ||
            !created_by ||
            !created_at
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'Category Name, Created By and Created Date are required!'

            });

        }


        const newCategory =
            await pool.query(

                `
                INSERT INTO categories
                (
                    category_name,
                    created_by,
                    created_at
                )
                VALUES
                (
                    $1,
                    $2,
                    $3::date
                )
                RETURNING
                    category_id,
                    category_name,
                    created_by,
                    TO_CHAR(
                        created_at,
                        'YYYY-MM-DD'
                    ) AS created_at
                `,

                [
                    category_name,
                    created_by,
                    created_at
                ]

            );


        res.json({

            success: true,

            message:
                'Category added successfully!',

            category:
                newCategory.rows[0]

        });

    }


    catch (err) {

        console.error(
            "CATEGORY SAVE ERROR:",
            err.message
        );


        res.status(500).json({

            success: false,

            message:
                err.message

        });

    }

});
// ----------------------------------------------------
// 📂 2. GET CATEGORIES API (युझरच्या सर्व कॅटेगरीज पाहण्यासाठी)
// ----------------------------------------------------
app.get('/api/categories/:created_by', async (req, res) => {

    try {

        const { created_by } = req.params;


        console.log(
            "GET CATEGORIES API CALLED:",
            created_by
        );


        const categories =
            await pool.query(

                `
                SELECT
                    category_id,
                    category_name,
                    created_by,
                    TO_CHAR(
                        created_at,
                        'YYYY-MM-DD'
                    ) AS created_at
                FROM categories
                WHERE created_by = $1
                ORDER BY category_id DESC
                `,

                [created_by]

            );


        console.log(
            "CATEGORY DB RESPONSE:",
            categories.rows
        );


        res.json({

            success: true,

            categories:
                categories.rows

        });

    }


    catch (err) {

        console.error(
            "GET CATEGORIES ERROR:",
            err.message
        );


        res.status(500).json({

            success: false,

            message: "Server Error"

        });

    }

});
// ----------------------------------------------------
// ✏️ UPDATE CATEGORY API (कॅटेगरीचे नाव बदलण्यासाठी)
// ----------------------------------------------------
app.put('/api/categories/:category_id', async (req, res) => {
  try {
    const { category_id } = req.params;
    const { category_name, created_by } = req.body;

    if (!category_name || !created_by) {
      return res.status(400).json({
        success: false,
        message: 'Category Name and Created By (User ID) are required!'
      });
    }

    // category_id आणि created_by जुळल्यास नाव अपडेट करा
    const updatedCategory = await pool.query(
      'UPDATE categories SET category_name = $1 WHERE category_id = $2 AND created_by = $3 RETURNING category_id, category_name, created_by, created_at',
      [category_name, category_id, created_by]
    );

    // जर या ID ची कॅटेगरी सापडली नाही तर
    if (updatedCategory.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or unauthorized!'
      });
    }

    res.json({
      success: true,
      message: 'Category updated successfully!',
      category: updatedCategory.rows[0]
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ----------------------------------------------------
// 🗑️ DELETE CATEGORY API (शर्त: खर्चात वापरली असल्यास डिलीट होणार नाही)
// ----------------------------------------------------
// ----------------------------------------------------
// 🗑️ DELETE CATEGORY API (expense_item टेबल तपासून डिलीट करणे)
// ----------------------------------------------------
app.delete('/api/categories/:category_id', async (req, res) => {

    try {

        const { category_id } = req.params;

        console.log("DELETE CATEGORY ID:", category_id);


        // ==========================================
        // CHECK CATEGORY IS USED IN EXPENSE
        // ==========================================

        const expenseCheck = await pool.query(
            `
            SELECT
                item_id,
                expense_id,
                category_id
            FROM expense_items
            WHERE category_id = $1
            LIMIT 1
            `,
            [category_id]
        );


        console.log(
            "EXPENSE ITEMS FOUND:",
            expenseCheck.rows
        );


        // ==========================================
        // USED IN EXPENSE → DO NOT DELETE
        // ==========================================

        if (expenseCheck.rows.length > 0) {

            return res.status(400).json({

                success: false,

                message:
                    "This category is already used in an expense and cannot be deleted."

            });

        }


        // ==========================================
        // NOT USED → DELETE CATEGORY
        // ==========================================

        const result = await pool.query(
            `
            DELETE FROM categories
            WHERE category_id = $1
            RETURNING *
            `,
            [category_id]
        );


        // ==========================================
        // CATEGORY NOT FOUND
        // ==========================================

        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Category not found!"

            });

        }


        // ==========================================
        // SUCCESS
        // ==========================================

        return res.status(200).json({

            success: true,

            message:
                "Category deleted successfully!",

            deletedCategory:
                result.rows[0]

        });

    }


    catch (error) {

        console.error(
            "DELETE CATEGORY ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

});
// ----------------------------------------------------
// 💸 CREATE EXPENSE WITH ADD MORE ITEMS API
// ----------------------------------------------------
app.post('/api/expenses', async (req, res) => {

    const client = await pool.connect();

    try {

        const {
            expense_date,
            created_by,
            items
        } = req.body;


        // ==============================
        // VALIDATION
        // ==============================

        if (
            !expense_date ||
            !created_by ||
            !Array.isArray(items) ||
            items.length === 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'expense_date, created_by and at least one item are required!'
            });

        }


        // ==============================
        // DATE FIX
        // ==============================

        // Browser मधून आलेली date फक्त YYYY-MM-DD ठेवायची
        // कोणताही timezone conversion होणार नाही

        const expenseDate =
            String(expense_date).substring(0, 10);


        console.log(
            "Received Expense Date:",
            expense_date
        );

        console.log(
            "Saving Expense Date:",
            expenseDate
        );


        // ==============================
        // TOTAL AMOUNT
        // ==============================

        const total_amount = items.reduce(
            (sum, item) =>
                sum + Number(item.amount),
            0
        );


        // ==============================
        // BEGIN TRANSACTION
        // ==============================

        await client.query('BEGIN');


        // ==============================
        // INSERT EXPENSE
        // ==============================

        const expenseResult = await client.query(
            `
            INSERT INTO expenses
            (
                expense_date,
                total_amount,
                created_by
            )
            VALUES ($1, $2, $3)

            RETURNING
                expense_id,

                TO_CHAR(
                    expense_date,
                    'YYYY-MM-DD'
                ) AS expense_date,

                total_amount,
                created_by
            `,
            [
                expenseDate,
                total_amount,
                created_by
            ]
        );


        const newExpenseId =
            expenseResult.rows[0].expense_id;


        // ==============================
        // INSERT EXPENSE ITEMS
        // ==============================

        for (const item of items) {

            await client.query(
                `
                INSERT INTO expense_items
                (
                    expense_id,
                    category_id,
                    amount
                )
                VALUES ($1, $2, $3)
                `,
                [
                    newExpenseId,
                    Number(item.category_id),
                    Number(item.amount)
                ]
            );

        }


        // ==============================
        // COMMIT
        // ==============================

        await client.query('COMMIT');


        // ==============================
        // SUCCESS RESPONSE
        // ==============================

        res.status(201).json({

            success: true,

            message:
                'Expense and items saved successfully!',

            expense:
                expenseResult.rows[0],

            items_count:
                items.length

        });


    } catch (err) {


        // ==============================
        // ROLLBACK
        // ==============================

        await client.query('ROLLBACK');


        console.error(
            '========== EXPENSE SAVE ERROR =========='
        );

        console.error(
            'Message:',
            err.message
        );

        console.error(
            'Code:',
            err.code
        );

        console.error(
            'Detail:',
            err.detail
        );

        console.error(
            'Table:',
            err.table
        );

        console.error(
            'Column:',
            err.column
        );

        console.error(
            'Constraint:',
            err.constraint
        );

        console.error(
            '========================================'
        );


        res.status(500).json({

            success: false,

            message: err.message,

            code: err.code,

            detail:
                err.detail || null

        });


    } finally {

        client.release();

    }

});

// ----------------------------------------------------
// 📊 GET ALL EXPENSES WITH CATEGORIES API
// ----------------------------------------------------
// ----------------------------------------------------
// 📊 GET EXPENSES API (Date Filter & Limit 20 सह)
// ----------------------------------------------------
app.get('/api/expenses/:created_by', async (req, res) => {

    try {

        const { created_by } = req.params;
        const { date } = req.query;

        let query = `
            SELECT 
                e.expense_id,

                TO_CHAR(
                    e.expense_date,
                    'YYYY-MM-DD'
                ) AS expense_date,

                COALESCE(
                    SUM(ei.amount),
                    0
                ) AS total_amount,

                e.created_by,

                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'item_id', ei.item_id,
                        'category_id', ei.category_id,
                        'category_name', c.category_name,
                        'amount', ei.amount
                    )
                ) AS items

            FROM expenses e

            LEFT JOIN expense_items ei
                ON e.expense_id = ei.expense_id

            LEFT JOIN categories c
                ON ei.category_id = c.category_id

            WHERE e.created_by = $1
        `;

        const queryParams = [created_by];


        // ================================
        // DATE FILTER
        // ================================

        if (date) {

            queryParams.push(date);

            query += `
                AND e.expense_date = $2
            `;
        }


        // ================================
        // GROUP
        // ================================

        query += `
            GROUP BY
                e.expense_id,
                e.expense_date,
                e.created_by

            ORDER BY
                e.expense_date DESC,
                e.expense_id DESC
        `;


        // ================================
        // LATEST 20
        // ================================

        if (!date) {

            query += `
                LIMIT 20
            `;
        }


        const expensesList =
            await pool.query(
                query,
                queryParams
            );


        res.json({

            success: true,

            filter_applied:
                date
                    ? `Date: ${date}`
                    : 'All (Latest 20)',

            count:
                expensesList.rows.length,

            expenses:
                expensesList.rows

        });


    } catch (err) {

        console.error(
            "❌ Expense List Error:",
            err
        );

        res.status(500).json({

            success: false,

            message:
                'Server Error',

            error:
                err.message

        });

    }

});

// ----------------------------------------------------
// ✏️ UPDATE EXPENSE & ITEMS API (PUT)
// ----------------------------------------------------
app.put('/api/expenses/:expense_id', async (req, res) => {
  const client = await pool.connect(); // Transaction साठी client

  try {
    const { expense_id } = req.params;
    const { expense_date, created_by, items } = req.body;

    // Validation Check
    if (!expense_date || !created_by || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'expense_date, created_by, and at least one item are required!'
      });
    }

    // 🧮 १. पाठवलेल्या सर्व नवीन आयटम्सची बेरीज (Total Amount) करा
    const total_amount = items.reduce((sum, item) => sum + Number(item.amount), 0);

    // 🔄 Transaction सुरु करा
    await client.query('BEGIN');

    // 📑 २. मुख्य 'expenses' टेबलमधील तारीख आणि नवीन टोटल अपडेट करा
    const updateExpense = await client.query(
      `UPDATE expenses 
       SET expense_date = $1, total_amount = $2 
       WHERE expense_id = $3 AND created_by = $4 
       RETURNING expense_id, TO_CHAR(expense_date, 'YYYY-MM-DD') AS expense_date, total_amount, created_by`,
      [expense_date, total_amount, expense_id, created_by]
    );

    // जर expense_id सापडला नाही तर
    if (updateExpense.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Expense record not found or unauthorized!'
      });
    }

    // 🗑️ ३. या खर्चाचे जुने सर्व items आधी डिलीट करा
    await client.query(
      'DELETE FROM expense_items WHERE expense_id = $1',
      [expense_id]
    );

    // 📝 ४. नवीन अपडेट केलेले आयटम्स 'expense_items' मध्ये इंसर्ट करा
    for (let item of items) {
      await client.query(
        `INSERT INTO expense_items (expense_id, category_id, amount) 
         VALUES ($1, $2, $3)`,
        [expense_id, item.category_id, item.amount]
      );
    }

    // 🔐 Transaction कमिट करा
    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Expense updated successfully!',
      expense: updateExpense.rows[0],
      items_count: items.length
    });

  } catch (err) {
    await client.query('ROLLBACK'); // एरर आल्यास आधीसारखा डेटा ठेवा
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  } finally {
    client.release();
  }
});


// ----------------------------------------------------
// 🗑️ DELETE EXPENSE API (खर्च डिलीट करण्यासाठी)
// ----------------------------------------------------
app.delete('/api/expenses/:expense_id', async (req, res) => {
  try {
    const { expense_id } = req.params;
    const { created_by } = req.body;

    if (!created_by) {
      return res.status(400).json({
        success: false,
        message: 'created_by (User Email/ID) is required!'
      });
    }

    // 🗑️ मुख्य 'expenses' टेबलमधून खर्च डिलीट करा
    // (ON DELETE CASCADE मुळे expense_items मधील नोंदी आपोआप डिलीट होतील)
    const deleteExpense = await pool.query(
      `DELETE FROM expenses 
       WHERE expense_id = $1 AND created_by = $2 
       RETURNING expense_id, TO_CHAR(expense_date, 'YYYY-MM-DD') AS expense_date, total_amount`,
      [expense_id, created_by]
    );

    if (deleteExpense.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Expense record not found or unauthorized!'
      });
    }

    res.json({
      success: true,
      message: 'Expense deleted successfully!',
      deletedExpense: deleteExpense.rows[0]
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ====================================================
// 💰 INCOME MODULE (Add More Sources System)
// ====================================================

// ----------------------------------------------------
// 1️⃣ ADD INCOME WITH MULTIPLE SOURCES (POST)
// ----------------------------------------------------
// ====================================================
// 💰 INCOME MODULE (Table Name: 'income')
// ====================================================

// ----------------------------------------------------
// 1️⃣ ADD INCOME WITH MULTIPLE SOURCES (POST)
// ----------------------------------------------------
// ----------------------------------------------------
// 1️⃣ ADD INCOME (POST) - एकापेक्षा जास्त सोर्सेससह
// ----------------------------------------------------
// ----------------------------------------------------
// 1️⃣ ADD INCOME WITH ITEMS (POST)
// ----------------------------------------------------
app.post('/api/incomes', async (req, res) => {
  let client;

  try {
    const { income_date, created_by, items } = req.body;

    // Validation Check
    if (!income_date || !created_by || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'income_date, created_by, and items array are required!'
      });
    }

    // 🧮 १. सर्वांची बेरीज (total_amount) करा
    const total_amount = items.reduce((sum, item) => sum + Number(item.amount), 0);

    // 🔌 DB Connection घ्या
    client = await pool.connect();

    // 🔄 Transaction सुरू करा
    await client.query('BEGIN');

    // 📑 २. मुख्य 'income' टेबलमध्ये इंसर्ट करा
    const incomeResult = await client.query(
      `INSERT INTO income (income_date, total_amount, created_by) 
       VALUES ($1, $2, $3) 
       RETURNING income_id, TO_CHAR(income_date, 'YYYY-MM-DD') AS income_date, total_amount, created_by`,
      [income_date, total_amount, created_by]
    );

    const newIncomeId = incomeResult.rows[0].income_id;

    // 📝 ३. 'income_items' टेबलमध्ये प्रत्येक आयटम इंसर्ट करा
    for (let item of items) {
      await client.query(
        `INSERT INTO income_items (income_id, source, amount) 
         VALUES ($1, $2, $3)`,
        [newIncomeId, item.source, Number(item.amount)]
      );
    }

    // 🔐 Transaction कमिट करा
    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Income and items saved successfully!',
      income: incomeResult.rows[0],
      items_count: items.length
    });

  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error("❌ DB Error during Insert:", err.message);

    return res.status(500).json({
      success: false,
      error_details: err.message,
      hint: err.hint || 'Check foreign key (created_by must exist in users table)'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// ----------------------------------------------------
// 2️⃣ GET INCOME LIST (Date Select = That Date | No Date = Latest 20 Records)
// ----------------------------------------------------
app.get('/api/incomes/:created_by', async (req, res) => {
  try {
    const { created_by } = req.params;
    const { date } = req.query; // Optional Date Filter (?date=YYYY-MM-DD)

    let query = `
      SELECT 
        i.income_id,
        TO_CHAR(i.income_date, 'YYYY-MM-DD') AS income_date,
        i.total_amount,
        i.created_by,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'item_id', ii.item_id,
              'source', ii.source,
              'amount', ii.amount
            )
          ) FILTER (WHERE ii.item_id IS NOT NULL), '[]'
        ) AS items
      FROM income i
      LEFT JOIN income_items ii ON i.income_id = ii.income_id
      WHERE i.created_by = $1
    `;

    const queryParams = [created_by];

    // 🗓️ १. जर युझरने तारीख (date) निवडली असेल तर
    if (date) {
      queryParams.push(date);
      query += ` AND i.income_date = $2`;
    }

    query += ` GROUP BY i.income_id ORDER BY i.income_date DESC, i.income_id DESC`;

    // 🔢 २. जर तारीख निवडली नसेल, तरच शेवटचे २० रेकॉर्ड्स दाखवा (LIMIT 20)
    if (!date) {
      query += ` LIMIT 20`;
    }

    const incomesList = await pool.query(query, queryParams);

    return res.json({
      success: true,
      filter_applied: date ? `Date: ${date}` : 'All Incomes (Latest 20 Records)',
      count: incomesList.rows.length,
      incomes: incomesList.rows
    });

  } catch (err) {
    console.error("❌ Get Income Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 3️⃣ UPDATE INCOME & ITEMS (PUT API)
// ----------------------------------------------------
app.put('/api/incomes/:income_id', async (req, res) => {
  const { income_id } = req.params;
  const { income_date, items } = req.body;
  let client;

  try {
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Items array is required!' });
    }

    // १. नवीन टोटल अमाऊंट कॅल्क्युलेट करा
    const total_amount = items.reduce((sum, item) => sum + Number(item.amount), 0);

    client = await pool.connect();
    await client.query('BEGIN');

    // २. मुख्य 'income' टेबल अपडेट करा
    await client.query(
      `UPDATE income SET income_date = $1, total_amount = $2 WHERE income_id = $3`,
      [income_date, total_amount, income_id]
    );

    // ३. जुने सगळे आइटम्स डिलीट करा (जेणेकरून नवीन व्यवस्थित इन्सर्ट होतील)
    await client.query(`DELETE FROM income_items WHERE income_id = $1`, [income_id]);

    // ४. नवीन आइटम्स इन्सर्ट करा
    for (let item of items) {
      await client.query(
        `INSERT INTO income_items (income_id, source, amount) VALUES ($1, $2, $3)`,
        [income_id, item.source, Number(item.amount)]
      );
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Income updated successfully!',
      updated_total: total_amount
    });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error("❌ Update Income Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (client) client.release();
  }
});

// ----------------------------------------------------
// 4️⃣ DELETE INCOME (DELETE API)
// ----------------------------------------------------
app.delete('/api/incomes/:income_id', async (req, res) => {
  const { income_id } = req.params;
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN'); // व्यवहार (Transaction) सुरू

    // १. आधी संबंधित सर्व income_items डिलीट करा
    await client.query(`DELETE FROM income_items WHERE income_id = $1`, [income_id]);

    // २. मग मुख्य income टेबलमधून रेकॉर्ड डिलीट करा
    const result = await client.query(`DELETE FROM income WHERE income_id = $1`, [income_id]);

    // जर रेकॉर्ड सापडलाच नाही तर
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Income record not found!' });
    }

    await client.query('COMMIT'); // दोन्ही डिलीट झाले तरच कमिट करा

    return res.json({
      success: true,
      message: `Income record (ID: ${income_id}) deleted successfully!`
    });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error("❌ Delete Income Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (client) client.release();
  }
});


// ----------------------------------------------------
// 📊 DASHBOARD SUMMARY API (Income, Expense, Profit & Date Filters)
// ----------------------------------------------------
// ----------------------------------------------------
// 📊 DASHBOARD SUMMARY API (Income, Expenses, Profit & Date Filters)
// ----------------------------------------------------
// =====================================================
// DASHBOARD SUMMARY API
// =====================================================

app.get('/api/dashboard/summary/:created_by', async (req, res) => {

    try {

        const { created_by } = req.params;

        const { filter, date } = req.query;


        // =====================================================
        // DATE CONDITIONS
        // =====================================================

        let incomeCondition = "";
        let expenseCondition = "";

        let queryParams = [created_by];


        // =====================================================
        // 1. SPECIFIC DATE SELECTED
        // =====================================================

        if (date) {

            incomeCondition =
                `AND i.income_date::date = $2::date`;

            expenseCondition =
                `AND e.expense_date::date = $2::date`;

            queryParams.push(date);

        }


        // =====================================================
        // 2. ONE DAY
        // =====================================================

        else if (filter === "day") {

            incomeCondition =
                `AND i.income_date::date = CURRENT_DATE`;

            expenseCondition =
                `AND e.expense_date::date = CURRENT_DATE`;

        }


        // =====================================================
        // 3. ONE WEEK
        // =====================================================

        else if (filter === "week") {

            incomeCondition =
                `AND i.income_date::date
                 BETWEEN CURRENT_DATE - INTERVAL '6 days'
                 AND CURRENT_DATE`;

            expenseCondition =
                `AND e.expense_date::date
                 BETWEEN CURRENT_DATE - INTERVAL '6 days'
                 AND CURRENT_DATE`;

        }


        // =====================================================
        // 4. ONE MONTH
        // =====================================================

        else if (filter === "month") {

            incomeCondition =
                `AND i.income_date::date
                 BETWEEN CURRENT_DATE - INTERVAL '1 month'
                 AND CURRENT_DATE`;

            expenseCondition =
                `AND e.expense_date::date
                 BETWEEN CURRENT_DATE - INTERVAL '1 month'
                 AND CURRENT_DATE`;

        }


        // =====================================================
        // 5. ONE YEAR
        // =====================================================

        else if (filter === "year") {

            incomeCondition =
                `AND i.income_date::date
                 BETWEEN CURRENT_DATE - INTERVAL '1 year'
                 AND CURRENT_DATE`;

            expenseCondition =
                `AND e.expense_date::date
                 BETWEEN CURRENT_DATE - INTERVAL '1 year'
                 AND CURRENT_DATE`;

        }


        // =====================================================
        // 6. NOTHING SELECTED
        //    DEFAULT = PREVIOUS DAY
        // =====================================================

        else {

            incomeCondition =
                `AND i.income_date::date =
                 CURRENT_DATE - INTERVAL '1 day'`;

            expenseCondition =
                `AND e.expense_date::date =
                 CURRENT_DATE - INTERVAL '1 day'`;

        }


        // =====================================================
        // INCOME QUERY
        // =====================================================

        const incomeQuery = `

            SELECT
                COALESCE(
                    SUM(i.total_amount),
                    0
                ) AS total_income

            FROM income i

            WHERE i.created_by = $1

            ${incomeCondition}

        `;


        // =====================================================
        // EXPENSE QUERY
        // =====================================================

        const expenseQuery = `

            SELECT
                COALESCE(
                    SUM(e.total_amount),
                    0
                ) AS total_expense

            FROM expenses e

            WHERE e.created_by = $1

            ${expenseCondition}

        `;


        // =====================================================
        // EXECUTE QUERIES
        // =====================================================

        const incomeResult =
            await pool.query(
                incomeQuery,
                queryParams
            );


        const expenseResult =
            await pool.query(
                expenseQuery,
                queryParams
            );


        // =====================================================
        // CALCULATE VALUES
        // =====================================================

        const totalIncome =
            Number(
                incomeResult.rows[0].total_income
            );


        const totalExpense =
            Number(
                expenseResult.rows[0].total_expense
            );


        const profit =
            totalIncome -
            totalExpense;


        // =====================================================
        // RESPONSE
        // =====================================================

        res.json({

            success: true,

            applied_filter:
                date
                    ? `Selected Date: ${date}`
                    : filter
                        ? `Filter: ${filter}`
                        : "Previous Day",

            summary: {

                total_income:
                    totalIncome,

                total_expense:
                    totalExpense,

                net_profit:
                    profit

            }

        });


    } catch (err) {

        console.error(
            "❌ Dashboard Summary Error:",
            err
        );


        res.status(500).json({

            success: false,

            error:
                err.message

        });

    }

});
// ----------------------------------------------------
// 🚀 सर्व्हर चालू करा
// ----------------------------------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
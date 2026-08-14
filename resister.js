document
    .getElementById("registerForm")
    .addEventListener("submit", async function (event) {

        event.preventDefault();


        // ==============================
        // GET USER ID
        // ==============================

        const userId =
            document
                .getElementById("registerUserId")
                .value
                .trim();


        // ==============================
        // GET PASSWORD
        // ==============================

        const password =
            document
                .getElementById("registerPassword")
                .value;


        console.log("REGISTER USER ID:", userId);
        console.log("REGISTER PASSWORD:", password);


        // ==============================
        // VALIDATION
        // ==============================

        if (!userId || !password) {

            alert(
                "Please enter User ID and Password"
            );

            return;

        }


        try {

            console.log(
                "Sending registration request..."
            );


            // ==============================
            // REGISTER API
            // ==============================

            const response =
                await fetch(
                    "http://localhost:5000/api/register",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                user_id:
                                    userId,

                                password:
                                    password

                            })

                    }
                );


            // ==============================
            // SERVER RESPONSE
            // ==============================

            const data =
                await response.json();


            console.log(
                "REGISTER RESPONSE:",
                data
            );


            // ==============================
            // ERROR
            // ==============================

            if (
                !response.ok ||
                !data.success
            ) {

                alert(
                    data.message ||
                    "Registration failed"
                );

                return;

            }


            // ==============================
            // SUCCESS
            // ==============================

            alert(
                "Registration successful! Please login."
            );


            // ==============================
            // GO TO LOGIN PAGE
            // ==============================

            window.location.href =
                "./login.html";


        } catch (error) {

            console.error(
                "REGISTER ERROR:",
                error
            );


            alert(
                "Server connection failed. Please try again."
            );

        }

    });
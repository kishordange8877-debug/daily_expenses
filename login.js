const loginForm =
    document.getElementById("loginForm");

const loginBtn =
    document.getElementById("loginBtn");


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            // ==============================
            // GET USER ID
            // ==============================

            const userId =
                document
                    .getElementById("userId")
                    .value
                    .trim();


            // ==============================
            // GET PASSWORD
            // ==============================

            const password =
                document
                    .getElementById("password")
                    .value;


            // ==============================
            // VALIDATION
            // ==============================

            if (!userId) {

                alert("Please enter User ID.");

                document
                    .getElementById("userId")
                    .focus();

                return;

            }


            if (!password) {

                alert("Please enter password.");

                document
                    .getElementById("password")
                    .focus();

                return;

            }


            // ==============================
            // BUTTON LOADING
            // ==============================

            if (loginBtn) {

                loginBtn.disabled = true;

                loginBtn.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Logging in...
                `;

            }


            try {

                // ==============================
                // LOGIN API
                // ==============================

                const response =
                    await fetch(
                        "http://localhost:5000/api/login",
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
                // RESPONSE
                // ==============================

                const data =
                    await response.json();


                console.log(
                    "LOGIN RESPONSE:",
                    data
                );


                // ==============================
                // LOGIN ERROR
                // ==============================

                if (
                    !response.ok ||
                    !data.success
                ) {

                    alert(
                        data.message ||
                        "Invalid User ID or Password."
                    );

                    return;

                }


                // ==============================
                // GET USER ID
                // ==============================

                const loggedInUserId =
                    data.user.user_id;


                console.log(
                    "LOGGED IN USER ID:",
                    loggedInUserId
                );


                // ==============================
                // SAVE USER ID
                // ==============================

                localStorage.setItem(
                    "loggedInUser",
                    String(loggedInUserId)
                );


                console.log(
                    "SAVED USER ID:",
                    localStorage.getItem(
                        "loggedInUser"
                    )
                );


                // ==============================
                // SUCCESS
                // ==============================

                alert(
                    "Login successful!"
                );


                // ==============================
                // OPEN APPLICATION
                // ==============================

                window.location.href =
                    "./index.html";

            }


            catch (error) {

                console.error(
                    "LOGIN ERROR:",
                    error
                );

                alert(
                    "Server connection failed. Make sure your backend is running on port 5000."
                );

            }


            finally {

                if (loginBtn) {

                    loginBtn.disabled = false;

                    loginBtn.innerHTML = `
                        <i class="fa-solid fa-right-to-bracket"></i>
                        Login
                    `;

                }

            }

        }
    );

}
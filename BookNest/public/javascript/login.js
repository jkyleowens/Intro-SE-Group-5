
const emailFormat = /^[a-zA-Z0-9(%-.)?]@[a-zA-Z0-9]+\.[a-zA-Z]+([.][a-zA-Z])?$/;; //regex for email format

// content loaded, setup event listeneres
document.addEventListener('DOMContentLoaded', (event) => {

    const login_form = document.getElementById('login-form');
    login_form.addEventListener('submit', SendLogin);
});

// login form submitted
async function SendLogin(event)
{

    try {

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value

        // prevent default submit action
        event.preventDefault();

        //validate input
        if (!email || !password) throw 'email and password must be filled'; // field empty
        if (emailFormat.test(email)) throw 'the email you entered is not in a valid format'; // invalid format

        const details = JSON.stringify({ email:email, password:password });

        // post ---> /api/login ---> UserRouter
        const res = await fetch('/api/login', {

            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: details // send string with details
        });

        // unsuccessful
        if (!res.ok) {
            throw res.statusText;
        }

        return;

    } catch (err) {
        throw new Error(err);
    }
}

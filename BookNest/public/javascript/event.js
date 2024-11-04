const emailFormat = /^(\w)+([.-]?\w)*@(\w)+[.](\w)+([.]\w)?$/; //regex for email format



document.addEventListener('DOMContentLoaded', (event) => {
    const register_form = document.getElementById('register-form');
    register_form.addEventListener('submit', SendRegister);

    const login_form = document.getElementById('login-form');
    login_form.addEventListener('submit', SendLogin);
});
// register form submitted


async function SendRegister(event)
{
    // can't submit default form
    event.preventDefault();

    try {
        const name = document.getElementById('name').textContent;
        const email = document.getElementById('email').textContent;
        const password = document.getElementById('password').textContent;

        // validate input before sending
        if (this.userID != null) throw 'you are already logged in'; // user logged in
            
        if (!email || !password) throw 'email and password must be filled'; // field empty
        if (!emailFormat.test(email)) throw 'the email you entered is not in a valid format'; // invalid format

        const details = JSON.stringify({ name: name, email: email, password: password });

        // post ---> /api/login ---> UserRouter
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: details
        });

        // unsuccessful
        if (!res.ok) {
            const err = await res.json();
            throw err.message;
        }

        return;
        
    } catch (err) {
        throw new Error('registering new user failed: ' + err);
    }
}


// login form submitted
async function SendLogin(event)
{

    try {
        // can't submit default form
        event.preventDefault();

        const email = document.getElementById('email').textContent;
        const password = document.getElementById('password').textContent;

        //validate input
        if (this.userID != null) throw 'you are already logged in'; // user logged in

        if (!email || !password) throw 'email and password must be filled'; // field empty
        if (!this.emailFormat.test(email)) throw 'the email you entered is not in a valid format'; // invalid format

        // post ---> /api/login ---> UserRouter
        const res = await fetch('/api/login', {

            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email:email, password:password }) // send string with details
        });

        // unsuccessful
        if (!res.ok) {
            const err = await res.json();
            throw err.message;
        }

        return;

    } catch (err) {
        throw new Error(err);
    }
}

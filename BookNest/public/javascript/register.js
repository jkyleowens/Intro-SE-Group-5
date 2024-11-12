

const emailFormat = /^[a-zA-Z0-9(%-.)?]@[a-zA-Z0-9]+\.[a-zA-Z]+([.][a-zA-Z])?$/;; //regex for email format

// content loaded, setup event listeneres
document.addEventListener('DOMContentLoaded', (event) => {

    const register_form = document.getElementById('register-form');
    register_form.addEventListener('submit', SendRegister);
});


// register form submitted, validate input and send request to backend
async function SendRegister (event) 
{
    try {
        // get form data
        const form = event.target;
        const formData = new FormData(form);

        const username = formData.get('username').trim();
        const email = formData.get('email').trim();
        const password = formData.get('password').trim();

        //prevent submit default action
        event.preventDefault();

        // validate input before sending
        if ( !username || !email || !password ) throw 'form must be completely filled'; // field empty
        if (emailFormat.test(email)) throw 'the email you entered is not in a valid format'; // invalid email format

        const toSend = JSON.stringify({ name: username, email: email, password: password });

        // post ---> /api/register ---> UserRouter.RegisterUser
        const response = await fetch('/api/register', {

            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: toSend

        });

        if (!response.ok) throw 'server responded with error';

        const result = response.json();
        if (!result.success) throw result.message;

        window.location.href = '/login';

    } catch (err) {
        console.error('Submitting registration failed: ' + err);
        window.location.href = '/register';
        throw new Error(err);
    }

}




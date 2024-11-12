
const emailFormat = /^[a-zA-Z0-9]+[(.-_%)?a-zA-Z0-9]+@[a-zA-Z0-9]+\.[a-zA-Z]{2,3}[(.)?a-zA-Z]{0,2}$/; //regex for email format

// content loaded, setup event listeneres
document.addEventListener('DOMContentLoaded', (event) => {

    const login_form = document.getElementById('login-form');
    login_form.addEventListener('submit', SendLogin);
});

// login form submitted
async function SendLogin(event)
{

    try {
        // prevent default submit action
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);
        

        const email = formData.get('email');
        const password = formData.get('password');
        const dataObject = new Object({email:email, password:password});
        const toSend = JSON.stringify(dataObject);

        //validate input
        if (!emailFormat.test(dataObject.email)) throw 'the email you entered is not in a valid format'; // invalid format

        const details = JSON.stringify({ email: email, password: password });

        // post ---> /api/login ---> UserRouter
        const response = await fetch('/api/login', {

            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: details // send form data to backend
        });

        if (!response.ok) {
            throw `request failed with status: ${response.status}`;
        }

        const result = await response.json();

        // unsuccessful
        if (!result.success) window.location.href = '/login';
        else window.location.href = '/';

    } catch (err) {
        console.error(err);
        throw new Error(err);
    }
}

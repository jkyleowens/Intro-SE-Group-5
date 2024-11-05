

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
        
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        //prevent submit default action
        event.preventDefault();


        // validate input before sending
        if ( !username || !email || !password ) throw 'form must be completely filled'; // field empty

        if (emailFormat.test(email)) throw 'the email you entered is not in a valid format'; // invalid email format

        // create json string to send to backend (may want to encrypt before sending)
        const details = JSON.stringify({ name: username, email: email, password: password });

        // post ---> /api/register ---> UserRouter.RegisterUser
        const res = await fetch('/api/register', {

            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: details // send json string with input details
        });

        if (!res.ok) throw 'server responded with error';

        return;

    } catch (err) {
        console.error('Submitting registration failed: ' + err);
        throw new Error(err);
    }

}




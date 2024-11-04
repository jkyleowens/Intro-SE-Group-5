/* 
    Frontend class for tracking and verifying user data

    Linked in: * login.ejs, * register.ejs

    Description: sets event listeners for submitted forms, validates input, and signals the backend to process data.
    keeps track of client's 
*/

class UserClient
{

    constructor()
    {
        // populated with session info
        this.userID = null;
        this.name = null;

        // holds cart orderID and objects of { item, quantity } 
        this.cart = { orderID: null, items: [] };

        this.emailFormat = /^(\w)+([.-]?\w)*@(\w)+[.](\w)+([.]\w)?$/;  // email format regex

        
    }
    
    /* 
        frontend logic to check input
        success: return userID, failure: return error msg
    */ 
    async checkLogin(email, password) // called upon login form submission
    {
        
        try {

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
                return err.message;
            }

            // successful
            const { userID, name, cart } =  await res.json(); // store results
            this.userID = userID;
            this.name = name;
            this.cart = cart;

            return userID;

        } catch (err) {
            throw err;
        }
    }

    //frontend validation for registering user
    async RegisterUser(username, email, password)
    {

        // send register request
        try {

            // validate input before sending
            if (this.userID != null) throw 'you are already logged in'; // user logged in
        
            if (!email || !password) throw 'email and password must be filled'; // field empty
            if (!this.emailFormat.test(email)) throw 'the email you entered is not in a valid format'; // invalid format


            // post ---> /api/login ---> UserRouter
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: username, email:email, password:password })
            });

            // unsuccessful
            if (!res.ok) {
                const err = await res.json();
                throw err.message;
            }

            // successful
            const obj = await res.json(); // store results
            this.userID = obj.userID;

            return this.userID;

        } catch (err) {
            throw err;
        }

    }
}

export default UserClient;